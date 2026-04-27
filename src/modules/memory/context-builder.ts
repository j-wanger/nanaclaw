import fs from 'fs';
import path from 'path';
import { parseMemoryMd } from './memory-store.js';
import { rebuildIndex } from './fts.js';
import type { MemoryEntry } from './types.js';

const TOKEN_BUDGET = 1500;
const CHARS_PER_TOKEN = 4;
const CHAR_BUDGET = TOKEN_BUDGET * CHARS_PER_TOKEN;

export function generateMemoryFragment(groupDir: string): void {
  const memoryDir = path.join(groupDir, 'memory');
  const memoryFile = path.join(memoryDir, 'MEMORY.md');

  if (!fs.existsSync(memoryFile)) return;

  const entries = parseMemoryMd(memoryFile);
  if (entries.length === 0) return;

  const dbPath = path.join(memoryDir, 'memory.db');
  rebuildIndex(dbPath, entries);

  const sorted = [...entries].sort((a, b) => b.created.localeCompare(a.created));
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
