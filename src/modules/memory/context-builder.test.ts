import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { generateMemoryFragment } from './context-builder.js';

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
});
