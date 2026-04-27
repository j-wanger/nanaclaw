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
