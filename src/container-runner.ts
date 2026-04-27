/**
 * Container Runner v2
 * Spawns agent containers with session folder + agent group folder mounts.
 * The container runs the v2 agent-runner which polls the session DB.
 */
import { ChildProcess, execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

import os from 'os';

import { OneCLI } from '@onecli-sh/sdk';

import {
  CONTAINER_IMAGE,
  CONTAINER_IMAGE_BASE,
  CONTAINER_INSTALL_LABEL,
  DATA_DIR,
  GROUPS_DIR,
  ONECLI_API_KEY,
  ONECLI_URL,
  TIMEZONE,
} from './config.js';
import { readEnvFile } from './env.js';

function resolveBunPath(): string {
  const fromEnv = process.env.BUN_INSTALL;
  if (fromEnv) {
    const p = path.join(fromEnv, 'bin', 'bun');
    if (fs.existsSync(p)) return p;
  }
  const homeBun = path.join(os.homedir(), '.bun', 'bin', 'bun');
  if (fs.existsSync(homeBun)) return homeBun;
  return 'bun';
}
import { readContainerConfig, writeContainerConfig } from './container-config.js';
import { CONTAINER_RUNTIME_BIN, hostGatewayArgs, readonlyMountArgs, stopContainer } from './container-runtime.js';
import { composeGroupClaudeMd } from './claude-md-compose.js';
import { generateMemoryFragment, generateWikiContext } from './modules/memory/index.js';
import { loadModels, buildLocalWorkerConfig } from './modules/local-worker/index.js';
import { getAgentGroup } from './db/agent-groups.js';
import { getDb, hasTable } from './db/connection.js';
import { initGroupFilesystem } from './group-init.js';
import { stopTypingRefresh } from './modules/typing/index.js';
import { log } from './log.js';
import { validateAdditionalMounts } from './modules/mount-security/index.js';
// Provider host-side config barrel — each provider that needs host-side
// container setup self-registers on import.
import './providers/index.js';
import {
  getProviderContainerConfig,
  type ProviderContainerContribution,
  type VolumeMount,
} from './providers/provider-container-registry.js';
import {
  heartbeatPath,
  markContainerRunning,
  markContainerStopped,
  openOutboundDb,
  outboundDbPath,
  sessionDir,
  writeSessionRouting,
} from './session-manager.js';
import type { AgentGroup, Session } from './types.js';

const onecli = new OneCLI({ url: ONECLI_URL, apiKey: ONECLI_API_KEY });

/** Active containers tracked by session ID. */
const activeContainers = new Map<
  string,
  { process: ChildProcess; containerName: string; mode: 'host' | 'container' }
>();

/**
 * In-flight wake promises, keyed by session id. Deduplicates concurrent
 * `wakeContainer` calls while the first spawn is still mid-setup (async
 * buildContainerArgs, OneCLI gateway apply, etc.) — otherwise a second
 * wake in that window passes the `activeContainers.has` check and spawns
 * a duplicate container against the same session directory, producing
 * racy double-replies.
 */
const wakePromises = new Map<string, Promise<void>>();

export function getActiveContainerCount(): number {
  return activeContainers.size;
}

export function isContainerRunning(sessionId: string): boolean {
  return activeContainers.has(sessionId);
}

/**
 * Wake up a container for a session. If already running or mid-spawn, no-op
 * (the in-flight wake promise is reused).
 *
 * The container runs the v2 agent-runner which polls the session DB.
 */
export function wakeContainer(session: Session): Promise<void> {
  if (activeContainers.has(session.id)) {
    log.debug('Container already running', { sessionId: session.id });
    return Promise.resolve();
  }
  const existing = wakePromises.get(session.id);
  if (existing) {
    log.debug('Container wake already in-flight — joining existing promise', { sessionId: session.id });
    return existing;
  }
  const promise = doWake(session).finally(() => {
    wakePromises.delete(session.id);
  });
  wakePromises.set(session.id, promise);
  return promise;
}

async function doWake(session: Session): Promise<void> {
  const agentGroup = getAgentGroup(session.agent_group_id);
  if (!agentGroup) {
    log.error('Agent group not found', { agentGroupId: session.agent_group_id });
    return;
  }
  const containerConfig = readContainerConfig(agentGroup.folder);
  const provider = resolveProviderName(session.agent_provider, agentGroup.agent_provider, containerConfig.provider);

  if (provider === 'host') {
    await spawnHostRunner(session, agentGroup, containerConfig);
  } else {
    await spawnContainer(session, agentGroup, containerConfig);
  }
}

async function spawnContainer(
  session: Session,
  agentGroup: AgentGroup,
  containerConfig: import('./container-config.js').ContainerConfig,
): Promise<void> {
  // Refresh the destination map and default reply routing so any admin
  // changes take effect on wake. Destinations come from the agent-to-agent
  // module — skip when the module isn't installed (table absent).
  if (hasTable(getDb(), 'agent_destinations')) {
    const { writeDestinations } = await import('./modules/agent-to-agent/write-destinations.js');
    writeDestinations(agentGroup.id, session.id);
  }
  writeSessionRouting(agentGroup.id, session.id);

  // Ensure container.json has the agent group identity fields the runner needs.
  // Written at spawn time so the runner can read them from the RO mount.
  ensureRuntimeFields(containerConfig, agentGroup);

  const models = loadModels(path.resolve(GROUPS_DIR, agentGroup.folder));
  if (models.length > 0) {
    containerConfig.localWorker = buildLocalWorkerConfig(models);
    writeContainerConfig(agentGroup.folder, containerConfig);
  }

  // Resolve the effective provider + any host-side contribution it declares
  // (extra mounts, env passthrough). Computed once and threaded through both
  // buildMounts and buildContainerArgs so side effects (mkdir, etc.) fire once.
  const { provider, contribution } = resolveProviderContribution(session, agentGroup, containerConfig);

  const mounts = buildMounts(agentGroup, session, containerConfig, contribution);
  const containerName = `nanoclaw-v2-${agentGroup.folder}-${Date.now()}`;
  // OneCLI agent identifier is always the agent group id — stable across
  // sessions and reversible via getAgentGroup() for approval routing.
  const agentIdentifier = agentGroup.id;
  const args = await buildContainerArgs(
    mounts,
    containerName,
    agentGroup,
    containerConfig,
    provider,
    contribution,
    agentIdentifier,
  );

  log.info('Spawning container', { sessionId: session.id, agentGroup: agentGroup.name, containerName });

  // Clear any orphan heartbeat from a previous container instance — the
  // sweep's ceiling check treats a missing file as "fresh spawn, give grace"
  // (host-sweep.ts line 87). Without this, the stale mtime can trigger an
  // immediate kill before the new container touches the file itself.
  fs.rmSync(heartbeatPath(agentGroup.id, session.id), { force: true });

  const container = spawn(CONTAINER_RUNTIME_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  activeContainers.set(session.id, { process: container, containerName, mode: 'container' });
  markContainerRunning(session.id);

  // Log stderr
  container.stderr?.on('data', (data) => {
    for (const line of data.toString().trim().split('\n')) {
      if (line) log.debug(line, { container: agentGroup.folder });
    }
  });

  // stdout is unused in v2 (all IO is via session DB)
  container.stdout?.on('data', () => {});

  // No host-side idle timeout. Stale/stuck detection is driven by the host
  // sweep reading heartbeat mtime + processing_ack claim age + container_state
  // (see src/host-sweep.ts). This avoids killing long-running legitimate work
  // on a wall-clock timer.

  container.on('close', (code) => {
    activeContainers.delete(session.id);
    markContainerStopped(session.id);
    stopTypingRefresh(session.id);
    log.info('Container exited', { sessionId: session.id, code, containerName });
  });

  container.on('error', (err) => {
    activeContainers.delete(session.id);
    markContainerStopped(session.id);
    stopTypingRefresh(session.id);
    log.error('Container spawn error', { sessionId: session.id, err });
  });
}

/** Kill a container for a session. */
export function killContainer(sessionId: string, reason: string): void {
  const entry = activeContainers.get(sessionId);
  if (!entry) return;

  log.info('Killing container', { sessionId, reason, containerName: entry.containerName, mode: entry.mode });
  if (entry.mode === 'host') {
    entry.process.kill('SIGTERM');
  } else {
    try {
      stopContainer(entry.containerName);
    } catch {
      entry.process.kill('SIGKILL');
    }
  }
}

/**
 * Build the env var record for a host-mode agent-runner process.
 * Pure — testable without filesystem or DB.
 */
export function buildHostRunnerEnv(args: {
  sessionDir: string;
  agentDir: string;
  timezone: string;
  extraEnv?: Record<string, string>;
}): Record<string, string> {
  const base = { ...(process.env as Record<string, string>) };
  if (args.extraEnv) {
    Object.assign(base, args.extraEnv);
  }
  base.NANOCLAW_SESSION_DIR = args.sessionDir;
  base.NANOCLAW_AGENT_DIR = args.agentDir;
  base.TZ = args.timezone;
  return base;
}

function memoryMtime(memoryPath: string): number {
  try {
    return fs.statSync(memoryPath).mtimeMs;
  } catch {
    return 0;
  }
}

function checkMemoryWrites(
  memoryPath: string,
  mtimeBefore: number,
  agentGroupId: string,
  sessionId: string,
  groupName: string,
): void {
  const mtimeAfter = memoryMtime(memoryPath);
  if (mtimeAfter !== mtimeBefore) return;

  try {
    if (!fs.existsSync(outboundDbPath(agentGroupId, sessionId))) return;
    const db = openOutboundDb(agentGroupId, sessionId);
    try {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM messages_out').get() as { cnt: number } | undefined;
      const turnCount = row?.cnt ?? 0;
      if (turnCount > 10) {
        log.warn('Host session had no MEMORY.md writes', { group: groupName, turns: turnCount });
      }
    } finally {
      db.close();
    }
  } catch {
    // best-effort — don't fail the close handler
  }
}

async function spawnHostRunner(
  session: Session,
  agentGroup: AgentGroup,
  containerConfig: import('./container-config.js').ContainerConfig,
): Promise<void> {
  if (hasTable(getDb(), 'agent_destinations')) {
    const { writeDestinations } = await import('./modules/agent-to-agent/write-destinations.js');
    writeDestinations(agentGroup.id, session.id);
  }
  writeSessionRouting(agentGroup.id, session.id);
  ensureRuntimeFields(containerConfig, agentGroup);

  const projectRoot = process.cwd();
  const groupDir = path.resolve(GROUPS_DIR, agentGroup.folder);

  initGroupFilesystem(agentGroup);

  const claudeDir = path.join(DATA_DIR, 'v2-sessions', agentGroup.id, '.claude-shared');
  const hostSkillsBase = path.join(projectRoot, 'container', 'skills');
  syncSkillSymlinks(claudeDir, containerConfig, hostSkillsBase);
  composeGroupClaudeMd(agentGroup);

  try {
    generateMemoryFragment(groupDir);
  } catch (err) {
    log.warn('Memory fragment generation failed', { group: agentGroup.name, err });
  }

  try {
    generateWikiContext(groupDir);
  } catch (err) {
    log.warn('Wiki context generation failed', { group: agentGroup.name, err });
  }

  const models = loadModels(groupDir);
  const newLocalWorker = models.length > 0 ? buildLocalWorkerConfig(models) : undefined;
  if (containerConfig.localWorker !== newLocalWorker) {
    containerConfig.localWorker = newLocalWorker;
    writeContainerConfig(agentGroup.folder, containerConfig);
  }

  const sessDir = sessionDir(agentGroup.id, session.id);
  const runnerEntry = path.join(projectRoot, 'container', 'agent-runner', 'src', 'index.ts');
  const runnerName = `host-${agentGroup.folder}-${Date.now()}`;

  const runnerEnvFromDotenv = readEnvFile([
    'SEARXNG_URL',
    'WHISPER_URL',
    'NANOCLAW_LLAMA_URL',
  ]);
  const env = buildHostRunnerEnv({
    sessionDir: sessDir,
    agentDir: groupDir,
    timezone: TIMEZONE,
    extraEnv: runnerEnvFromDotenv,
  });

  log.info('Spawning host-mode runner', { sessionId: session.id, agentGroup: agentGroup.name, runnerName });

  fs.rmSync(heartbeatPath(agentGroup.id, session.id), { force: true });

  const memoryMdPath = path.join(groupDir, 'memory', 'MEMORY.md');
  const memoryMtimeBefore = memoryMtime(memoryMdPath);

  const bunBin = resolveBunPath();
  const child = spawn(bunBin, ['run', runnerEntry], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
    cwd: groupDir,
  });

  activeContainers.set(session.id, { process: child, containerName: runnerName, mode: 'host' });
  markContainerRunning(session.id);

  child.stderr?.on('data', (data) => {
    for (const line of data.toString().trim().split('\n')) {
      if (line) log.debug(line, { runner: agentGroup.folder });
    }
  });

  child.stdout?.on('data', () => {});

  child.on('close', (code) => {
    activeContainers.delete(session.id);
    markContainerStopped(session.id);
    stopTypingRefresh(session.id);
    checkMemoryWrites(memoryMdPath, memoryMtimeBefore, agentGroup.id, session.id, agentGroup.name);
    log.info('Host runner exited', { sessionId: session.id, code, runnerName });
  });

  child.on('error', (err) => {
    activeContainers.delete(session.id);
    markContainerStopped(session.id);
    stopTypingRefresh(session.id);
    log.error('Host runner spawn error', { sessionId: session.id, err });
  });
}

/**
 * Resolve the provider name for a session using the precedence documented in
 * the provider-install skills:
 *
 *   sessions.agent_provider
 *     → agent_groups.agent_provider
 *     → container.json `provider`
 *     → 'claude'
 *
 * Pure so the precedence can be unit-tested without a DB or filesystem.
 */
export function resolveProviderName(
  sessionProvider: string | null | undefined,
  agentGroupProvider: string | null | undefined,
  containerConfigProvider: string | null | undefined,
): string {
  return (sessionProvider || agentGroupProvider || containerConfigProvider || 'claude').toLowerCase();
}

function resolveProviderContribution(
  session: Session,
  agentGroup: AgentGroup,
  containerConfig: import('./container-config.js').ContainerConfig,
): { provider: string; contribution: ProviderContainerContribution } {
  const provider = resolveProviderName(session.agent_provider, agentGroup.agent_provider, containerConfig.provider);
  const fn = getProviderContainerConfig(provider);
  const contribution = fn
    ? fn({
        sessionDir: sessionDir(agentGroup.id, session.id),
        agentGroupId: agentGroup.id,
        hostEnv: process.env,
      })
    : {};
  return { provider, contribution };
}

function buildMounts(
  agentGroup: AgentGroup,
  session: Session,
  containerConfig: import('./container-config.js').ContainerConfig,
  providerContribution: ProviderContainerContribution,
): VolumeMount[] {
  const projectRoot = process.cwd();

  // Per-group filesystem state lives forever after first creation. Init is
  // idempotent: it only writes paths that don't already exist, so this call
  // is a no-op for groups that have spawned before.
  initGroupFilesystem(agentGroup);

  // Sync skill symlinks based on container.json selection before mounting.
  const claudeDir = path.join(DATA_DIR, 'v2-sessions', agentGroup.id, '.claude-shared');
  syncSkillSymlinks(claudeDir, containerConfig);

  // Compose CLAUDE.md fresh every spawn from the shared base, enabled skill
  // fragments, and MCP server instructions. See `claude-md-compose.ts`.
  composeGroupClaudeMd(agentGroup);

  const mounts: VolumeMount[] = [];
  const sessDir = sessionDir(agentGroup.id, session.id);
  const groupDir = path.resolve(GROUPS_DIR, agentGroup.folder);

  try {
    generateMemoryFragment(groupDir);
  } catch (err) {
    log.warn('Memory fragment generation failed', { group: agentGroup.name, err });
  }

  try {
    generateWikiContext(groupDir);
  } catch (err) {
    log.warn('Wiki context generation failed', { group: agentGroup.name, err });
  }

  // Session folder at /workspace (contains inbound.db, outbound.db, outbox/, .claude/)
  mounts.push({ hostPath: sessDir, containerPath: '/workspace', readonly: false });

  // Agent group folder at /workspace/agent (RW for working files + CLAUDE.local.md)
  mounts.push({ hostPath: groupDir, containerPath: '/workspace/agent', readonly: false });

  // container.json — nested RO mount on top of RW group dir so the agent
  // can read its config but cannot modify it.
  const containerJsonPath = path.join(groupDir, 'container.json');
  if (fs.existsSync(containerJsonPath)) {
    mounts.push({ hostPath: containerJsonPath, containerPath: '/workspace/agent/container.json', readonly: true });
  }

  // Composer-managed CLAUDE.md artifacts — nested RO mounts. These are
  // regenerated from the shared base + fragments on every spawn; any
  // agent-side writes would be clobbered, so enforce read-only. Only
  // CLAUDE.local.md (per-group memory) remains RW via the group-dir mount.
  // `.claude-shared.md` is a symlink whose target (`/app/CLAUDE.md`) is
  // already RO-mounted, so writes through it fail regardless — no need for
  // a nested mount there.
  const composedClaudeMd = path.join(groupDir, 'CLAUDE.md');
  if (fs.existsSync(composedClaudeMd)) {
    mounts.push({ hostPath: composedClaudeMd, containerPath: '/workspace/agent/CLAUDE.md', readonly: true });
  }
  const fragmentsDir = path.join(groupDir, '.claude-fragments');
  if (fs.existsSync(fragmentsDir)) {
    mounts.push({ hostPath: fragmentsDir, containerPath: '/workspace/agent/.claude-fragments', readonly: true });
  }

  // Global memory directory — always read-only.
  const globalDir = path.join(GROUPS_DIR, 'global');
  if (fs.existsSync(globalDir)) {
    mounts.push({ hostPath: globalDir, containerPath: '/workspace/global', readonly: true });
  }

  // Shared CLAUDE.md — read-only, imported by the composed entry point via
  // the `.claude-shared.md` symlink inside the group dir.
  const sharedClaudeMd = path.join(process.cwd(), 'container', 'CLAUDE.md');
  if (fs.existsSync(sharedClaudeMd)) {
    mounts.push({ hostPath: sharedClaudeMd, containerPath: '/app/CLAUDE.md', readonly: true });
  }

  // Per-group .claude-shared at /home/node/.claude (Claude state, settings,
  // skill symlinks)
  mounts.push({ hostPath: claudeDir, containerPath: '/home/node/.claude', readonly: false });

  // Shared agent-runner source — read-only, same code for all groups.
  const agentRunnerSrc = path.join(projectRoot, 'container', 'agent-runner', 'src');
  mounts.push({ hostPath: agentRunnerSrc, containerPath: '/app/src', readonly: true });

  // Shared skills — read-only, symlinks in .claude-shared/skills/ point here.
  const skillsSrc = path.join(projectRoot, 'container', 'skills');
  if (fs.existsSync(skillsSrc)) {
    mounts.push({ hostPath: skillsSrc, containerPath: '/app/skills', readonly: true });
  }

  // Additional mounts from container config
  if (containerConfig.additionalMounts && containerConfig.additionalMounts.length > 0) {
    const validated = validateAdditionalMounts(containerConfig.additionalMounts, agentGroup.name);
    mounts.push(...validated);
  }

  // Provider-contributed mounts (e.g. opencode-xdg)
  if (providerContribution.mounts) {
    mounts.push(...providerContribution.mounts);
  }

  return mounts;
}

/**
 * Sync skill symlinks in .claude-shared/skills/ to match the container.json
 * selection. Each symlink points to a container path (/app/skills/<name>)
 * so it's dangling on the host but valid inside the container.
 */
function syncSkillSymlinks(
  claudeDir: string,
  containerConfig: import('./container-config.js').ContainerConfig,
  skillsBase?: string,
): void {
  const skillsDir = path.join(claudeDir, 'skills');
  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
  }

  // Determine desired skill set
  const projectRoot = process.cwd();
  const sharedSkillsDir = path.join(projectRoot, 'container', 'skills');
  let desired: string[];
  if (containerConfig.skills === 'all') {
    // Recompute from shared dir — newly-added upstream skills appear automatically
    desired = fs.existsSync(sharedSkillsDir)
      ? fs.readdirSync(sharedSkillsDir).filter((e) => {
          try {
            return fs.statSync(path.join(sharedSkillsDir, e)).isDirectory();
          } catch {
            return false;
          }
        })
      : [];
  } else {
    desired = containerConfig.skills;
  }

  const desiredSet = new Set(desired);

  // Remove symlinks not in the desired set
  for (const entry of fs.readdirSync(skillsDir)) {
    const entryPath = path.join(skillsDir, entry);
    let isSymlink = false;
    try {
      isSymlink = fs.lstatSync(entryPath).isSymbolicLink();
    } catch {
      continue;
    }
    if (isSymlink && !desiredSet.has(entry)) {
      fs.unlinkSync(entryPath);
    }
  }

  // Create or update symlinks for desired skills
  for (const skill of desired) {
    const linkPath = path.join(skillsDir, skill);
    const expectedTarget = skillsBase ? path.join(skillsBase, skill) : `/app/skills/${skill}`;
    try {
      const currentTarget = fs.readlinkSync(linkPath);
      if (currentTarget !== expectedTarget) {
        fs.unlinkSync(linkPath);
        fs.symlinkSync(expectedTarget, linkPath);
      }
    } catch {
      fs.symlinkSync(expectedTarget, linkPath);
    }
  }
}

