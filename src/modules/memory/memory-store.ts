import fs from 'fs';
import path from 'path';
import type { MemoryEntry, MemoryType } from './types.js';

const ENTRY_HEADING_RE = /^## \[(\w+)\] (.+?)(?:\s+\((\d{4}-\d{2}-\d{2})\))?\s*$/;
const VALID_TYPES: ReadonlySet<string> = new Set<MemoryType>(['user', 'feedback', 'project', 'reference']);

export function parseMemoryMd(filePath: string): MemoryEntry[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8');
  if (!raw.trim()) return [];

  const lines = raw.split('\n');
  const entries: MemoryEntry[] = [];
  let current: { type: MemoryType; title: string; created: string; lines: string[] } | null = null;

  for (const line of lines) {
    const match = line.match(ENTRY_HEADING_RE);
    if (match) {
      if (current) entries.push(finalize(current));
      const [, typeStr, title, date] = match;
      if (!VALID_TYPES.has(typeStr)) {
        current = null;
        continue;
      }
      current = {
        type: typeStr as MemoryType,
        title,
        created: date ?? today(),
        lines: [],
      };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) entries.push(finalize(current));
  return entries;
}

export function writeMemoryMd(filePath: string, entries: MemoryEntry[]): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (entries.length === 0) {
    fs.writeFileSync(filePath, '# Memory\n');
    return;
  }

  const sections = entries.map((e) => `## [${e.type}] ${e.title} (${e.created})\n${e.content}\n`);
  fs.writeFileSync(filePath, `# Memory\n\n${sections.join('\n')}`);
}

export function addEntry(filePath: string, entry: MemoryEntry): void {
  const entries = parseMemoryMd(filePath);
  entries.push(entry);
  writeMemoryMd(filePath, entries);
}

export function removeEntry(filePath: string, title: string): boolean {
  const entries = parseMemoryMd(filePath);
  const idx = entries.findIndex((e) => e.title === title);
  if (idx === -1) return false;
  entries.splice(idx, 1);
  writeMemoryMd(filePath, entries);
  return true;
}

export function updateEntry(
  filePath: string,
  title: string,
  updates: Partial<Pick<MemoryEntry, 'content' | 'type'>>,
): boolean {
  const entries = parseMemoryMd(filePath);
  const entry = entries.find((e) => e.title === title);
  if (!entry) return false;
  if (updates.content !== undefined) entry.content = updates.content;
  if (updates.type !== undefined) entry.type = updates.type;
  writeMemoryMd(filePath, entries);
  return true;
}

function finalize(cur: { type: MemoryType; title: string; created: string; lines: string[] }): MemoryEntry {
  const content = cur.lines.join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
  return { type: cur.type, title: cur.title, content, created: cur.created };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
