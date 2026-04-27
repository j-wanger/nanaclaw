import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import type { TaskContract, TaskState } from './contract.js';
import { readTaskState, resultDir, taskDir } from './contract.js';
import { executeWorkerTask } from './dispatch.js';

let tmpDir: string;
let tasksDir: string;
let resultsDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dispatch-test-'));
  tasksDir = path.join(tmpDir, 'worker-tasks');
  resultsDir = path.join(tmpDir, 'worker-results');
  fs.mkdirSync(tasksDir, { recursive: true });
  fs.mkdirSync(resultsDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function testContract(overrides: Partial<TaskContract> = {}): TaskContract {
  return {
    id: 'dispatch-001',
    type: 'structured-output',
    objective: 'Generate a JSON object with name and age fields',
    outputFormat: 'json',
    context: '',
    boundaries: [],
    postconditions: [{ type: 'json-valid', params: {} }],
    timeout_ms: 10_000,
    context_budget_tokens: 4096,
    ...overrides,
  };
}

describe('executeWorkerTask', () => {
  it('writes completed result on successful fetch', async () => {
    const contract = testContract();
    const mockResponse = {
      choices: [{ message: { content: '{"name": "Alice", "age": 30}' } }],
    };

    const fetchMock = mock(() =>
      Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 })),
    );
    const origFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as any;

    try {
      await executeWorkerTask(contract, resultsDir);

      const resultPath = path.join(resultsDir, `${contract.id}.json`);
      const state = readTaskState(resultPath);
      expect(state).not.toBeNull();
      expect(state!.status).toBe('completed');
      expect(state!.result).toBeDefined();
      expect(state!.result!.parsed).toContain('Alice');
      expect(state!.verification).toBeDefined();
      expect(state!.verification!.passed).toBe(true);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('builds correct request body for llama-cpp', async () => {
    const contract = testContract({ objective: 'Test objective' });
    let capturedBody: any;

    const fetchMock = mock((url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return Promise.resolve(
        new Response(
          JSON.stringify({ choices: [{ message: { content: '{"ok": true}' } }] }),
          { status: 200 },
        ),
      );
    });
    const origFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as any;

    try {
      await executeWorkerTask(contract, resultsDir);

      expect(capturedBody).toBeDefined();
      expect(capturedBody.messages).toBeInstanceOf(Array);
      expect(capturedBody.messages.length).toBe(2);
      expect(capturedBody.messages[0].role).toBe('system');
      expect(capturedBody.messages[1].role).toBe('user');
      expect(capturedBody.messages[1].content).toContain('Test objective');
      expect(capturedBody.temperature).toBe(0);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('writes failed result on network error', async () => {
    const contract = testContract({ id: 'fail-001' });

    const fetchMock = mock(() => Promise.reject(new Error('Connection refused')));
    const origFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as any;

    try {
      await executeWorkerTask(contract, resultsDir);

      const resultPath = path.join(resultsDir, 'fail-001.json');
      const state = readTaskState(resultPath);
      expect(state).not.toBeNull();
      expect(state!.status).toBe('failed');
      expect(state!.error).toContain('Connection refused');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('writes timeout status when fetch is aborted', async () => {
    const contract = testContract({ id: 'timeout-001', timeout_ms: 50 });

    const fetchMock = mock((_url: string, init: any) => {
      return new Promise((_resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('timeout')),
          200,
        );
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }
      });
    });
    const origFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as any;

    try {
      await executeWorkerTask(contract, resultsDir);

      const resultPath = path.join(resultsDir, 'timeout-001.json');
      const state = readTaskState(resultPath);
      expect(state).not.toBeNull();
      expect(state!.status).toBe('timeout');
      expect(state!.error).toBeDefined();
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('writes failed result when worker returns invalid JSON for json outputFormat', async () => {
    const contract = testContract({ id: 'parse-fail-001' });
    const mockResponse = {
      choices: [{ message: { content: 'not valid json at all' } }],
    };

    const fetchMock = mock(() =>
      Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 })),
    );
    const origFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as any;

    try {
      await executeWorkerTask(contract, resultsDir);

      const resultPath = path.join(resultsDir, 'parse-fail-001.json');
      const state = readTaskState(resultPath);
      expect(state).not.toBeNull();
      expect(state!.status).toBe('failed');
      expect(state!.result).toBeDefined();
      expect(state!.error).toContain('JSON');
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