/**
 * Ensure container.json has the runtime identity fields the runner needs.
 * Written at spawn time so they're always current even if the DB values
 * change (e.g. group rename). Only writes if values differ to avoid
 * unnecessary file churn.
 */
function ensureRuntimeFields(
  containerConfig: import('./container-config.js').ContainerConfig,
  agentGroup: AgentGroup,
): void {
  let dirty = false;
  if (containerConfig.agentGroupId !== agentGroup.id) {
    containerConfig.agentGroupId = agentGroup.id;
    dirty = true;
  }
  if (containerConfig.groupName !== agentGroup.name) {
    containerConfig.groupName = agentGroup.name;
    dirty = true;
  }
  if (containerConfig.assistantName !== agentGroup.name) {
    containerConfig.assistantName = agentGroup.name;
    dirty = true;
  }
  if (dirty) {
    writeContainerConfig(agentGroup.folder, containerConfig);
  }
}

async function buildContainerArgs(
  mounts: VolumeMount[],
  containerName: string,
  agentGroup: AgentGroup,
  containerConfig: import('./container-config.js').ContainerConfig,
  provider: string,
  providerContribution: ProviderContainerContribution,
  agentIdentifier?: string,
): Promise<string[]> {
  const args: string[] = ['run', '--rm', '--name', containerName, '--label', CONTAINER_INSTALL_LABEL];

  // Environment — only vars read by code we don't own.
  // Everything NanoClaw-specific is in container.json (read by runner at startup).
  args.push('-e', `TZ=${TIMEZONE}`);

  // Provider-contributed env vars (e.g. XDG_DATA_HOME, OPENCODE_*, NO_PROXY).
  if (providerContribution.env) {
    for (const [key, value] of Object.entries(providerContribution.env)) {
      args.push('-e', `${key}=${value}`);
    }
  }

  // OneCLI gateway — injects HTTPS_PROXY + certs so container API calls
  // are routed through the agent vault for credential injection.
  try {
    if (agentIdentifier) {
      await onecli.ensureAgent({ name: agentGroup.name, identifier: agentIdentifier });
    }
    const onecliApplied = await onecli.applyContainerConfig(args, { addHostMapping: false, agent: agentIdentifier });
    if (onecliApplied) {
      log.info('OneCLI gateway applied', { containerName });
    } else {
      log.warn('OneCLI gateway not applied — container will have no credentials', { containerName });
    }
  } catch (err) {
    log.warn('OneCLI gateway error — container will have no credentials', { containerName, err });
  }

  // Host gateway
  args.push(...hostGatewayArgs());

  // User mapping
  const hostUid = process.getuid?.();
  const hostGid = process.getgid?.();
  if (hostUid != null && hostUid !== 0 && hostUid !== 1000) {
    args.push('--user', `${hostUid}:${hostGid}`);
    args.push('-e', 'HOME=/home/node');
  }

  // Volume mounts
  for (const mount of mounts) {
    if (mount.readonly) {
      args.push(...readonlyMountArgs(mount.hostPath, mount.containerPath));
    } else {
      args.push('-v', `${mount.hostPath}:${mount.containerPath}`);
    }
  }

  // Override entrypoint: run v2 entry point directly via Bun (no tsc, no stdin).
  args.push('--entrypoint', 'bash');

  // Use per-agent-group image if one has been built, otherwise base image
  const imageTag = containerConfig.imageTag || CONTAINER_IMAGE;
  args.push(imageTag);

  args.push('-c', 'exec bun run /app/src/index.ts');

  return args;
}

