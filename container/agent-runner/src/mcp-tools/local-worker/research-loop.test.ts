import { describe, it, expect, beforeAll, beforeEach, afterEach, mock } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { registerTools } from '../server.js';
import type { McpToolDefinition } from '../types.js';
import { executeWorkerTask } from './dispatch.js';
import type { TaskContract, TaskState } from './contract.js';

let tmpDir: string;
let wikiDir: string;
let wikisJsonPath: string;
const origFetch = globalThis.fetch;

beforeAll(async () => {
  registerTools([
    {
      tool: {
        name: 'rl_web_search',
        description: 'Search the web',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            max_results: { type: 'number' },
          },
          required: ['query'],
        },
      },
      async handler(args) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify([
              { title: 'Research Article', url: 'https://example.com/article', snippet: `Results for: ${args.query}` },
              { title: 'Study Report', url: 'https://example.com/study', snippet: 'Relevant study data' },
            ]),
          }],
        };
      },
    } as McpToolDefinition,
    {
      tool: {
        name: 'rl_web_extract',
        description: 'Extract content from URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            max_chars: { type: 'number' },
          },
          required: ['url'],
        },
      },
      async handler(args) {
        return {
          content: [{
            type: 'text',
            text: `# Extracted Content from ${args.url}\n\nKey finding: automated research pipelines improve knowledge capture by 3x.\n\nSource: Research Lab 2026`,
          }],
        };
      },
    } as McpToolDefinition,
  ]);

  await import('../wiki-write.js');
});

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'research-loop-test-'));

  wikiDir = path.join(tmpDir, 'test-wiki');
  fs.mkdirSync(path.join(wikiDir, 'inbox'), { recursive: true });

  wikisJsonPath = path.join(tmpDir, 'wikis.json');
  fs.writeFileSync(wikisJsonPath, JSON.stringify({
    version: 1,
    wikis: [{
      name: 'test-wiki',
      path: wikiDir,
      description: 'Test wiki for research loop integration tests',
    }],
  }));
  process.env.WIKIS_JSON_PATH = wikisJsonPath;
});

afterEach(() => {
  globalThis.fetch = origFetch;
  delete process.env.WIKIS_JSON_PATH;
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

describe('Research loop integration', () => {
  it('worker with tools dispatches research pipeline and writes episodic wiki entry', async () => {
    const resultsDir = path.join(tmpDir, 'worker-results');
    fs.mkdirSync(resultsDir, { recursive: true });

    let inferenceCallCount = 0;
    // @ts-ignore
    globalThis.fetch = mock(async (url: string | URL) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      // Only inference calls hit fetch — tool handlers are called directly
      inferenceCallCount++;

      if (inferenceCallCount === 1) {
        // First inference: model decides to call web_search
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: '',
              tool_calls: [{
                id: 'call_search_1',
                type: 'function',
                function: { name: 'rl_web_search', arguments: '{"query":"automated research pipelines"}' },
              }],
            },
          }],
        }), { status: 200 });
      }

      if (inferenceCallCount === 2) {
        // Second inference: model decides to extract content
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: '',
              tool_calls: [{
                id: 'call_extract_1',
                type: 'function',
                function: { name: 'rl_web_extract', arguments: '{"url":"https://example.com/article","max_chars":8000}' },
              }],
            },
          }],
        }), { status: 200 });
      }

      if (inferenceCallCount === 3) {
        // Third inference: model writes to wiki with episodic tier
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: '',
              tool_calls: [{
                id: 'call_wiki_1',
                type: 'function',
                function: {
                  name: 'wiki_write',
                  arguments: JSON.stringify({
                    title: 'Automated Research Pipelines',
                    content: '## Key Findings\n\n- Automated pipelines improve knowledge capture by 3x\n\n## Sources\n\n| # | Title | URL |\n|---|-------|-----|\n| 1 | Research Article | https://example.com/article |',
                    tags: ['research', 'automation'],
                    tier: 'episodic',
                    worker_id: 'e2e-research-001',
                    task_id: 'sched-task-001',
                  }),
                },
              }],
            },
          }],
        }), { status: 200 });
      }

      // Fourth inference: final synthesis response
      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: 'Research complete. Written to test-wiki/episodic/automated-research-pipelines.md. Key finding: automated pipelines improve knowledge capture by 3x.',
          },
        }],
      }), { status: 200 });
    });

    const contract: TaskContract = {
      id: 'e2e-research-001',
      type: 'research',
      objective: 'Research automated research pipelines. Search, extract, synthesize, write to wiki with episodic tier.',
      outputFormat: 'markdown',
      context: 'Topic: automated research pipelines for AI agents',
      boundaries: ['Limit to 2 sources', 'Write ONE episodic wiki entry'],
      postconditions: [
        { type: 'contains', params: { substring: 'Research complete' } },
      ],
      timeout_ms: 30000,
      context_budget_tokens: 6000,
      tools: ['rl_web_search', 'rl_web_extract', 'wiki_write'],
    };

    await executeWorkerTask(contract, resultsDir);

    // Verify result file
    const resultPath = path.join(resultsDir, `${contract.id}.json`);
    expect(fs.existsSync(resultPath)).toBe(true);

    const state = JSON.parse(fs.readFileSync(resultPath, 'utf8')) as TaskState;
    expect(state.status).toBe('completed');
    expect(state.result?.parsed).toContain('Research complete');

    // Verify episodic wiki entry was created
    const episodicDir = path.join(wikiDir, 'episodic');
    expect(fs.existsSync(episodicDir)).toBe(true);

    const episodicFiles = fs.readdirSync(episodicDir);
    expect(episodicFiles.length).toBe(1);

    const entryContent = fs.readFileSync(path.join(episodicDir, episodicFiles[0]), 'utf8');
    expect(entryContent).toContain('tier: episodic');
    expect(entryContent).toContain('worker_id: e2e-research-001');
    expect(entryContent).toContain('task_id: sched-task-001');
    expect(entryContent).toContain('source: worker-research');
    expect(entryContent).toContain('## Key Findings');
  });

  it('worker result includes wiki output path for notification', async () => {
    const resultsDir = path.join(tmpDir, 'worker-results');
    fs.mkdirSync(resultsDir, { recursive: true });

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
                id: 'call_wiki_direct',
                type: 'function',
                function: {
                  name: 'wiki_write',
                  arguments: JSON.stringify({
                    title: 'Direct Wiki Test',
                    content: 'Test content',
                    tags: ['test'],
                    tier: 'episodic',
                    worker_id: 'e2e-notify-001',
                  }),
                },
              }],
            },
          }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'Written to test-wiki/episodic/direct-wiki-test.md' } }],
      }), { status: 200 });
    });

    const contract: TaskContract = {
      id: 'e2e-notify-001',
      type: 'research',
      objective: 'Write a wiki entry and report the path',
      outputFormat: 'markdown',
      context: '',
      boundaries: [],
      postconditions: [],
      timeout_ms: 30000,
      context_budget_tokens: 6000,
      tools: ['wiki_write'],
    };

    await executeWorkerTask(contract, resultsDir);

    const state = JSON.parse(fs.readFileSync(path.join(resultsDir, `${contract.id}.json`), 'utf8')) as TaskState;
    expect(state.status).toBe('completed');
    expect(state.result?.parsed).toContain('test-wiki/episodic/');
  });
});
