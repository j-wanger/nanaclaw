import { describe, it, expect, beforeAll } from 'bun:test';

import { registerTools } from '../server.js';
import type { McpToolDefinition } from '../types.js';
import { buildToolDefinitions, executeTool } from './tool-registry.js';

const mockSearchTool: McpToolDefinition = {
  tool: {
    name: 'test_search',
    description: 'Test search tool',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        max_results: { type: 'number', description: 'Max results' },
      },
      required: ['query'],
    },
  },
  async handler(args) {
    return { content: [{ type: 'text', text: `searched: ${args.query}` }] };
  },
};

const mockExtractTool: McpToolDefinition = {
  tool: {
    name: 'test_extract',
    description: 'Test extract tool',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to extract' },
      },
      required: ['url'],
    },
  },
  async handler(args) {
    return { content: [{ type: 'text', text: `extracted: ${args.url}` }] };
  },
};

beforeAll(() => {
  registerTools([mockSearchTool, mockExtractTool]);
});

describe('buildToolDefinitions', () => {
  it('returns correct definitions for known tools', () => {
    const result = buildToolDefinitions(['test_search', 'test_extract']);
    expect(result.errors).toHaveLength(0);
    expect(result.definitions).toHaveLength(2);
    expect(result.definitions[0].type).toBe('function');
    expect(result.definitions[0].function.name).toBe('test_search');
    expect(result.definitions[0].function.description).toBe('Test search tool');
    expect(result.definitions[0].function.parameters).toHaveProperty('properties');
  });

  it('returns error for unknown tool names', () => {
    const result = buildToolDefinitions(['test_search', 'nonexistent_tool']);
    expect(result.definitions).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('nonexistent_tool');
  });

  it('returns empty array for empty tools field (single-shot mode)', () => {
    const result = buildToolDefinitions([]);
    expect(result.definitions).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('returns subset matching only requested tools', () => {
    const result = buildToolDefinitions(['test_extract']);
    expect(result.definitions).toHaveLength(1);
    expect(result.definitions[0].function.name).toBe('test_extract');
  });

  it('produces valid OpenAI function-calling format', () => {
    const result = buildToolDefinitions(['test_search']);
    const def = result.definitions[0];
    expect(def).toHaveProperty('type', 'function');
    expect(def.function).toHaveProperty('name');
    expect(def.function).toHaveProperty('description');
    expect(def.function).toHaveProperty('parameters');
    expect(def.function.parameters).toHaveProperty('type', 'object');
  });
});

describe('executeTool', () => {
  it('executes a registered tool and returns result', async () => {
    const result = await executeTool('test_search', { query: 'hello' });
    expect(result.content[0]).toHaveProperty('text', 'searched: hello');
  });

  it('returns error for unknown tool', async () => {
    const result = await executeTool('nonexistent', {});
    expect(result.isError).toBe(true);
    expect(result.content[0]).toHaveProperty('text');
    expect((result.content[0] as { text: string }).text).toContain('not found');
  });
});