/** Build a per-agent-group Docker image with custom packages. */
export async function buildAgentGroupImage(agentGroupId: string): Promise<void> {
  const agentGroup = getAgentGroup(agentGroupId);
  if (!agentGroup) throw new Error('Agent group not found');

  const containerConfig = readContainerConfig(agentGroup.folder);
  const aptPackages = containerConfig.packages.apt;
  const npmPackages = containerConfig.packages.npm;

  if (aptPackages.length === 0 && npmPackages.length === 0) {
    throw new Error('No packages to install. Use install_packages first.');
  }

  let dockerfile = `FROM ${CONTAINER_IMAGE}\nUSER root\n`;
  if (aptPackages.length > 0) {
    dockerfile += `RUN apt-get update && apt-get install -y ${aptPackages.join(' ')} && rm -rf /var/lib/apt/lists/*\n`;
  }
  if (npmPackages.length > 0) {
    // pnpm skips build scripts unless packages are allowlisted. Append each
    // to /root/.npmrc (base image sets it up for agent-browser) so packages
    // with postinstall — e.g. playwright, puppeteer, native addons — don't
    // install silently broken.
    const allowlist = npmPackages.map((p) => `echo 'only-built-dependencies[]=${p}' >> /root/.npmrc`).join(' && ');
    dockerfile += `RUN ${allowlist} && pnpm install -g ${npmPackages.join(' ')}\n`;
  }
  dockerfile += 'USER node\n';

  const imageTag = `${CONTAINER_IMAGE_BASE}:${agentGroupId}`;

  log.info('Building per-agent-group image', { agentGroupId, imageTag, apt: aptPackages, npm: npmPackages });

  // Write Dockerfile to temp file and build
  const tmpDockerfile = path.join(DATA_DIR, `Dockerfile.${agentGroupId}`);
  fs.writeFileSync(tmpDockerfile, dockerfile);
  try {
    execSync(`${CONTAINER_RUNTIME_BIN} build -t ${imageTag} -f ${tmpDockerfile} .`, {
      cwd: DATA_DIR,
      stdio: 'pipe',
      timeout: 300_000,
    });
  } finally {
    fs.unlinkSync(tmpDockerfile);
  }

  // Store the image tag in groups/<folder>/container.json
  containerConfig.imageTag = imageTag;
  writeContainerConfig(agentGroup.folder, containerConfig);

  log.info('Per-agent-group image built', { agentGroupId, imageTag });
}
