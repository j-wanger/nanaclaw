import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { parseMemoryMd } from './memory-store.js';
import { rebuildIndex } from './fts.js';
import type { MemoryEntry, MemoryType } from './types.js';

const TOKEN_BUDGET = 1500;
const CHARS_PER_TOKEN = 4;
const CHAR_BUDGET = TOKEN_BUDGET * CHARS_PER_TOKEN;

const TYPE_TO_CATEGORY: Record<string, string> = {
  user: 'fact',
  feedback: 'correction',
  project: 'fact',
  reference: 'custom',
};

const TYPE_TO_TRUST: Record<string, string> = {
  feedback: 'high',
};

const MEMORIES_DDL = `CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  context TEXT,
  category TEXT NOT NULL DEFAULT 'fact',
  trust TEXT NOT NULL DEFAULT 'medium',
  strength INTEGER NOT NULL DEFAULT 1,
  source TEXT,
  source_session TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  superseded_by TEXT,
  contradicts TEXT NOT NULL DEFAULT '[]',
  embedding BLOB,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  access_count INTEGER NOT NULL DEFAULT 0
)`;

export function migrateMemoryMdToDb(entries: MemoryEntry[], dbPath: string): { imported: number; skipped: number } {
  if (entries.length === 0) return { imported: 0, skipped: 0 };

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);
  try {
    db.exec(MEMORIES_DDL);

    const checkStmt = db.prepare('SELECT 1 FROM memories WHERE content = @content AND active = 1');
    const insertStmt = db.prepare(
      `INSERT INTO memories (id, content, context, category, trust, source, tags, created_at, updated_at)
       VALUES (@id, @content, @context, @category, @trust, @source, @tags, @created_at, @updated_at)`,
    );

    let imported = 0;
    let skipped = 0;

    for (const entry of entries) {
      if (checkStmt.get({ content: entry.content })) {
        skipped++;
        continue;
      }
      const now = new Date().toISOString();
      insertStmt.run({
        id: crypto.randomUUID(),
        content: entry.content,
        context: `Migrated from MEMORY.md: ${entry.title}`,
        category: TYPE_TO_CATEGORY[entry.type] || 'fact',
        trust: TYPE_TO_TRUST[entry.type] || 'medium',
        source: 'imported',
        tags: JSON.stringify([`source-type:${entry.type}`]),
        created_at: entry.created ? `${entry.created}T00:00:00Z` : now,
        updated_at: now,
      });
      imported++;
    }

    if (imported > 0) {
      const hasFts = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='memories_fts'").get();
      if (hasFts) {
        db.exec("INSERT INTO memories_fts(memories_fts) VALUES('rebuild')");
      }
    }

    return { imported, skipped };
  } finally {
    db.close();
  }
}

const CATEGORY_TO_TYPE: Record<string, MemoryType> = {
  user: 'user',
  preference: 'user',
  feedback: 'feedback',
  correction: 'feedback',
  project: 'project',
  entity: 'project',
  reference: 'reference',
  fact: 'reference',
  custom: 'reference',
};

function readMcpMemories(dbPath: string): MemoryEntry[] {
  if (!fs.existsSync(dbPath)) return [];
  let db: InstanceType<typeof Database> | null = null;
  try {
    db = new Database(dbPath, { readonly: true });
    const hasTable = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='memories'").get();
    if (!hasTable) return [];

    const rows = db
      .prepare('SELECT content, category, tags, created_at FROM memories WHERE active = 1 ORDER BY created_at DESC')
      .all() as Array<{ content: string; category: string; tags: string; created_at: string }>;

    return rows.map((r) => {
      const firstLine = r.content.split('\n')[0].slice(0, 80);
      let type: MemoryType = CATEGORY_TO_TYPE[r.category] || 'reference';
      try {
        const tags = JSON.parse(r.tags) as string[];
        const sourceTag = tags.find((t) => t.startsWith('source-type:'));
        if (sourceTag) {
          const original = sourceTag.slice('source-type:'.length) as MemoryType;
          if (['user', 'feedback', 'project', 'reference'].includes(original)) type = original;
        }
      } catch {
        /* skip */
      }
      return { type, title: firstLine, content: r.content, created: r.created_at.slice(0, 10) };
    });
  } catch {
    return [];
  } finally {
    db?.close();
  }
}

export function generateMemoryFragment(groupDir: string): void {
  const memoryDir = path.join(groupDir, 'memory');
  const memoryFile = path.join(memoryDir, 'MEMORY.md');
  const dbPath = path.join(memoryDir, 'memory.db');

  const fileEntries = fs.existsSync(memoryFile) ? parseMemoryMd(memoryFile) : [];

  if (fileEntries.length > 0) {
    migrateMemoryMdToDb(fileEntries, dbPath);
    rebuildIndex(dbPath, fileEntries);
  }

  const mcpEntries = readMcpMemories(dbPath);

  if (fileEntries.length === 0 && mcpEntries.length === 0) return;

  const fileContents = new Set(fileEntries.map((e) => e.content));
  const deduped = [...fileEntries, ...mcpEntries.filter((e) => !fileContents.has(e.content))];

  const sorted = [...deduped].sort((a, b) => b.created.localeCompare(a.created));
  const selected = selectWithinBudget(sorted, CHAR_BUDGET);
  const fragment = renderFragment(selected);

  const fragmentsDir = path.join(groupDir, '.claude-fragments');
  if (!fs.existsSync(fragmentsDir)) fs.mkdirSync(fragmentsDir, { recursive: true });

  const tmpPath = `${path.join(fragmentsDir, 'memory-context.md')}.tmp-${process.pid}`;
  fs.writeFileSync(tmpPath, fragment);
  fs.renameSync(tmpPath, path.join(fragmentsDir, 'memory-context.md'));
}

function selectWithinBudget(entries: MemoryEntry[], charBudget: number): MemoryEntry[] {
  const selected: MemoryEntry[] = [];
  let used = 0;
  for (const entry of entries) {
    const cost = estimateChars(entry);
    if (used + cost > charBudget) continue;
    selected.push(entry);
    used += cost;
  }
  return selected;
}

function estimateChars(entry: MemoryEntry): number {
  return entry.title.length + entry.content.length + entry.type.length + 20;
}

function renderFragment(entries: MemoryEntry[]): string {
  const lines: string[] = ['# Agent Memory', '<!-- Frozen at spawn. Updates take effect next session. -->', ''];
  for (const entry of entries) {
    lines.push(`## [${entry.type}] ${entry.title}`);
    lines.push(entry.content);
    lines.push('');
  }
  return lines.join('\n');
}
