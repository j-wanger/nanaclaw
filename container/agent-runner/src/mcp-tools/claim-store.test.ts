import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { extractClaims, appendClaims, extractInsights, appendInsights } from './claim-store.js';

describe('extractClaims', () => {
  test('extracts [CLAIM] lines from markdown', () => {
    const text = `## Claims\n\n- [CLAIM] TD Bank fined $3B for BSA violations\n- [CLAIM] FATF placed Myanmar on grey list\n\n## Source\n`;
    const claims = extractClaims(text);
    expect(claims).toHaveLength(2);
    expect(claims[0]).toBe('TD Bank fined $3B for BSA violations');
    expect(claims[1]).toBe('FATF placed Myanmar on grey list');
  });

  test('returns empty array when no claims', () => {
    const text = `## Summary\n\nJust a summary.\n\n## Key Points\n\n- Point 1\n`;
    expect(extractClaims(text)).toHaveLength(0);
  });

  test('handles claims with special characters', () => {
    const text = `- [CLAIM] Fine was $3.5B (USD) — largest in 2025\n`;
    const claims = extractClaims(text);
    expect(claims).toHaveLength(1);
    expect(claims[0]).toContain('$3.5B');
  });

  test('skips empty claim lines', () => {
    const text = `- [CLAIM] Valid claim\n- [CLAIM]   \n- [CLAIM] Another valid\n`;
    const claims = extractClaims(text);
    expect(claims).toHaveLength(2);
  });

  test('works with mixed content', () => {
    const text = `## Summary\n\nBlah.\n\n## Claims\n\n- [CLAIM] Fact one\n- Regular bullet\n- [CLAIM] Fact two\n`;
    const claims = extractClaims(text);
    expect(claims).toHaveLength(2);
  });
});

describe('appendClaims', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claims-test-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  test('creates claims.jsonl if not exists', () => {
    appendClaims(tmpDir, ['Test claim'], { source_url: 'https://a.com', source_score: 7, wiki: 'test' });
    const claimsPath = path.join(tmpDir, 'claims.jsonl');
    expect(fs.existsSync(claimsPath)).toBe(true);
    const line = JSON.parse(fs.readFileSync(claimsPath, 'utf8').trim());
    expect(line.claim).toBe('Test claim');
    expect(line.source_url).toBe('https://a.com');
    expect(line.source_score).toBe(7);
    expect(line.wiki).toBe('test');
    expect(line.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('appends to existing file', () => {
    appendClaims(tmpDir, ['First'], { source_url: 'https://a.com', source_score: 5, wiki: 'w' });
    appendClaims(tmpDir, ['Second'], { source_url: 'https://b.com', source_score: 3, wiki: 'w' });
    const lines = fs.readFileSync(path.join(tmpDir, 'claims.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).claim).toBe('First');
    expect(JSON.parse(lines[1]).claim).toBe('Second');
  });

  test('writes multiple claims in one call', () => {
    appendClaims(tmpDir, ['A', 'B', 'C'], { source_url: null, source_score: 0, wiki: 'w' });
    const lines = fs.readFileSync(path.join(tmpDir, 'claims.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(3);
  });

  test('skips when claims array is empty', () => {
    appendClaims(tmpDir, [], { source_url: null, source_score: 0, wiki: 'w' });
    expect(fs.existsSync(path.join(tmpDir, 'claims.jsonl'))).toBe(false);
  });

  test('handles null source_url', () => {
    appendClaims(tmpDir, ['Claim'], { source_url: null, source_score: 0, wiki: 'w' });
    const line = JSON.parse(fs.readFileSync(path.join(tmpDir, 'claims.jsonl'), 'utf8').trim());
    expect(line.source_url).toBeNull();
    expect(line.source_score).toBe(0);
  });
});

describe('extractInsights', () => {
  test('extracts [INSIGHT] lines from markdown', () => {
    const text = `## Insights\n\n- [INSIGHT] Decision-tree prompts beat natural-language for small models\n- [INSIGHT] Bounded responsibility prevents step repetition\n\n## Source\n`;
    const insights = extractInsights(text);
    expect(insights).toHaveLength(2);
    expect(insights[0]).toBe('Decision-tree prompts beat natural-language for small models');
    expect(insights[1]).toBe('Bounded responsibility prevents step repetition');
  });

  test('returns empty array when no insights', () => {
    const text = `## Summary\n\nJust a summary.\n\n## Key Points\n\n- Point 1\n`;
    expect(extractInsights(text)).toHaveLength(0);
  });

  test('handles insights with special characters', () => {
    const text = `- [INSIGHT] Use ≤4K tokens per worker — Qwen ignores instructions beyond ~20K\n`;
    const insights = extractInsights(text);
    expect(insights).toHaveLength(1);
    expect(insights[0]).toContain('≤4K tokens');
  });

  test('skips empty insight lines', () => {
    const text = `- [INSIGHT] Valid insight\n- [INSIGHT]   \n- [INSIGHT] Another valid\n`;
    const insights = extractInsights(text);
    expect(insights).toHaveLength(2);
  });

  test('works with mixed content', () => {
    const text = `## Summary\n\nBlah.\n\n## Insights\n\n- [INSIGHT] First heuristic\n- Regular bullet\n- [INSIGHT] Second heuristic\n`;
    const insights = extractInsights(text);
    expect(insights).toHaveLength(2);
  });
});

describe('appendInsights', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'insights-test-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  test('creates insights.jsonl if not exists', () => {
    appendInsights(tmpDir, ['Test insight'], { source_url: 'https://a.com', source_score: 7, wiki: 'test' });
    const insightsPath = path.join(tmpDir, 'insights.jsonl');
    expect(fs.existsSync(insightsPath)).toBe(true);
    const line = JSON.parse(fs.readFileSync(insightsPath, 'utf8').trim());
    expect(line.insight).toBe('Test insight');
    expect(line.source_url).toBe('https://a.com');
    expect(line.source_score).toBe(7);
    expect(line.wiki).toBe('test');
    expect(line.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('appends to existing file', () => {
    appendInsights(tmpDir, ['First'], { source_url: 'https://a.com', source_score: 5, wiki: 'w' });
    appendInsights(tmpDir, ['Second'], { source_url: 'https://b.com', source_score: 3, wiki: 'w' });
    const lines = fs.readFileSync(path.join(tmpDir, 'insights.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).insight).toBe('First');
    expect(JSON.parse(lines[1]).insight).toBe('Second');
  });

  test('writes multiple insights in one call', () => {
    appendInsights(tmpDir, ['A', 'B', 'C'], { source_url: null, source_score: 0, wiki: 'w' });
    const lines = fs.readFileSync(path.join(tmpDir, 'insights.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(3);
  });

  test('skips when insights array is empty', () => {
    appendInsights(tmpDir, [], { source_url: null, source_score: 0, wiki: 'w' });
    expect(fs.existsSync(path.join(tmpDir, 'insights.jsonl'))).toBe(false);
  });

  test('handles null source_url', () => {
    appendInsights(tmpDir, ['Insight'], { source_url: null, source_score: 0, wiki: 'w' });
    const line = JSON.parse(fs.readFileSync(path.join(tmpDir, 'insights.jsonl'), 'utf8').trim());
    expect(line.source_url).toBeNull();
    expect(line.source_score).toBe(0);
  });
});
