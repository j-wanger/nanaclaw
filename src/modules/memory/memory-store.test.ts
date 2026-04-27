import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseMemoryMd, writeMemoryMd, addEntry, removeEntry, updateEntry } from './memory-store.js';
import type { MemoryEntry } from './types.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function memoryPath(): string {
  return path.join(tmpDir, 'MEMORY.md');
}

describe('parseMemoryMd', () => {
  it('returns empty array for missing file', () => {
    expect(parseMemoryMd(memoryPath())).toEqual([]);
  });

  it('returns empty array for empty file', () => {
    fs.writeFileSync(memoryPath(), '');
    expect(parseMemoryMd(memoryPath())).toEqual([]);
  });

  it('returns empty array for file with only header', () => {
    fs.writeFileSync(memoryPath(), '# Memory\n');
    expect(parseMemoryMd(memoryPath())).toEqual([]);
  });

  it('parses single entry', () => {
    fs.writeFileSync(
      memoryPath(),
      `# Memory

## [user] Jake's role (2026-04-25)
Senior engineer focused on AML/agent systems.
`,
    );
    const entries = parseMemoryMd(memoryPath());
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      type: 'user',
      title: "Jake's role",
      content: 'Senior engineer focused on AML/agent systems.',
      created: '2026-04-25',
    });
  });

  it('parses all 4 memory types', () => {
    fs.writeFileSync(
      memoryPath(),
      `# Memory

## [user] Profile (2026-04-25)
Role info

## [feedback] Terse responses (2026-04-25)
Don't over-explain

## [project] NanoClaw fork (2026-04-25)
Building memory module

## [reference] Wiki location (2026-04-25)
wikis.json at ~/.claude/
`,
    );
    const entries = parseMemoryMd(memoryPath());
    expect(entries).toHaveLength(4);
    expect(entries.map((e) => e.type)).toEqual(['user', 'feedback', 'project', 'reference']);
  });

  it('handles multi-line content', () => {
    fs.writeFileSync(
      memoryPath(),
      `# Memory

## [project] Multi-line (2026-04-25)
Line one.
Line two.

Still part of this entry.
`,
    );
    const entries = parseMemoryMd(memoryPath());
    expect(entries).toHaveLength(1);
    expect(entries[0].content).toBe('Line one.\nLine two.\n\nStill part of this entry.');
  });

  it('handles special characters in title and content', () => {
    fs.writeFileSync(
      memoryPath(),
      `# Memory

## [user] Jake's "special" chars & symbols (2026-04-25)
Content with \`code\`, **bold**, and [links](http://example.com).
`,
    );
    const entries = parseMemoryMd(memoryPath());
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('Jake\'s "special" chars & symbols');
    expect(entries[0].content).toContain('`code`');
  });

  it('skips malformed entries without type tag', () => {
    fs.writeFileSync(
      memoryPath(),
      `# Memory

## No type tag here (2026-04-25)
This should be skipped

## [user] Valid entry (2026-04-25)
This should be parsed
`,
    );
    const entries = parseMemoryMd(memoryPath());
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('Valid entry');
  });

  it('defaults date when missing', () => {
    fs.writeFileSync(
      memoryPath(),
      `# Memory

## [user] No date
Some content
`,
    );
    const entries = parseMemoryMd(memoryPath());
    expect(entries).toHaveLength(1);
    expect(entries[0].created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('writeMemoryMd', () => {
  it('writes empty memory file', () => {
    writeMemoryMd(memoryPath(), []);
    const content = fs.readFileSync(memoryPath(), 'utf-8');
    expect(content).toBe('# Memory\n');
  });

  it('round-trips entries', () => {
    const entries: MemoryEntry[] = [
      { type: 'user', title: 'Profile', content: 'Engineer', created: '2026-04-25' },
      { type: 'project', title: 'Work', content: 'Building things', created: '2026-04-25' },
    ];
    writeMemoryMd(memoryPath(), entries);
    const parsed = parseMemoryMd(memoryPath());
    expect(parsed).toEqual(entries);
  });

  it('round-trips multi-line content', () => {
    const entries: MemoryEntry[] = [
      { type: 'feedback', title: 'Style', content: 'Line one.\n\nLine two.\nLine three.', created: '2026-04-25' },
    ];
    writeMemoryMd(memoryPath(), entries);
    const parsed = parseMemoryMd(memoryPath());
    expect(parsed).toEqual(entries);
  });

  it('round-trips special characters', () => {
    const entries: MemoryEntry[] = [
      { type: 'user', title: 'Jake\'s "prefs" & more', content: '`code` **bold** [link](url)', created: '2026-04-25' },
    ];
    writeMemoryMd(memoryPath(), entries);
    const parsed = parseMemoryMd(memoryPath());
    expect(parsed).toEqual(entries);
  });
});

describe('addEntry', () => {
  it('adds to empty file', () => {
    const entry: MemoryEntry = { type: 'user', title: 'New', content: 'Content', created: '2026-04-25' };
    addEntry(memoryPath(), entry);
    const entries = parseMemoryMd(memoryPath());
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(entry);
  });

  it('appends to existing entries', () => {
    const first: MemoryEntry = { type: 'user', title: 'First', content: 'A', created: '2026-04-25' };
    const second: MemoryEntry = { type: 'project', title: 'Second', content: 'B', created: '2026-04-25' };
    addEntry(memoryPath(), first);
    addEntry(memoryPath(), second);
    const entries = parseMemoryMd(memoryPath());
    expect(entries).toHaveLength(2);
  });
});

describe('removeEntry', () => {
  it('removes by title', () => {
    const entries: MemoryEntry[] = [
      { type: 'user', title: 'Keep', content: 'A', created: '2026-04-25' },
      { type: 'user', title: 'Remove', content: 'B', created: '2026-04-25' },
    ];
    writeMemoryMd(memoryPath(), entries);
    const removed = removeEntry(memoryPath(), 'Remove');
    expect(removed).toBe(true);
    const remaining = parseMemoryMd(memoryPath());
    expect(remaining).toHaveLength(1);
    expect(remaining[0].title).toBe('Keep');
  });

  it('returns false for non-existent title', () => {
    writeMemoryMd(memoryPath(), []);
    expect(removeEntry(memoryPath(), 'Ghost')).toBe(false);
  });
});

describe('updateEntry', () => {
  it('updates content of existing entry by title', () => {
    const entries: MemoryEntry[] = [{ type: 'user', title: 'Profile', content: 'Old', created: '2026-04-25' }];
    writeMemoryMd(memoryPath(), entries);
    const updated = updateEntry(memoryPath(), 'Profile', { content: 'New' });
    expect(updated).toBe(true);
    const parsed = parseMemoryMd(memoryPath());
    expect(parsed[0].content).toBe('New');
    expect(parsed[0].type).toBe('user');
  });

  it('returns false for non-existent title', () => {
    writeMemoryMd(memoryPath(), []);
    expect(updateEntry(memoryPath(), 'Ghost', { content: 'X' })).toBe(false);
  });
});
