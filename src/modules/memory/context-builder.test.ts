import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';
import { generateMemoryFragment, migrateMemoryMdToDb } from './context-builder.js';
import type { MemoryEntry } from './types.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-builder-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeMemory(content: string): void {
  const memDir = path.join(tmpDir, 'memory');
  fs.mkdirSync(memDir, { recursive: true });
  fs.writeFileSync(path.join(memDir, 'MEMORY.md'), content);
}

function fragmentPath(): string {
  return path.join(tmpDir, '.claude-fragments', 'memory-context.md');
}

describe('generateMemoryFragment', () => {
  it('produces non-empty fragment from valid MEMORY.md', () => {
    writeMemory(`# Memory

## [user] Jake (2026-04-25)
Senior engineer, AML focus

## [project] NanoClaw (2026-04-25)
Building memory module
`);
    generateMemoryFragment(tmpDir);
    expect(fs.existsSync(fragmentPath())).toBe(true);
    const content = fs.readFileSync(fragmentPath(), 'utf-8');
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('Jake');
    expect(content).toContain('NanoClaw');
  });

  it('does nothing when MEMORY.md is missing', () => {
    generateMemoryFragment(tmpDir);
    expect(fs.existsSync(fragmentPath())).toBe(false);
  });

  it('does nothing when MEMORY.md is empty', () => {
    const memDir = path.join(tmpDir, 'memory');
    fs.mkdirSync(memDir, { recursive: true });
    fs.writeFileSync(path.join(memDir, 'MEMORY.md'), '');
    generateMemoryFragment(tmpDir);
    expect(fs.existsSync(fragmentPath())).toBe(false);
  });

  it('respects token budget (~1500 tokens ≈ ~6000 chars)', () => {
    const entries = Array.from(
      { length: 50 },
      (_, i) => `## [project] Entry ${i} (2026-04-${String((i % 28) + 1).padStart(2, '0')})\n${'x'.repeat(200)}\n`,
    ).join('\n');
    writeMemory(`# Memory\n\n${entries}`);
    generateMemoryFragment(tmpDir);
    const content = fs.readFileSync(fragmentPath(), 'utf-8');
    expect(content.length).toBeLessThan(8000);
  });

  it('sorts entries by recency (newest first)', () => {
    writeMemory(`# Memory

## [user] Old entry (2026-01-01)
Ancient info

## [user] New entry (2026-04-25)
Fresh info

## [user] Mid entry (2026-03-15)
Middle info
`);
    generateMemoryFragment(tmpDir);
    const content = fs.readFileSync(fragmentPath(), 'utf-8');
    const oldIdx = content.indexOf('Ancient');
    const newIdx = content.indexOf('Fresh');
    const midIdx = content.indexOf('Middle');
    expect(newIdx).toBeLessThan(midIdx);
    expect(midIdx).toBeLessThan(oldIdx);
  });

  it('creates .claude-fragments directory if missing', () => {
    writeMemory(`# Memory

## [user] Test (2026-04-25)
Content
`);
    expect(fs.existsSync(path.join(tmpDir, '.claude-fragments'))).toBe(false);
    generateMemoryFragment(tmpDir);
    expect(fs.existsSync(fragmentPath())).toBe(true);
  });

  it('includes memory type in fragment output', () => {
    writeMemory(`# Memory

## [feedback] Be terse (2026-04-25)
Don't over-explain
`);
    generateMemoryFragment(tmpDir);
    const content = fs.readFileSync(fragmentPath(), 'utf-8');
    expect(content).toContain('feedback');
  });

  it('rebuilds FTS5 index as side effect', () => {
    writeMemory(`# Memory

## [user] Test (2026-04-25)
Content here
`);
    generateMemoryFragment(tmpDir);
    const dbFile = path.join(tmpDir, 'memory', 'memory.db');
    expect(fs.existsSync(dbFile)).toBe(true);
  });

  it('includes entries from memories table when present', () => {
    writeMemory(`# Memory

## [user] From MEMORY.md (2026-04-25)
File-based entry
`);
    const memDir = path.join(tmpDir, 'memory');
    const db = new Database(path.join(memDir, 'memory.db'));
    db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY, content TEXT NOT NULL, context TEXT,
        category TEXT NOT NULL DEFAULT 'fact', trust TEXT NOT NULL DEFAULT 'medium',
        strength INTEGER NOT NULL DEFAULT 1, source TEXT, source_session TEXT,
        tags TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1,
        superseded_by TEXT, contradicts TEXT NOT NULL DEFAULT '[]',
        embedding BLOB, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        access_count INTEGER NOT NULL DEFAULT 0
      )
    `);
    db.prepare(
      `INSERT INTO memories (id, content, category, created_at, updated_at, active)
      VALUES ('mem_001', 'MCP-stored memory content', 'fact', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z', 1)`,
    ).run();
    db.close();

    generateMemoryFragment(tmpDir);
    const content = fs.readFileSync(fragmentPath(), 'utf-8');
    expect(content).toContain('File-based entry');
    expect(content).toContain('MCP-stored memory content');
  });

  it('falls back to MEMORY.md-only when memories table absent', () => {
    writeMemory(`# Memory

## [user] Only file entry (2026-04-25)
Just from file
`);
    generateMemoryFragment(tmpDir);
    const content = fs.readFileSync(fragmentPath(), 'utf-8');
    expect(content).toContain('Just from file');
  });

  describe('migrateMemoryMdToDb', () => {
    it('creates memories table and inserts entries with correct mapping', () => {
      const memDir = path.join(tmpDir, 'memory');
      fs.mkdirSync(memDir, { recursive: true });
      const dbPath = path.join(memDir, 'memory.db');

      const entries: MemoryEntry[] = [
        { type: 'user', title: 'Jake profile', content: 'Senior engineer', created: '2026-04-25' },
        { type: 'feedback', title: 'Be terse', content: 'No fluff', created: '2026-04-26' },
        { type: 'project', title: 'NanoClaw', content: 'Agent system', created: '2026-04-27' },
        { type: 'reference', title: 'Docs URL', content: 'https://docs.example.com', created: '2026-04-28' },
      ];

      const result = migrateMemoryMdToDb(entries, dbPath);
      expect(result.imported).toBe(4);
      expect(result.skipped).toBe(0);

      const db = new Database(dbPath);
      const rows = db.prepare('SELECT content, category, trust FROM memories WHERE active = 1').all() as Array<{
        content: string;
        category: string;
        trust: string;
      }>;
      db.close();

      expect(rows).toHaveLength(4);
      const byContent = Object.fromEntries(rows.map((r) => [r.content, r]));
      expect(byContent['Senior engineer'].category).toBe('fact');
      expect(byContent['Senior engineer'].trust).toBe('medium');
      expect(byContent['No fluff'].category).toBe('correction');
      expect(byContent['No fluff'].trust).toBe('high');
      expect(byContent['Agent system'].category).toBe('fact');
      expect(byContent['https://docs.example.com'].category).toBe('custom');
    });

    it('is idempotent — second call imports nothing new', () => {
      const memDir = path.join(tmpDir, 'memory');
      fs.mkdirSync(memDir, { recursive: true });
      const dbPath = path.join(memDir, 'memory.db');

      const entries: MemoryEntry[] = [{ type: 'user', title: 'Test', content: 'Same content', created: '2026-04-25' }];

      const first = migrateMemoryMdToDb(entries, dbPath);
      expect(first.imported).toBe(1);

      const second = migrateMemoryMdToDb(entries, dbPath);
      expect(second.imported).toBe(0);
      expect(second.skipped).toBe(1);

      const db = new Database(dbPath);
      const count = (db.prepare('SELECT count(*) as cnt FROM memories').get() as { cnt: number }).cnt;
      db.close();
      expect(count).toBe(1);
    });

    it('returns zeros for empty entries', () => {
      const memDir = path.join(tmpDir, 'memory');
      fs.mkdirSync(memDir, { recursive: true });
      const dbPath = path.join(memDir, 'memory.db');

      const result = migrateMemoryMdToDb([], dbPath);
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });

  it('deduplicates by content — migrated entries do not appear twice', () => {
    writeMemory(`# Memory

## [user] Jake Profile (2026-04-25)
Senior engineer in AML
`);
    generateMemoryFragment(tmpDir);
    const content = fs.readFileSync(fragmentPath(), 'utf-8');
    const matches = (content.match(/Senior engineer in AML/g) || []).length;
    expect(matches).toBe(1);
  });

  it('uses source-type tag to preserve original MemoryType through round-trip', () => {
    writeMemory(`# Memory

## [user] Jake (2026-04-25)
Engineer profile
`);
    generateMemoryFragment(tmpDir);
    const content = fs.readFileSync(fragmentPath(), 'utf-8');
    const dbEntries = content.match(/\[user\]/g) || [];
    expect(dbEntries.length).toBeGreaterThanOrEqual(1);
    expect(content).not.toContain('[reference] Engineer profile');
  });

  it('rebuilds memories_fts after migration when table exists', () => {
    const memDir = path.join(tmpDir, 'memory');
    fs.mkdirSync(memDir, { recursive: true });
    const dbPath = path.join(memDir, 'memory.db');

    const db = new Database(dbPath);
    db.exec(`CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY, content TEXT NOT NULL, context TEXT,
      category TEXT NOT NULL DEFAULT 'fact', trust TEXT NOT NULL DEFAULT 'medium',
      strength INTEGER NOT NULL DEFAULT 1, source TEXT, source_session TEXT,
      tags TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1,
      superseded_by TEXT, contradicts TEXT NOT NULL DEFAULT '[]',
      embedding BLOB, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      access_count INTEGER NOT NULL DEFAULT 0
    )`);
    db.exec("CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(content, tags, content='memories', content_rowid='rowid')");
    db.close();

    const entries: MemoryEntry[] = [
      { type: 'user', title: 'Test', content: 'Searchable memory text', created: '2026-04-25' },
    ];
    migrateMemoryMdToDb(entries, dbPath);

    const db2 = new Database(dbPath);
    const ftsResult = db2.prepare("SELECT * FROM memories_fts WHERE memories_fts MATCH 'Searchable'").all();
    db2.close();
    expect(ftsResult.length).toBe(1);
  });
});
