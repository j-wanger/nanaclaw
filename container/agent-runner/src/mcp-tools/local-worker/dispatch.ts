import fs from 'fs';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';

import { AGENT_DIR } from '../../config.js';
import type { TaskContract, TaskState, WriteTo } from './contract.js';
import { writeTaskState } from './contract.js';
import { executeAgentLoop, type AgentLoopResult } from './agent-loop.js';
import { buildToolDefinitions } from './tool-registry.js';
import { buildWorkerPrompt } from './prompt-builder.js';
import { parseWorkerResult } from './result-parser.js';
import { routeTask, loadRoutingConfig, type RoutingConfig } from './routing.js';
import { Semaphore } from './semaphore.js';
import { verify } from './verification.js';

let _routingConfig: RoutingConfig | null | undefined;
const _semaphores = new Map<string, Semaphore>();

function getRoutingConfig(): RoutingConfig | null {
  if (_routingConfig === undefined) {
    const configPath = `${process.env.NANOCLAW_AGENT_DIR || AGENT_DIR}/container.json`;
    _routingConfig = loadRoutingConfig(configPath);
  }
  return _routingConfig;
}

function getSemaphore(url: string): Semaphore {
  let sem = _semaphores.get(url);
  if (!sem) {
    const config = getRoutingConfig();
    const maxConcurrent = config?.endpoints[url]?.max_concurrent ?? 1;
    sem = new Semaphore(maxConcurrent);
    _semaphores.set(url, sem);
  }
  return sem;
}

interface WikiEntry {
  name: string;
  path: string;
  description: string;
}

