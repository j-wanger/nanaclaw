import { describe, it, expect } from 'bun:test';

import type { T0Check } from './contract.js';
import { verify } from './verification.js';

describe('verify', () => {
  describe('json-valid check', () => {
    it('passes for valid JSON', () => {
      const result = verify('{"a": 1}', [{ type: 'json-valid', params: {} }]);
      expect(result.passed).toBe(true);
      expect(result.checks[0].passed).toBe(true);
    });

    it('fails for invalid JSON', () => {
      const result = verify('{bad}', [{ type: 'json-valid', params: {} }]);
      expect(result.passed).toBe(false);
      expect(result.checks[0].passed).toBe(false);
      expect(result.checks[0].detail).toBeDefined();
    });
  });

  describe('contains check', () => {
    it('passes when substring is present', () => {
      const result = verify('hello world', [{ type: 'contains', params: { substring: 'world' } }]);
      expect(result.passed).toBe(true);
    });

    it('fails when substring is absent', () => {
      const result = verify('hello world', [{ type: 'contains', params: { substring: 'foobar' } }]);
      expect(result.passed).toBe(false);
      expect(result.checks[0].detail).toContain('foobar');
    });
  });

  describe('regex check', () => {
    it('passes when pattern matches', () => {
      const result = verify('version: 2.0.13', [{ type: 'regex', params: { pattern: 'version:\\s*\\d+\\.\\d+' } }]);
      expect(result.passed).toBe(true);
    });

    it('fails when pattern does not match', () => {
      const result = verify('no version here', [{ type: 'regex', params: { pattern: '^\\d+$' } }]);
      expect(result.passed).toBe(false);
    });
  });

  describe('line-count check', () => {
    it('passes when within min-max bounds', () => {
      const text = 'line1\nline2\nline3';
      const result = verify(text, [{ type: 'line-count', params: { min: '1', max: '5' } }]);
      expect(result.passed).toBe(true);
    });

    it('fails when below min', () => {
      const result = verify('one line', [{ type: 'line-count', params: { min: '3', max: '10' } }]);
      expect(result.passed).toBe(false);
    });

    it('fails when above max', () => {
      const text = Array(20).fill('line').join('\n');
      const result = verify(text, [{ type: 'line-count', params: { min: '1', max: '5' } }]);
      expect(result.passed).toBe(false);
    });

    it('works with only min', () => {
      const result = verify('a\nb\nc', [{ type: 'line-count', params: { min: '2' } }]);
      expect(result.passed).toBe(true);
    });

    it('works with only max', () => {
      const result = verify('a\nb\nc', [{ type: 'line-count', params: { max: '10' } }]);
      expect(result.passed).toBe(true);
    });
  });

  describe('not-contains check', () => {
    it('passes when substring is absent', () => {
      const result = verify('clean output', [{ type: 'not-contains', params: { substring: 'error' } }]);
      expect(result.passed).toBe(true);
    });

    it('fails when substring is present', () => {
      const result = verify('output with error message', [{ type: 'not-contains', params: { substring: 'error' } }]);
      expect(result.passed).toBe(false);
      expect(result.checks[0].detail).toContain('error');
    });
  });

  describe('AND composition', () => {
    it('passes when all checks pass', () => {
      const checks: T0Check[] = [
        { type: 'json-valid', params: {} },
        { type: 'contains', params: { substring: 'name' } },
      ];
      const result = verify('{"name": "test"}', checks);
      expect(result.passed).toBe(true);
      expect(result.checks).toHaveLength(2);
      expect(result.checks.every((c) => c.passed)).toBe(true);
    });

    it('fails when any check fails', () => {
      const checks: T0Check[] = [
        { type: 'json-valid', params: {} },
        { type: 'contains', params: { substring: 'missing' } },
      ];
      const result = verify('{"name": "test"}', checks);
      expect(result.passed).toBe(false);
      expect(result.checks[0].passed).toBe(true);
      expect(result.checks[1].passed).toBe(false);
    });
  });

  describe('empty postconditions', () => {
    it('passes trivially with no checks', () => {
      const result = verify('anything', []);
      expect(result.passed).toBe(true);
      expect(result.checks).toHaveLength(0);
    });
  });

  describe('implicit json-valid for json outputFormat', () => {
    it('adds json-valid check when outputFormat is json and no explicit postconditions', () => {
      const result = verify('{"valid": true}', [], 'json');
      expect(result.passed).toBe(true);
      expect(result.checks).toHaveLength(1);
      expect(result.checks[0].type).toBe('json-valid');
    });

    it('fails implicit json-valid for invalid JSON', () => {
      const result = verify('{invalid}', [], 'json');
      expect(result.passed).toBe(false);
    });

    it('does not add implicit check when explicit postconditions exist', () => {
      const checks: T0Check[] = [{ type: 'contains', params: { substring: 'test' } }];
      const result = verify('test', checks, 'json');
      expect(result.checks).toHaveLength(1);
      expect(result.checks[0].type).toBe('contains');
    });

    it('does not add implicit check for non-json format', () => {
      const result = verify('not json', [], 'code');
      expect(result.passed).toBe(true);
      expect(result.checks).toHaveLength(0);
    });
  });
});
