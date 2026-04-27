#!/usr/bin/env bun
/**
 * Worker E2E test harness.
 * Dispatches real tasks against live llama-cpp and captures metrics.
 *
 * Usage:
 *   bun run scripts/worker-e2e.ts              # live run
 *   bun run scripts/worker-e2e.ts --dry-run    # validate fixtures only
 */
import fs from 'fs';
import path from 'path';

import { fixtures, type E2EFixture } from './worker-e2e-fixtures.js';
import { buildWorkerPrompt } from '../container/agent-runner/src/mcp-tools/local-worker/prompt-builder.js';
import { parseWorkerResult } from '../container/agent-runner/src/mcp-tools/local-worker/result-parser.js';
import { verify } from '../container/agent-runner/src/mcp-tools/local-worker/verification.js';
import type { TaskContract, T0Check } from '../container/agent-runner/src/mcp-tools/local-worker/contract.js';

const LLAMA_URL = process.env.NANOCLAW_LLAMA_URL || 'http://localhost:8080/v1/chat/completions';
const RESULTS_PATH = path.join(import.meta.dir, '..', 'docs', 'worker-e2e-results.json');

interface TaskResult {
  task_id: string;
  type: string;
  objective: string;
  latency_ms: number;
  t0_passed: boolean;
  expected_verdict: string;
  actual_verdict: string;
  match: boolean;
  raw: string;
  parsed: string;
  verification_details: Array<{ type: string; passed: boolean; detail?: string }>;
  error?: string;
}

function fixtureToContract(fixture: E2EFixture, id: string): TaskContract {
  return {
    id,
    type: fixture.type,
    objective: fixture.objective,
    outputFormat: fixture.outputFormat,
    context: fixture.context,
    boundaries: fixture.boundaries,
    postconditions: fixture.postconditions as T0Check[],
    timeout_ms: fixture.timeout_ms,
    context_budget_tokens: fixture.context_budget_tokens,
  };
}

async function runTask(fixture: E2EFixture, index: number): Promise<TaskResult> {
  const id = `e2e-${index + 1}`;
  const contract = fixtureToContract(fixture, id);
  const prompt = buildWorkerPrompt(contract);

  const start = Date.now();

  try {
    const response = await fetch(LLAMA_URL, {
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
      signal: AbortSignal.timeout(contract.timeout_ms),
    });

    const latency_ms = Date.now() - start;

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        task_id: id,
        type: fixture.type,
        objective: fixture.objective,
        latency_ms,
        t0_passed: false,
        expected_verdict: fixture.expected_verdict,
        actual_verdict: 'fail',
        match: fixture.expected_verdict === 'fail',
        raw: '',
        parsed: '',
        verification_details: [],
        error: `HTTP ${response.status}: ${errText.slice(0, 200)}`,
      };
    }

    const body = await response.json() as { choices: Array<{ message: { content: string } }> };
    const raw = body.choices?.[0]?.message?.content ?? '';

    const parseResult = parseWorkerResult(raw, contract.outputFormat);
    const parsed = parseResult.ok ? parseResult.parsed : raw;
    const verification = verify(parsed, contract.postconditions as T0Check[], contract.outputFormat);

    const actual_verdict = (parseResult.ok && verification.passed) ? 'pass' : 'fail';

    return {
      task_id: id,
      type: fixture.type,
      objective: fixture.objective,
      latency_ms,
      t0_passed: verification.passed,
      expected_verdict: fixture.expected_verdict,
      actual_verdict,
      match: actual_verdict === fixture.expected_verdict,
      raw: raw.slice(0, 2000),
      parsed: parsed.slice(0, 2000),
      verification_details: verification.checks,
      ...(parseResult.ok ? {} : { error: parseResult.error }),
    };
  } catch (err) {
    return {
      task_id: id,
      type: fixture.type,
      objective: fixture.objective,
      latency_ms: Date.now() - start,
      t0_passed: false,
      expected_verdict: fixture.expected_verdict,
      actual_verdict: 'fail',
      match: fixture.expected_verdict === 'fail',
      raw: '',
      parsed: '',
      verification_details: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.error(`fixtures loaded: ${fixtures.length}`);

  if (isDryRun) {
    console.error('Dry run — validating fixture contracts only');
    for (let i = 0; i < fixtures.length; i++) {
      const f = fixtures[i];
      const contract = fixtureToContract(f, `e2e-${i + 1}`);
      const prompt = buildWorkerPrompt(contract);
      console.error(`  [${i + 1}] ${f.type}/${f.outputFormat}: ${f.objective.slice(0, 60)}... (system: ${prompt.system.length}c, user: ${prompt.user.length}c)`);
    }
    console.error('All fixtures valid.');
    return;
  }

  console.error(`Running ${fixtures.length} tasks against ${LLAMA_URL}...`);
  const results: TaskResult[] = [];

  for (let i = 0; i < fixtures.length; i++) {
    console.error(`  [${i + 1}/${fixtures.length}] ${fixtures[i].type}: ${fixtures[i].objective.slice(0, 50)}...`);
    const result = await runTask(fixtures[i], i);
    results.push(result);
    const icon = result.match ? '✓' : '✗';
    console.error(`    ${icon} ${result.actual_verdict} (${result.latency_ms}ms) ${result.error || ''}`);
  }

  // Summary
  const total = results.length;
  const passed = results.filter((r) => r.actual_verdict === 'pass').length;
  const matched = results.filter((r) => r.match).length;
  const fp = results.filter((r) => r.actual_verdict === 'pass' && r.expected_verdict === 'fail').length;
  const fn = results.filter((r) => r.actual_verdict === 'fail' && r.expected_verdict === 'pass').length;

  console.error('\n--- Summary ---');
  console.error(`pass rate: ${passed}/${total}`);
  console.error(`verdict match: ${matched}/${total}`);
  console.error(`FP rate: ${fp} (T0 passed but expected fail)`);
  console.error(`FN rate: ${fn} (T0 failed but expected pass)`);

  // Write results
  fs.mkdirSync(path.dirname(RESULTS_PATH), { recursive: true });
  fs.writeFileSync(RESULTS_PATH, JSON.stringify({ results, summary: { total, passed, matched, fp, fn } }, null, 2));
  console.error(`Results written to ${RESULTS_PATH}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
