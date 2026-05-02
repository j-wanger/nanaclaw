import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { computeSourceScore, loadAuthorityConfig } from './source-score.js';

describe('computeSourceScore', () => {
  test('high-authority government domain scores high', () => {
    const score = computeSourceScore('https://fintrac.gc.ca/report', 5000);
    expect(score).toBeGreaterThan(6);
  });

  test('medium-authority news domain scores mid-range', () => {
    const score = computeSourceScore('https://reuters.com/article/test', 5000);
    expect(score).toBeGreaterThan(4);
    expect(score).toBeLessThan(8);
  });

  test('low-authority blog scores low', () => {
    const score = computeSourceScore('https://medium.com/some-post', 2000);
    expect(score).toBeLessThan(4);
  });

  test('unknown domain gets default authority (4)', () => {
    const score = computeSourceScore('https://randomsite.xyz/page', 5000);
    expect(score).toBeGreaterThan(2);
    expect(score).toBeLessThan(6);
  });

  test('depth scales with content length', () => {
    const short = computeSourceScore('https://example.com', 200);
    const long = computeSourceScore('https://example.com', 50000);
    expect(long).toBeGreaterThan(short);
  });

  test('score is between 0 and 10', () => {
    const scores = [
      computeSourceScore('https://fintrac.gc.ca/x', 100000),
      computeSourceScore('https://medium.com/x', 100),
      computeSourceScore('https://example.com', 0),
    ];
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(10);
    }
  });

  test('uses custom config when provided', () => {
    const config = { domains: { 'custom.org': 10 }, default: 1 };
    const high = computeSourceScore('https://custom.org/page', 5000, config);
    const low = computeSourceScore('https://unknown.com/page', 5000, config);
    expect(high).toBeGreaterThan(low);
  });

  test('matches .gov TLD for subdomains', () => {
    const score = computeSourceScore('https://www.occ.gov/report', 5000);
    expect(score).toBeGreaterThan(5);
  });

  test('strips www prefix', () => {
    const withWww = computeSourceScore('https://www.reuters.com/article', 5000);
    const without = computeSourceScore('https://reuters.com/article', 5000);
    expect(withWww).toBe(without);
  });
});

describe('loadAuthorityConfig', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'score-test-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  test('reads config from wiki path', () => {
    const config = { domains: { 'special.org': 10 }, default: 2 };
    fs.writeFileSync(path.join(tmpDir, 'source-authority.json'), JSON.stringify(config));
    const loaded = loadAuthorityConfig(tmpDir);
    expect(loaded.domains['special.org']).toBe(10);
    expect(loaded.default).toBe(2);
  });

  test('returns fallback when file missing', () => {
    const loaded = loadAuthorityConfig('/nonexistent');
    expect(loaded.default).toBe(4);
    expect(loaded.domains['fintrac.gc.ca']).toBe(9);
  });
});
