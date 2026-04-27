#!/usr/bin/env npx tsx
/**
 * Spawn pipeline smoke test.
 * Exercises memory fragment, wiki context, and host env generation
 * structurally — no external services required.
 *
 * Runs on Node (via tsx) because host modules use better-sqlite3.
 *
 * Usage:
 *   npx tsx scripts/smoke-test.ts              # full run with temp dirs
 *   npx tsx scripts/smoke-test.ts --dry-run    # validate script structure only
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDryRun = process.argv.includes('--dry-run');

interface StepResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: StepResult[] = [];

async function step(name: string, fn: () => Promise<string> | string): Promise<void> {
  try {
    const detail = await fn();
    results.push({ name, passed: true, detail });
    console.log(`  ✓ ${name}: ${detail}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, detail: msg });
    console.log(`  ✗ ${name}: ${msg}`);
  }
}

async function main() {
  if (isDryRun) {
    console.log('smoke test: dry-run mode — validating script structure');
    await step('script-structure', () => {
      const steps = ['memory-fragment', 'wiki-context', 'host-env', 'project-structure'];
      return `${steps.length} steps defined`;
    });
    const passed = results.every((r) => r.passed);
    console.log(passed ? '\nPASS' : '\nFAIL');
    process.exit(passed ? 0 : 1);
  }

  console.log('smoke test: full run');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-test-'));

  try {
    const groupDir = path.join(tmpDir, 'group');
    const memoryDir = path.join(groupDir, 'memory');
    fs.mkdirSync(memoryDir, { recursive: true });

    fs.writeFileSync(
      path.join(memoryDir, 'MEMORY.md'),
      `# Memory\n\n## [user] Test User (2026-04-26)\nSenior engineer, prefers terse responses\n\n## [project] NanaClaw (2026-04-26)\nPersonal AI assistant\n`,
    );

    const wikiDir = path.join(tmpDir, 'test-wiki');
    const articlesDir = path.join(wikiDir, 'articles', 'concepts');
    fs.mkdirSync(articlesDir, { recursive: true });
    fs.writeFileSync(
      path.join(wikiDir, 'schema.md'),
      `---\ndomain: Test\n---\n\n# Wiki Schema\n\n## Hierarchy Roots\n- testing\n- automation\n`,
    );
    fs.writeFileSync(
      path.join(articlesDir, 'test-article.md'),
      `---\ntitle: "Test Article"\ntags: ["testing"]\n---\n\nContent.\n`,
    );

    const wikisJsonPath = path.join(tmpDir, 'wikis.json');
    fs.writeFileSync(
      wikisJsonPath,
      JSON.stringify({
        version: 1,
        wikis: [{ name: 'test-wiki', path: wikiDir, description: 'Smoke test wiki.' }],
      }),
    );

    await step('memory-fragment', async () => {
      const { generateMemoryFragment } = await import('../src/modules/memory/context-builder.js');
      generateMemoryFragment(groupDir);
      const fragPath = path.join(groupDir, '.claude-fragments', 'memory-context.md');
      if (!fs.existsSync(fragPath)) throw new Error('memory-context.md not created');
      const content = fs.readFileSync(fragPath, 'utf-8');
      if (!content.includes('Test User')) throw new Error('memory content missing user entry');
      return `${content.length} chars, includes user entry`;
    });

    await step('wiki-context', async () => {
      const { generateWikiContext } = await import('../src/modules/memory/wiki-bridge.js');
      generateWikiContext(groupDir, wikisJsonPath);
      const fragPath = path.join(groupDir, '.claude-fragments', 'wiki-context.md');
      if (!fs.existsSync(fragPath)) throw new Error('wiki-context.md not created');
      const content = fs.readFileSync(fragPath, 'utf-8');
      if (!content.includes('test-wiki')) throw new Error('wiki name missing');
      if (!content.includes('testing')) throw new Error('hierarchy root missing');
      if (!content.includes('1 articles')) throw new Error('article count missing');
      return `${content.length} chars, wiki name + roots + count present`;
    });

    await step('host-env', async () => {
      const { buildHostRunnerEnv } = await import('../src/container-runner.js');
      const env = buildHostRunnerEnv({
        sessionDir: '/tmp/test-session',
        agentDir: groupDir,
        timezone: 'America/Toronto',
      });
      if (!env.NANOCLAW_SESSION_DIR) throw new Error('NANOCLAW_SESSION_DIR missing');
      if (!env.NANOCLAW_AGENT_DIR) throw new Error('NANOCLAW_AGENT_DIR missing');
      if (!env.TZ) throw new Error('TZ missing');
      return '3 required keys present';
    });

    await step('project-structure', () => {
      const root = path.resolve(__dirname, '..');
      const required = [
        'src/modules/memory/context-builder.ts',
        'src/modules/memory/wiki-bridge.ts',
        'src/modules/memory/index.ts',
        'container/agent-runner/src/mcp-tools/wiki-search.ts',
        'container/agent-runner/src/mcp-tools/wiki-write.ts',
        'container/skills/memory/SKILL.md',
      ];
      const missing = required.filter((f) => !fs.existsSync(path.join(root, f)));
      if (missing.length > 0) throw new Error(`Missing: ${missing.join(', ')}`);
      return `${required.length} required files present`;
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const passed = results.every((r) => r.passed);
  const passCount = results.filter((r) => r.passed).length;
  console.log(`\n${passCount}/${results.length} steps passed`);
  console.log(passed ? 'PASS' : 'FAIL');
  process.exit(passed ? 0 : 1);
}

main();
