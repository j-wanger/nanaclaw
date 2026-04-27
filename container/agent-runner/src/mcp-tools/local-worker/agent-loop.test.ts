import { describe, it, expect, beforeAll, afterEach, mock } from 'bun:test';

import { registerTools } from '../server.js';
import type { McpToolDefinition } from '../types.js';
import { buildToolDefinitions } from './tool-registry.js';
import { executeAgentLoop, type AgentLoopConfig } from './agent-loop.js';

// Register test tools before tests
const searchHandler = mock(async (args: Record<string, unknown>) => ({
  content: [{ type: 'text' as const, text: JSON.stringify([{ title: 'Result 1', url: 'https://example.com', snippet: `Found: ${args.query}` }]) }],
}));

const extractHandler = mock(async (args: Record<string, unknown>) => ({
  content: [{ type: 'text' as const, text: `Extracted content from ${args.url}` }],
}));

const failingHandler = mock(async () => {
  throw new Error('Tool execution failed');
});

beforeAll(() => {
  registerTools([
    {
      tool: {
        name: 'mock_search',
        description: 'Mock search',
        inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      },
      handler: searchHandler,
    } as McpToolDefinition,
    {
      tool: {
        name: 'mock_extract',
        description: 'Mock extract',
        inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
      },
      handler: extractHandler,
    } as McpToolDefinition,
    {
      tool: {
        name: 'mock_failing',
        description: 'Always fails',
        inputSchema: { type: 'object', properties: {} },
      },
      handler: failingHandler,
    } as McpToolDefinition,
  ]);
});

// Mock fetch for all tests
let fetchMock: ReturnType<typeof mock>;
let fetchCallCount = 0;
let fetchResponses: Array<Record<string, unknown>> = [];

function mockFetchResponse(response: Record<string, unknown>) {
  fetchResponses.push(response);
}

function setupFetch() {
  fetchCallCount = 0;
  fetchResponses = [];
  fetchMock = mock(async () => {
    const idx = fetchCallCount++;
    const resp = fetchResponses[idx] ?? fetchResponses[fetchResponses.length - 1];
    return new Response(JSON.stringify(resp), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  // @ts-ignore - override global fetch
  globalThis.fetch = fetchMock;
}

afterEach(() => {
  fetchResponses = [];
  fetchCallCount = 0;
});

function makeConfig(overrides: Partial<AgentLoopConfig> = {}): AgentLoopConfig {
  const { definitions } = buildToolDefinitions(['mock_search', 'mock_extract']);
  return {
    messages: [
      { role: 'system', content: 'You are a research assistant.' },
      { role: 'user', content: 'Search for quantum computing.' },
    ],
    tools: definitions,
    maxIterations: 10,
    timeoutMs: 30000,
    ...overrides,
  };
}

describe('executeAgentLoop', () => {
  it('returns final text when model produces no tool calls', async () => {
    setupFetch();
    mockFetchResponse({
      choices: [{ message: { content: 'Here is my answer about quantum computing.', tool_calls: null } }],
    });

    const result = await executeAgentLoop(makeConfig());

    expect(result.terminationReason).toBe('complete');
    expect(result.output).toContain('quantum computing');
    expect(result.iterations).toBe(1);
    expect(result.toolTrace).toHaveLength(0);
  });

  it('executes single tool and re-queries with result', async () => {
    setupFetch();
    // First call: model calls mock_search
    mockFetchResponse({
      choices: [{
        message: {
          content: '',
          tool_calls: [{
            id: 'call_1',
            type: 'function',
            function: { name: 'mock_search', arguments: '{"query":"quantum computing"}' },
          }],
        },
      }],
    });
    // Second call: model produces final answer
    mockFetchResponse({
      choices: [{ message: { content: 'Based on search results: quantum computing is advancing.' } }],
    });

    const result = await executeAgentLoop(makeConfig());

    expect(result.terminationReason).toBe('complete');
    expect(result.iterations).toBe(2);
    expect(result.toolTrace).toHaveLength(1);
    expect(result.toolTrace[0].tool).toBe('mock_search');
    expect(searchHandler).toHaveBeenCalledTimes(1);
  });

  it('handles chained tool calls (2+ iterations)', async () => {
    setupFetch();
    // Iteration 1: search
    mockFetchResponse({
      choices: [{
        message: {
          content: '',
          tool_calls: [{
            id: 'call_1',
            type: 'function',
            function: { name: 'mock_search', arguments: '{"query":"graph rag"}' },
          }],
        },
      }],
    });
    // Iteration 2: extract from URL in search results
    mockFetchResponse({
      choices: [{
        message: {
          content: '',
          tool_calls: [{
            id: 'call_2',
            type: 'function',
            function: { name: 'mock_extract', arguments: '{"url":"https://example.com"}' },
          }],
        },
      }],
    });
    // Iteration 3: final answer
    mockFetchResponse({
      choices: [{ message: { content: 'Synthesis: graph RAG uses knowledge graphs.' } }],
    });

    const result = await executeAgentLoop(makeConfig());

    expect(result.terminationReason).toBe('complete');
    expect(result.iterations).toBe(3);
    expect(result.toolTrace).toHaveLength(2);
    expect(result.toolTrace[0].tool).toBe('mock_search');
    expect(result.toolTrace[1].tool).toBe('mock_extract');
  });

  it('terminates at max_iterations with partial result', async () => {
    setupFetch();
    // Model keeps calling tools indefinitely
    for (let i = 0; i < 5; i++) {
      mockFetchResponse({
        choices: [{
          message: {
            content: '',
            tool_calls: [{
              id: `call_${i}`,
              type: 'function',
              function: { name: 'mock_search', arguments: `{"query":"attempt ${i}"}` },
            }],
          },
        }],
      });
    }

    const result = await executeAgentLoop(makeConfig({ maxIterations: 3 }));

    expect(result.terminationReason).toBe('max_iterations');
    expect(result.iterations).toBe(3);
    expect(result.toolTrace).toHaveLength(3);
  });

  it('terminates at timeout_ms with partial result', async () => {
    setupFetch();
    // Simulate slow response by replacing fetch with a delayed version
    // @ts-ignore
    globalThis.fetch = mock(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: '',
            tool_calls: [{
              id: 'call_slow',
              type: 'function',
              function: { name: 'mock_search', arguments: '{"query":"slow"}' },
            }],
          },
        }],
      }), { status: 200 });
    });

    const result = await executeAgentLoop(makeConfig({ timeoutMs: 150, maxIterations: 20 }));

    expect(['timeout', 'complete']).toContain(result.terminationReason);
    expect(result.iterations).toBeGreaterThanOrEqual(1);
  });

  it('handles tool execution error gracefully', async () => {
    setupFetch();
    // Model calls the failing tool
    mockFetchResponse({
      choices: [{
        message: {
          content: '',
          tool_calls: [{
            id: 'call_fail',
            type: 'function',
            function: { name: 'mock_failing', arguments: '{}' },
          }],
        },
      }],
    });
    // After error, model produces final answer
    mockFetchResponse({
      choices: [{ message: { content: 'The tool failed, but I can still respond.' } }],
    });

    const result = await executeAgentLoop(makeConfig());

    expect(result.terminationReason).toBe('complete');
    expect(result.iterations).toBe(2);
    expect(result.toolTrace).toHaveLength(1);
    expect(result.toolTrace[0].result).toContain('Error executing');
    expect(result.output).toContain('tool failed');
  });
});
