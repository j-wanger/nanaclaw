import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { parseMemoryMd } from './memory-store.js';
import { rebuildIndex } from './fts.js';
import type { MemoryEntry, MemoryType } from './types.js';

const TOKEN_BUDGET = 1500;
const CHARS_PER_TOKEN = 4;
const CHAR_BUDGET = TOKEN_BUDGET * CHARS_PER_TOKEN;

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
    const hasTable = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='memories'",
    ).get();
    if (!hasTable) return [];

    const rows = db.prepare(
      'SELECT content, category, created_at FROM memories WHERE active = 1 ORDER BY created_at DESC',
    ).all() as Array<{ content: string; category: string; created_at: string }>;

    return rows.map((r) => {
      const firstLine = r.content.split('\n')[0].slice(0, 80);
      return {
        type: CATEGORY_TO_TYPE[r.category] || 'reference',
        title: firstLine,
        content: r.content,
        created: r.created_at.slice(0, 10),
      };
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
  const mcpEntries = readMcpMemories(dbPath);

  if (fileEntries.length === 0 && mcpEntries.length === 0) return;

  if (fileEntries.length > 0) {
    rebuildIndex(dbPath, fileEntries);
  }

  const fileTitles = new Set(fileEntries.map((e) => e.title));
  const deduped = [...fileEntries, ...mcpEntries.filter((e) => !fileTitles.has(e.title))];

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
