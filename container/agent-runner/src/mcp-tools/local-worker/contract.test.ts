import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import {
  type TaskContract,
  type TaskState,
  validateContract,
  writeTaskState,
  readTaskState,
  taskDir,
  resultDir,
} from './contract.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contract-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function validContract(overrides: Partial<TaskContract> = {}): TaskContract {
  return {
    id: 'test-001',
    type: 'code-impl',
    objective: 'Implement a CSV parser',
    outputFormat: 'code',
    context: 'export function parseCsv(input: string): string[][] { }',
    boundaries: ['Do not add dependencies'],
    postconditions: [{ type: 'contains', params: { substring: 'parseCsv' } }],
    timeout_ms: 30_000,
    context_budget_tokens: 4096,
    ...overrides,
  };
}

describe('validateContract', () => {
  it('accepts a valid contract with all required fields', () => {
    const result = validateContract(validContract());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts all output format types', () => {
    for (const fmt of ['json', 'code', 'markdown'] as const) {
      const result = validateContract(validContract({ outputFormat: fmt }));
      expect(result.valid).toBe(true);
    }
  });

  it('accepts all task types', () => {
    for (const t of ['file-op', 'code-impl', 'research', 'structured-output'] as const) {
      const result = validateContract(validContract({ type: t }));
      expect(result.valid).toBe(true);
    }
  });

  it('rejects missing objective', () => {
    const result = validateContract(validContract({ objective: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('objective'))).toBe(true);
  });

  it('rejects missing id', () => {
    const result = validateContract(validContract({ id: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('id'))).toBe(true);
  });

  it('rejects invalid output format', () => {
    const result = validateContract(validContract({ outputFormat: 'xml' as any }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('outputFormat'))).toBe(true);
  });

  it('rejects invalid task type', () => {
    const result = validateContract(validContract({ type: 'unknown' as any }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('type'))).toBe(true);
  });

  it('rejects non-positive timeout', () => {
    const result = validateContract(validContract({ timeout_ms: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('timeout'))).toBe(true);
  });

  it('rejects non-positive context_budget_tokens', () => {
    const result = validateContract(validContract({ context_budget_tokens: -1 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('context_budget_tokens'))).toBe(true);
  });

  it('accepts contract with valid max_iterations', () => {
    const result = validateContract(validContract({ max_iterations: 10 }));
    expect(result.valid).toBe(true);
  });

  it('accepts contract without max_iterations (backward compat)', () => {
    const contract = validContract();
    expect(contract.max_iterations).toBeUndefined();
    const result = validateContract(contract);
    expect(result.valid).toBe(true);
  });

  it('rejects non-positive max_iterations', () => {
    const result = validateContract(validContract({ max_iterations: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('max_iterations'))).toBe(true);
  });

  it('accepts contract with valid write_to (episodic)', () => {
    const result = validateContract(validContract({
      write_to: { wiki: 'test-wiki', tier: 'episodic', title: 'Summary', tags: ['research'] },
    }));
    expect(result.valid).toBe(true);
  });

  it('accepts contract with valid write_to (review with target_path)', () => {
    const result = validateContract(validContract({
      write_to: { wiki: 'test-wiki', tier: 'review', target_path: '/path/to/article.md' },
    }));
    expect(result.valid).toBe(true);
  });

  it('accepts contract without write_to (backward compat)', () => {
    const contract = validContract();
    expect(contract.write_to).toBeUndefined();
    const result = validateContract(contract);
    expect(result.valid).toBe(true);
  });

  it('rejects write_to with missing wiki', () => {
    const result = validateContract(validContract({
      write_to: { wiki: '', tier: 'episodic', title: 'Test', tags: [] },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('write_to.wiki'))).toBe(true);
  });

  it('rejects write_to with invalid tier', () => {
    const result = validateContract(validContract({
      write_to: { wiki: 'test', tier: 'invalid' as any, title: 'Test', tags: [] },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('write_to.tier'))).toBe(true);
  });
});

describe('TaskState file helpers', () => {
  it('writes and reads task state round-trip', () => {
    const state: TaskState = {
      contract: validContract(),
      status: 'pending',
      created_at: '2026-04-26T10:00:00.000Z',
    };
    const filePath = path.join(tmpDir, 'task-001.json');
    writeTaskState(filePath, state);
    const loaded = readTaskState(filePath);
    expect(loaded).not.toBeNull();
    expect(loaded!.contract.id).toBe('test-001');
    expect(loaded!.status).toBe('pending');
  });

  it('reads null for missing file', () => {
    const loaded = readTaskState(path.join(tmpDir, 'nonexistent.json'));
    expect(loaded).toBeNull();
  });

  it('supports all status transitions', () => {
    const filePath = path.join(tmpDir, 'task-transitions.json');
    const base: TaskState = {
      contract: validContract(),
      status: 'pending',
      created_at: '2026-04-26T10:00:00.000Z',
    };

    for (const status of ['pending', 'running', 'completed', 'failed', 'timeout', 'cancelled'] as const) {
      writeTaskState(filePath, { ...base, status });
      const loaded = readTaskState(filePath);
      expect(loaded!.status).toBe(status);
    }
  });

  it('preserves result and error fields', () => {
    const state: TaskState = {
      contract: validContract(),
      status: 'completed',
      created_at: '2026-04-26T10:00:00.000Z',
      completed_at: '2026-04-26T10:00:15.000Z',
      result: { raw: 'function parseCsv() {}', parsed: 'function parseCsv() {}' },
      verification: { passed: true, checks: [{ type: 'contains', passed: true }] },
    };
    const filePath = path.join(tmpDir, 'task-result.json');
    writeTaskState(filePath, state);
    const loaded = readTaskState(filePath);
    expect(loaded!.result!.parsed).toBe('function parseCsv() {}');
    expect(loaded!.verification!.passed).toBe(true);
  });

  it('preserves error field on failure', () => {
    const state: TaskState = {
      contract: validContract(),
      status: 'failed',
      created_at: '2026-04-26T10:00:00.000Z',
      error: 'Connection refused',
    };
    const filePath = path.join(tmpDir, 'task-error.json');
    writeTaskState(filePath, state);
    const loaded = readTaskState(filePath);
    expect(loaded!.error).toBe('Connection refused');
  });

  it('preserves toolTrace field through round-trip', () => {
    const state: TaskState = {
      contract: validContract(),
      status: 'completed',
      created_at: '2026-04-26T10:00:00.000Z',
      completed_at: '2026-04-26T10:00:15.000Z',
      result: { raw: 'output', parsed: 'output' },
      toolTrace: [
        { iteration: 1, tool: 'web_search', args: { query: 'test' }, result: 'found 3 results', latency_ms: 120 },
        { iteration: 2, tool: 'wiki_write', args: { title: 'Test' }, result: 'Written to wiki', latency_ms: 350 },
      ],
    };
    const filePath = path.join(tmpDir, 'task-trace.json');
    writeTaskState(filePath, state);
    const loaded = readTaskState(filePath);
    expect(loaded!.toolTrace).toBeDefined();
    expect(loaded!.toolTrace).toHaveLength(2);
    expect(loaded!.toolTrace![0].tool).toBe('web_search');
    expect(loaded!.toolTrace![1].tool).toBe('wiki_write');
    expect(loaded!.toolTrace![0].latency_ms).toBe(120);
  });

  it('round-trips TaskState without toolTrace (backward compat)', () => {
    const state: TaskState = {
      contract: validContract(),
      status: 'completed',
      created_at: '2026-04-26T10:00:00.000Z',
      result: { raw: 'output', parsed: 'output' },
    };
    const filePath = path.join(tmpDir, 'task-no-trace.json');
    writeTaskState(filePath, state);
    const loaded = readTaskState(filePath);
    expect(loaded!.toolTrace).toBeUndefined();
  });
});

describe('directory helpers', () => {
  it('taskDir returns worker-tasks path under base', () => {
    const dir = taskDir(tmpDir);
    expect(dir).toBe(path.join(tmpDir, 'worker-tasks'));
  });

  it('resultDir returns worker-results path under base', () => {
    const dir = resultDir(tmpDir);
    expect(dir).toBe(path.join(tmpDir, 'worker-results'));
  });
});
