import { describe, it, expect, beforeAll, afterEach, mock } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { registerTools } from '../server.js';
import type { McpToolDefinition } from '../types.js';
import { executeWorkerTask } from './dispatch.js';
import type { TaskContract, TaskState } from './contract.js';

let tmpDir: string;

beforeAll(() => {
  registerTools([
    {
      tool: {
        name: 'e2e_search',
        description: 'E2E test search',
        inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      },
      async handler(args) {
        return { content: [{ type: 'text', text: JSON.stringify([{ title: 'Test Result', url: 'https://test.com', snippet: `Found: ${args.query}` }]) }] };
      },
    } as McpToolDefinition,
  ]);
});

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

describe('E2E: dispatch with tools → agent loop → result file', () => {
  it('dispatches tool-calling worker and produces result with tool trace', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worker-e2e-'));
    const resultsDir = path.join(tmpDir, 'worker-results');
    fs.mkdirSync(resultsDir, { recursive: true });

    // Mock fetch: iteration 1 calls tool, iteration 2 returns final text
    let callCount = 0;
    // @ts-ignore
    globalThis.fetch = mock(async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: '',
              tool_calls: [{
                id: 'call_e2e_1',
                type: 'function',
                function: { name: 'e2e_search', arguments: '{"query":"test topic"}' },
              }],
            },
          }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        choices: [{ message: { content: '## Key Findings\n\n- Test result found\n\n## Sources\n\n| # | Title | URL |\n|---|-------|-----|\n| 1 | Test Result | https://test.com |' } }],
      }), { status: 200 });
    });

    const contract: TaskContract = {
      id: 'e2e-tool-test-001',
      type: 'research',
      objective: 'Search for test topic and synthesize findings',
      outputFormat: 'markdown',
      context: '',
      boundaries: [],
      postconditions: [
        { type: 'contains', params: { substring: '## Key Findings' } },
      ],
      timeout_ms: 30000,
      context_budget_tokens: 4096,
      tools: ['e2e_search'],
    };

    await executeWorkerTask(contract, resultsDir);

    // Verify result file exists
    const resultPath = path.join(resultsDir, `${contract.id}.json`);
    expect(fs.existsSync(resultPath)).toBe(true);

    // Parse and verify result
    const state = JSON.parse(fs.readFileSync(resultPath, 'utf8')) as TaskState;
    expect(state.status).toBe('completed');
    expect(state.result?.parsed).toContain('Key Findings');
    expect(state.verification?.passed).toBe(true);
  });

  it('single-shot worker still works without tools field', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worker-e2e-single-'));
    const resultsDir = path.join(tmpDir, 'worker-results');
    fs.mkdirSync(resultsDir, { recursive: true });

    // @ts-ignore
    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"result": "hello"}' } }],
      }), { status: 200 });
    });

    const contract: TaskContract = {
      id: 'e2e-single-shot-001',
      type: 'structured-output',
      objective: 'Return a JSON object with result field',
      outputFormat: 'json',
      context: '',
      boundaries: [],
      postconditions: [
        { type: 'json-valid', params: {} },
      ],
      timeout_ms: 10000,
      context_budget_tokens: 4096,
      // No tools field — single-shot mode
    };

    await executeWorkerTask(contract, resultsDir);

    const resultPath = path.join(resultsDir, `${contract.id}.json`);
    const state = JSON.parse(fs.readFileSync(resultPath, 'utf8')) as TaskState;
    expect(state.status).toBe('completed');
    expect(state.verification?.passed).toBe(true);
  });

  it('fails gracefully when tools field has unknown tool', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worker-e2e-unknown-'));
    const resultsDir = path.join(tmpDir, 'worker-results');
    fs.mkdirSync(resultsDir, { recursive: true });

    const contract: TaskContract = {
      id: 'e2e-unknown-tool-001',
      type: 'research',
      objective: 'Test with unknown tool',
      outputFormat: 'markdown',
      context: '',
      boundaries: [],
      postconditions: [],
      timeout_ms: 10000,
      context_budget_tokens: 4096,
      tools: ['nonexistent_tool'],
    };

    await executeWorkerTask(contract, resultsDir);

    const resultPath = path.join(resultsDir, `${contract.id}.json`);
    const state = JSON.parse(fs.readFileSync(resultPath, 'utf8')) as TaskState;
    expect(state.status).toBe('failed');
    expect(state.error).toContain('Tool registry errors');
  });
});
