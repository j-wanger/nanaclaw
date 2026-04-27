import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { rebuildIndex, search, type SearchResult } from './fts.js';
import type { MemoryEntry } from './types.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fts-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function dbPath(): string {
  return path.join(tmpDir, 'memory.db');
}

function makeEntries(count: number): MemoryEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    type: 'project' as const,
    title: `Entry ${i}`,
    content: `Content for entry number ${i}. Keywords: alpha beta gamma.`,
    created: `2026-04-${String((i % 28) + 1).padStart(2, '0')}`,
  }));
}

describe('rebuildIndex', () => {
  it('creates FTS5 table from entries', () => {
    const entries = makeEntries(5);
    rebuildIndex(dbPath(), entries);
    const results = search(dbPath(), 'alpha');
    expect(results.length).toBe(5);
  });

  it('replaces previous index on rebuild', () => {
    rebuildIndex(dbPath(), makeEntries(10));
    rebuildIndex(dbPath(), makeEntries(3));
    const results = search(dbPath(), 'alpha');
    expect(results.length).toBe(3);
  });

  it('handles empty entries', () => {
    rebuildIndex(dbPath(), []);
    const results = search(dbPath(), 'anything');
    expect(results.length).toBe(0);
  });

  it('rebuilds 100 entries in under 50ms', () => {
    const entries = makeEntries(100);
    const start = performance.now();
    rebuildIndex(dbPath(), entries);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});

describe('search', () => {
  it('returns matching entries ranked by relevance', () => {
    const entries: MemoryEntry[] = [
      {
        type: 'user',
        title: 'Loves TypeScript',
        content: 'Uses TypeScript daily for all projects',
        created: '2026-04-25',
      },
      { type: 'project', title: 'Python work', content: 'Occasional Python scripting', created: '2026-04-25' },
      {
        type: 'user',
        title: 'TypeScript expert',
        content: 'Deep TypeScript and type system knowledge',
        created: '2026-04-25',
      },
    ];
    rebuildIndex(dbPath(), entries);
    const results = search(dbPath(), 'TypeScript');
    expect(results.length).toBe(2);
    expect(results.every((r: SearchResult) => r.entry.content.includes('TypeScript'))).toBe(true);
  });

  it('returns empty for no matches', () => {
    rebuildIndex(dbPath(), makeEntries(5));
    const results = search(dbPath(), 'xyznonexistent');
    expect(results.length).toBe(0);
  });

  it('searches across title and content', () => {
    const entries: MemoryEntry[] = [
      { type: 'user', title: 'Kubernetes expert', content: 'Deploys applications', created: '2026-04-25' },
      { type: 'project', title: 'Web app', content: 'Runs on Kubernetes cluster', created: '2026-04-25' },
    ];
    rebuildIndex(dbPath(), entries);
    const results = search(dbPath(), 'Kubernetes');
    expect(results.length).toBe(2);
  });

  it('respects maxResults limit', () => {
    rebuildIndex(dbPath(), makeEntries(20));
    const results = search(dbPath(), 'alpha', 5);
    expect(results.length).toBe(5);
  });

  it('includes score in results', () => {
    rebuildIndex(dbPath(), makeEntries(3));
    const results = search(dbPath(), 'alpha');
    expect(results.every((r: SearchResult) => typeof r.score === 'number')).toBe(true);
  });
});
