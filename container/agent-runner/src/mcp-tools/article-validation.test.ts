import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { validateRawArticle, validateEpisodicArticle } from './article-validation.js';

describe('validateRawArticle', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'val-raw-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  function writeRaw(overrides: Record<string, string> = {}, body = 'x'.repeat(200)): string {
    const fm = {
      title: '"Test Article"',
      source_url: 'https://example.com',
      sha256: 'abc123',
      tier: 'raw',
      ...overrides,
    };
    const lines = ['---', ...Object.entries(fm).map(([k, v]) => `${k}: ${v}`), '---'];
    const filePath = path.join(tmpDir, 'test.md');
    fs.writeFileSync(filePath, `${lines.join('\n')}\n\n${body}\n`);
    return filePath;
  }

  test('valid for well-formed article', () => {
    const fp = writeRaw();
    const result = validateRawArticle(fp);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test('invalid when source_url missing', () => {
    const fp = writeRaw({ source_url: '' });
    const result = validateRawArticle(fp);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('missing source_url');
  });

  test('invalid when sha256 missing', () => {
    const fp = writeRaw({ sha256: '' });
    const result = validateRawArticle(fp);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('missing sha256');
  });

  test('invalid when title empty', () => {
    const fp = writeRaw({ title: '' });
    const result = validateRawArticle(fp);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('empty title');
  });

  test('invalid when content too short', () => {
    const fp = writeRaw({}, 'short');
    const result = validateRawArticle(fp);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes('too short'))).toBe(true);
  });

  test('invalid for unreadable file', () => {
    const result = validateRawArticle('/nonexistent/file.md');
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('file not readable');
  });
});

describe('validateEpisodicArticle', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'val-ep-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  function writeEpisodic(overrides: Record<string, string> = {}, body?: string): string {
    const fm = {
      title: '"Episodic Finding"',
      'tags': '["research", "test"]',
      source: 'worker-research',
      source_url: 'https://example.com',
      tier: 'episodic',
      ...overrides,
    };
    const lines = ['---', ...Object.entries(fm).map(([k, v]) => `${k}: ${v}`), '---'];
    const content = body ?? '## Summary\n\nSome summary.\n\n## Key Points\n\n- Point 1\n';
    const filePath = path.join(tmpDir, 'test.md');
    fs.writeFileSync(filePath, `${lines.join('\n')}\n\n${content}\n`);
    return filePath;
  }

  test('valid for well-formed article', () => {
    const fp = writeEpisodic();
    const result = validateEpisodicArticle(fp);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test('invalid when source_url missing', () => {
    const fp = writeEpisodic({ source_url: '' });
    const result = validateEpisodicArticle(fp);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('missing source_url');
  });

  test('invalid when ## Summary absent', () => {
    const fp = writeEpisodic({}, 'No summary section here.\n\n## Key Points\n\n- Point');
    const result = validateEpisodicArticle(fp);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('missing ## Summary section');
  });

  test('invalid when ## Key Points absent', () => {
    const fp = writeEpisodic({}, '## Summary\n\nSome summary.\n\nNo key points section.');
    const result = validateEpisodicArticle(fp);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('missing ## Key Points section');
  });

  test('invalid when tags empty', () => {
    const fp = writeEpisodic({ tags: '[]' });
    const result = validateEpisodicArticle(fp);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('empty tags');
  });

  test('invalid when title empty', () => {
    const fp = writeEpisodic({ title: '' });
    const result = validateEpisodicArticle(fp);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('empty title');
  });
});
