import { describe, it, expect } from 'bun:test';

import { parseWorkerResult } from './result-parser.js';

describe('parseWorkerResult', () => {
  describe('code output', () => {
    it('strips triple-backtick fences', () => {
      const raw = '```typescript\nfunction foo() { return 1; }\n```';
      const result = parseWorkerResult(raw, 'code');
      expect(result.ok).toBe(true);
      expect(result.parsed).toBe('function foo() { return 1; }');
    });

    it('strips fences without language tag', () => {
      const raw = '```\nconst x = 42;\n```';
      const result = parseWorkerResult(raw, 'code');
      expect(result.ok).toBe(true);
      expect(result.parsed).toBe('const x = 42;');
    });

    it('passes through code without fences', () => {
      const raw = 'function bar() { return 2; }';
      const result = parseWorkerResult(raw, 'code');
      expect(result.ok).toBe(true);
      expect(result.parsed).toBe(raw);
    });

    it('strips only outer fences, preserves inner content', () => {
      const raw = '```ts\nconst tpl = `hello ${name}`;\n```';
      const result = parseWorkerResult(raw, 'code');
      expect(result.ok).toBe(true);
      expect(result.parsed).toContain('`hello ${name}`');
    });
  });

  describe('json output', () => {
    it('validates valid JSON', () => {
      const raw = '{"name": "test", "value": 42}';
      const result = parseWorkerResult(raw, 'json');
      expect(result.ok).toBe(true);
      expect(result.parsed).toBe(raw);
    });

    it('strips fences before validating JSON', () => {
      const raw = '```json\n{"name": "test"}\n```';
      const result = parseWorkerResult(raw, 'json');
      expect(result.ok).toBe(true);
      expect(result.parsed).toBe('{"name": "test"}');
    });

    it('returns error for invalid JSON', () => {
      const raw = '{invalid json}';
      const result = parseWorkerResult(raw, 'json');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('JSON');
    });
  });

  describe('markdown output', () => {
    it('passes through unchanged', () => {
      const raw = '# Header\n\nSome **bold** text.';
      const result = parseWorkerResult(raw, 'markdown');
      expect(result.ok).toBe(true);
      expect(result.parsed).toBe(raw);
    });
  });

  describe('error handling', () => {
    it('returns error for empty response', () => {
      const result = parseWorkerResult('', 'code');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('returns error for whitespace-only response', () => {
      const result = parseWorkerResult('   \n  ', 'json');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('empty');
    });
  });
});
