import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import type { TaskContract, TaskState } from './contract.js';
import { writeTaskState } from './contract.js';
import { checkWorkerResults } from './tools.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'poll-int-test-'));
  process.env.NANOCLAW_AGENT_DIR = tmpDir;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.NANOCLAW_AGENT_DIR;
});

function makeContract(id: string): TaskContract {
  return {
    id,
    type: 'structured-output',
    objective: `Task ${id}`,
    outputFormat: 'json',
    context: '',
    boundaries: [],
    postconditions: [],
    timeout_ms: 30_000,
    context_budget_tokens: 4096,
  };
}

describe('checkWorkerResults', () => {
  it('returns null when no worker-results directory exists', () => {
    const result = checkWorkerResults();
    expect(result).toBeNull();
  });

  it('returns null when worker-results is empty', () => {
    fs.mkdirSync(path.join(tmpDir, 'worker-results'), { recursive: true });
    const result = checkWorkerResults();
    expect(result).toBeNull();
  });

  it('returns formatted summary for completed results', () => {
    const resultsDir = path.join(tmpDir, 'worker-results');
    fs.mkdirSync(resultsDir, { recursive: true });

    const state: TaskState = {
      contract: makeContract('res-001'),
      status: 'completed',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      result: { raw: '{"data": 42}', parsed: '{"data": 42}' },
      verification: { passed: true, checks: [] },
    };
    writeTaskState(path.join(resultsDir, 'res-001.json'), state);

    const result = checkWorkerResults();
    expect(result).not.toBeNull();
    expect(result).toContain('res-001');
    expect(result).toContain('completed');
    expect(result).toContain('{"data": 42}');
  });

  it('returns formatted summary for failed results', () => {
    const resultsDir = path.join(tmpDir, 'worker-results');
    fs.mkdirSync(resultsDir, { recursive: true });

    const state: TaskState = {
      contract: makeContract('fail-001'),
      status: 'failed',
      created_at: new Date().toISOString(),
      error: 'Connection refused',
    };
    writeTaskState(path.join(resultsDir, 'fail-001.json'), state);

    const result = checkWorkerResults();
    expect(result).not.toBeNull();
    expect(result).toContain('fail-001');
    expect(result).toContain('failed');
    expect(result).toContain('Connection refused');
  });

  it('cleans up processed result files after pickup', () => {
    const resultsDir = path.join(tmpDir, 'worker-results');
    fs.mkdirSync(resultsDir, { recursive: true });

    writeTaskState(path.join(resultsDir, 'clean-001.json'), {
      contract: makeContract('clean-001'),
      status: 'completed',
      created_at: new Date().toISOString(),
      result: { raw: 'ok', parsed: 'ok' },
      verification: { passed: true, checks: [] },
    });

    checkWorkerResults();

    const remaining = fs.readdirSync(resultsDir);
    expect(remaining).toHaveLength(0);
  });

  it('handles multiple results in one pickup', () => {
    const resultsDir = path.join(tmpDir, 'worker-results');
    fs.mkdirSync(resultsDir, { recursive: true });

    for (const id of ['multi-001', 'multi-002']) {
      writeTaskState(path.join(resultsDir, `${id}.json`), {
        contract: makeContract(id),
        status: 'completed',
        created_at: new Date().toISOString(),
        result: { raw: `result-${id}`, parsed: `result-${id}` },
        verification: { passed: true, checks: [] },
      });
    }

    const result = checkWorkerResults();
    expect(result).toContain('multi-001');
    expect(result).toContain('multi-002');
  });

  it('skips running tasks (not yet complete)', () => {
    const resultsDir = path.join(tmpDir, 'worker-results');
    fs.mkdirSync(resultsDir, { recursive: true });

    writeTaskState(path.join(resultsDir, 'running-001.json'), {
      contract: makeContract('running-001'),
      status: 'running',
      created_at: new Date().toISOString(),
    });

    const result = checkWorkerResults();
    expect(result).toBeNull();

    const remaining = fs.readdirSync(resultsDir);
    expect(remaining).toHaveLength(1);
  });
});