function loadWikis(): WikiEntry[] | null {
  const wikisPath = process.env.WIKIS_JSON_PATH || path.join(os.homedir(), '.claude', 'wikis.json');
  try {
    const raw = JSON.parse(fs.readFileSync(wikisPath, 'utf8')) as { wikis: WikiEntry[] };
    return raw.wikis || [];
  } catch {
    return null;
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function updateFrontmatterField(content: string, field: string, value: string): string {
  const fmMatch = content.match(/^(---\n)([\s\S]*?)\n(---)/);
  if (!fmMatch) return content;
  const fieldRegex = new RegExp(`^${field}:.*$`, 'm');
  let fm = fmMatch[2];
  if (fieldRegex.test(fm)) {
    fm = fm.replace(fieldRegex, `${field}: ${value}`);
  } else {
    fm += `\n${field}: ${value}`;
  }
  return `${fmMatch[1]}${fm}\n${fmMatch[3]}${content.slice(fmMatch[0].length)}`;
}

export function postProcessResult(state: TaskState): void {
  const writeTo = state.contract.write_to;
  if (!writeTo) return;
  if (state.status !== 'completed' || !state.result) return;

  try {
    if (writeTo.tier === 'episodic') {
      writeEpisodicArticle(writeTo, state.result.parsed);
    } else if (writeTo.tier === 'review' && writeTo.target_path) {
      applyReviewStatus(writeTo, state.result.parsed);
    }
  } catch (err) {
    console.error(`[dispatch] postProcessResult failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function writeEpisodicArticle(writeTo: WriteTo, content: string): void {
  const wikis = loadWikis();
  if (!wikis) return;
  const wiki = wikis.find((w) => w.name === writeTo.wiki) || wikis[0];
  if (!wiki) return;

  const title = writeTo.title || 'Untitled';
  const tags = writeTo.tags || [];
  const tagStr = tags.map((t) => `"${t}"`).join(', ');
  const today = new Date().toISOString().slice(0, 10);
  const slug = generateSlug(title);

  const lines = [
    '---',
    `title: "${title}"`,
    `tags: [${tagStr}]`,
    'source: worker-research',
    `created: ${today}`,
    'tier: episodic',
  ];
  if (writeTo.source_url) lines.push(`source_url: ${writeTo.source_url}`);
  lines.push('---');
  const frontmatter = lines.join('\n');

  const outputDir = path.join(wiki.path, 'episodic');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, `${slug}.md`), `${frontmatter}\n\n${content}\n`);
}

function applyReviewStatus(writeTo: WriteTo, reviewOutput: string): void {
  let review: { passed?: boolean; score?: number };
  try {
    review = JSON.parse(reviewOutput);
  } catch {
    console.error('[dispatch] review output is not valid JSON, skipping status update');
    return;
  }

  const targetPath = writeTo.target_path!;
  let fileContent: string;
  try {
    fileContent = fs.readFileSync(targetPath, 'utf8');
  } catch {
    console.error(`[dispatch] target file not found: ${targetPath}`);
    return;
  }

  const newStatus = review.passed ? 'passed' : 'failed';
  const updated = updateFrontmatterField(fileContent, 'status', newStatus);
  fs.writeFileSync(targetPath, updated);
}

export async function executeWorkerTask(contract: TaskContract, resultsDir: string): Promise<void> {
  if (contract.tools && contract.tools.length > 0) {
    return executeToolCallingWorker(contract, resultsDir);
  }
  return executeSingleShotWorker(contract, resultsDir);
}

async function executeToolCallingWorker(contract: TaskContract, resultsDir: string): Promise<void> {
  const resultPath = path.join(resultsDir, `${contract.id}.json`);
  const prompt = buildWorkerPrompt(contract);
  const { definitions, errors } = buildToolDefinitions(contract.tools!);

  if (errors.length > 0) {
    const state: TaskState = {
      contract,
      status: 'failed',
      created_at: new Date().toISOString(),
      error: `Tool registry errors: ${errors.join(', ')}`,
    };
    writeTaskState(resultPath, state);
    return;
  }

  const maxIterations = contract.max_iterations ?? 20;

  let loopResult: AgentLoopResult;
  try {
    loopResult = await executeAgentLoop({
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      tools: definitions,
      maxIterations,
      timeoutMs: contract.timeout_ms,
      taskType: contract.type,
    });
  } catch (err) {
    const state: TaskState = {
      contract,
      status: 'failed',
      created_at: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };
    writeTaskState(resultPath, state);
    return;
  }

  const raw = loopResult.output;
  const parseResult = parseWorkerResult(raw, contract.outputFormat);
  const parsed = parseResult.ok ? parseResult.parsed : raw;
  const verification = verify(parsed, contract.postconditions, contract.outputFormat);

  const isTimeout = loopResult.terminationReason === 'timeout';
  const isError = loopResult.terminationReason === 'error';

  const cappedTrace = loopResult.toolTrace.slice(0, 20).map(entry => ({
    ...entry,
    result: entry.result.length > 500 ? entry.result.slice(0, 500) + '...' : entry.result,
  }));

  const state: TaskState = {
    contract,
    status: isTimeout ? 'timeout' : isError ? 'failed' : parseResult.ok ? 'completed' : 'failed',
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    result: { raw, parsed },
    verification,
    toolTrace: cappedTrace,
    ...(parseResult.ok && !isTimeout && !isError ? {} : { error: (!parseResult.ok ? parseResult.error : undefined) || loopResult.error || loopResult.terminationReason }),
  };

  writeTaskState(resultPath, state);
  postProcessResult(state);
}

async function executeSingleShotWorker(contract: TaskContract, resultsDir: string): Promise<void> {
  const resultPath = path.join(resultsDir, `${contract.id}.json`);
  const prompt = buildWorkerPrompt(contract);
  const url = routeTask(contract.type, getRoutingConfig());
  const release = await getSemaphore(url).acquire();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), contract.timeout_ms);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        temperature: 0,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      const state: TaskState = {
        contract,
        status: 'failed',
        created_at: new Date().toISOString(),
        error: `HTTP ${response.status}: ${errText.slice(0, 500)}`,
      };
      writeTaskState(resultPath, state);
      return;
    }

    const body = await response.json() as { choices: Array<{ message: { content: string } }> };
    const raw = body.choices?.[0]?.message?.content ?? '';

    const parseResult = parseWorkerResult(raw, contract.outputFormat);
    const parsed = parseResult.ok ? parseResult.parsed : raw;
    const verification = verify(parsed, contract.postconditions, contract.outputFormat);

    const state: TaskState = {
      contract,
      status: parseResult.ok ? 'completed' : 'failed',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      result: { raw, parsed },
      verification,
      ...(parseResult.ok ? {} : { error: parseResult.error }),
    };

    writeTaskState(resultPath, state);
    postProcessResult(state);
  } catch (err) {
    clearTimeout(timer);

    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    const state: TaskState = {
      contract,
      status: isAbort ? 'timeout' : 'failed',
      created_at: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };

    writeTaskState(resultPath, state);
  } finally {
    release();
  }
}
