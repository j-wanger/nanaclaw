import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { resolveWikiPath, text } from './wiki-utils.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-utils-test-'));
});

afterEach(() => {
  delete process.env.WIKIS_JSON_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeWikisJson(wikis: Array<{ name: string; path: string; description: string }>): void {
  const jsonPath = path.join(tmpDir, 'wikis.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ version: 1, wikis }));
  process.env.WIKIS_JSON_PATH = jsonPath;
}

describe('resolveWikiPath', () => {
  it('returns path for known wiki by name', () => {
    writeWikisJson([
      { name: 'aml-wiki', path: '/data/aml', description: 'AML' },
      { name: 'trading-wiki', path: '/data/trading', description: 'Trading' },
    ]);
    expect(resolveWikiPath('trading-wiki')).toBe('/data/trading');
  });

  it('falls back to first wiki for unknown name', () => {
    writeWikisJson([
      { name: 'aml-wiki', path: '/data/aml', description: 'AML' },
    ]);
    expect(resolveWikiPath('nonexistent')).toBe('/data/aml');
  });

  it('returns null when no wikis.json exists', () => {
    process.env.WIKIS_JSON_PATH = path.join(tmpDir, 'nope.json');
    expect(resolveWikiPath('anything')).toBeNull();
  });

  it('returns null for empty wikis array', () => {
    writeWikisJson([]);
    expect(resolveWikiPath('anything')).toBeNull();
  });
});

describe('text', () => {
  it('returns CallToolResult with text content type', () => {
    const result = text('hello');
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe('hello');
  });
});
