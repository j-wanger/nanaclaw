import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import type { TaskContract, TaskState } from './contract.js';
import { writeTaskState } from './contract.js';
import { handleDispatchWorker, handleGetWorkerStatus, handleCancelWorker } from './tools.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tools-test-'));
  process.env.NANOCLAW_AGENT_DIR = tmpDir;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.NANOCLAW_AGENT_DIR;
});

function validArgs() {
  return {
    type: 'structured-output',
    objective: 'Generate a JSON object',
    outputFormat: 'json',
    context: '',
    boundaries: [],
    postconditions: [],
    timeout_ms: 30_000,
    context_budget_tokens: 4096,
  };
}

describe('handleDispatchWorker', () => {
  it('returns immediately with a task ID', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = mock(() =>
      new Promise(() => {}), // never resolves — proves we return before fetch completes
    ) as any;

    try {
      const result = await handleDispatchWorker(validArgs());
      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;
      expect(text).toContain('dispatched');

      const taskFiles = fs.readdirSync(path.join(tmpDir, 'worker-tasks'));
      expect(taskFiles.length).toBe(1);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('passes tools field through to the TaskContract', async () => {
    const origFetch = globalThis.fetch;
    // Quick-resolving mock — background worker with tools enters the agent loop
    // and would block the semaphore if fetch never resolves
    globalThis.fetch = mock(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'done' } }] }), { status: 200 }),
    ) as any;

    try {
      const args = {
        ...validArgs(),
        tools: ['web_search', 'web_extract', 'wiki_write'],
      };
      await handleDispatchWorker(args);

      const tasksDir = path.join(tmpDir, 'worker-tasks');
      const files = fs.readdirSync(tasksDir);
      expect(files.length).toBe(1);

      const state = JSON.parse(fs.readFileSync(path.join(tasksDir, files[0]), 'utf8')) as TaskState;
      expect(state.contract.tools).toEqual(['web_search', 'web_extract', 'wiki_write']);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('omits tools field when not provided', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = mock(() =>
      new Promise(() => {}),
    ) as any;

    try {
      await handleDispatchWorker(validArgs());

      const tasksDir = path.join(tmpDir, 'worker-tasks');
      const files = fs.readdirSync(tasksDir);
      const state = JSON.parse(fs.readFileSync(path.join(tasksDir, files[0]), 'utf8')) as TaskState;
      expect(state.contract.tools).toBeUndefined();
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

describe('handleGetWorkerStatus', () => {
  it('returns pending for a dispatched task with no result', async () => {
    const tasksDir = path.join(tmpDir, 'worker-tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    const state: TaskState = {
      contract: { ...validArgs(), id: 'status-001' } as TaskContract,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    writeTaskState(path.join(tasksDir, 'status-001.json'), state);

    const result = await handleGetWorkerStatus({ task_id: 'status-001' });
    const text = result.content[0].text;
    expect(text).toContain('pending');
  });

  it('returns completed with result summary', async () => {
    const resultsDir = path.join(tmpDir, 'worker-results');
    fs.mkdirSync(resultsDir, { recursive: true });
    const state: TaskState = {
      contract: { ...validArgs(), id: 'done-001' } as TaskContract,
      status: 'completed',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      result: { raw: '{"ok": true}', parsed: '{"ok": true}' },
      verification: { passed: true, checks: [] },
    };
    writeTaskState(path.join(resultsDir, 'done-001.json'), state);

    const result = await handleGetWorkerStatus({ task_id: 'done-001' });
    const text = result.content[0].text;
    expect(text).toContain('completed');
  });

  it('lists all tasks when no task_id provided', async () => {
    const tasksDir = path.join(tmpDir, 'worker-tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    for (const id of ['a', 'b']) {
      writeTaskState(path.join(tasksDir, `${id}.json`), {
        contract: { ...validArgs(), id } as TaskContract,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    }

    const result = await handleGetWorkerStatus({});
    const text = result.content[0].text;
    expect(text).toContain('a');
    expect(text).toContain('b');
  });
});

describe('handleCancelWorker', () => {
  it('marks a pending task as cancelled', async () => {
    const tasksDir = path.join(tmpDir, 'worker-tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    writeTaskState(path.join(tasksDir, 'cancel-001.json'), {
      contract: { ...validArgs(), id: 'cancel-001' } as TaskContract,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    const result = await handleCancelWorker({ task_id: 'cancel-001' });
    const text = result.content[0].text;
    expect(text).toContain('cancelled');

    const state = JSON.parse(fs.readFileSync(path.join(tasksDir, 'cancel-001.json'), 'utf8'));
    expect(state.status).toBe('cancelled');
  });

  it('returns error for non-existent task', async () => {
    const result = await handleCancelWorker({ task_id: 'nope' });
    const text = result.content[0].text;
    expect(text).toContain('not found');
  });
});
