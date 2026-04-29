import { describe, it, expect } from 'bun:test';

import type { TaskContract } from './contract.js';
import { buildWorkerPrompt } from './prompt-builder.js';

function baseContract(overrides: Partial<TaskContract> = {}): TaskContract {
  return {
    id: 'test-001',
    type: 'code-impl',
    objective: 'Implement a CSV parser that handles quoted fields',
    outputFormat: 'code',
    context: 'export function parseCsv(input: string): string[][] { }',
    boundaries: ['Do not add dependencies', 'Do not modify exports'],
    postconditions: [],
    timeout_ms: 30_000,
    context_budget_tokens: 4096,
    ...overrides,
  };
}

describe('buildWorkerPrompt', () => {
  it('returns system and user message pair', () => {
    const result = buildWorkerPrompt(baseContract());
    expect(result.system).toBeDefined();
    expect(result.user).toBeDefined();
    expect(typeof result.system).toBe('string');
    expect(typeof result.user).toBe('string');
  });

  it('includes objective in user message', () => {
    const result = buildWorkerPrompt(baseContract());
    expect(result.user).toContain('Implement a CSV parser');
  });

  it('includes context in user message', () => {
    const result = buildWorkerPrompt(baseContract());
    expect(result.user).toContain('parseCsv');
  });

  it('includes boundaries in system prompt', () => {
    const result = buildWorkerPrompt(baseContract());
    expect(result.system).toContain('Do not add dependencies');
    expect(result.system).toContain('Do not modify exports');
  });

  describe('outputFormat-specific system prompts', () => {
    it('json format instructs JSON-only output', () => {
      const result = buildWorkerPrompt(baseContract({ outputFormat: 'json' }));
      expect(result.system.toLowerCase()).toContain('output only valid json');
    });

    it('code format instructs code-only output', () => {
      const result = buildWorkerPrompt(baseContract({ outputFormat: 'code' }));
      expect(result.system.toLowerCase()).toContain('output only the code');
    });

    it('markdown format has no restrictive output instruction', () => {
      const result = buildWorkerPrompt(baseContract({ outputFormat: 'markdown' }));
      expect(result.system.toLowerCase()).not.toContain('output only');
    });
  });

  it('trims context to context_budget_tokens', () => {
    const longContext = 'a'.repeat(50_000);
    const result = buildWorkerPrompt(baseContract({ context: longContext, context_budget_tokens: 1024 }));
    expect(result.user.length).toBeLessThan(longContext.length);
  });

  it('preserves short context within budget', () => {
    const shortContext = 'function foo() { return 1; }';
    const result = buildWorkerPrompt(baseContract({ context: shortContext, context_budget_tokens: 8192 }));
    expect(result.user).toContain(shortContext);
  });

  it('handles empty boundaries', () => {
    const result = buildWorkerPrompt(baseContract({ boundaries: [] }));
    expect(result.system).toBeDefined();
  });

  it('handles empty context', () => {
    const result = buildWorkerPrompt(baseContract({ context: '' }));
    expect(result.user).toContain('Implement a CSV parser');
  });

  describe('iteration-aware research prompt', () => {
    it('includes tool routing guidance for research type with tools', () => {
      const result = buildWorkerPrompt(baseContract({
        type: 'research',
        outputFormat: 'markdown',
        tools: ['web_search', 'web_extract', 'wiki_write'],
      }));
      expect(result.system).toContain('wiki_write');
      expect(result.system).toContain('search');
    });

    it('does not include research guidance for non-research type with tools', () => {
      const result = buildWorkerPrompt(baseContract({
        type: 'code-impl',
        tools: ['web_search', 'web_extract'],
      }));
      expect(result.system).not.toContain('wiki_write');
    });

    it('does not include tool routing for contracts without tools', () => {
      const result = buildWorkerPrompt(baseContract({ type: 'research' }));
      const baseResult = buildWorkerPrompt(baseContract({ type: 'research', tools: undefined }));
      expect(result.system).toBe(baseResult.system);
    });
  });
});
