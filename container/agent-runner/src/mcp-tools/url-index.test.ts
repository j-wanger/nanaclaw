import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tmpDir: string;
let wikisJsonPath: string;

const MOCK_WIKIS = {
  version: 1,
  wikis: [
    { name: 'wiki-a', path: '', description: 'First wiki' },
    { name: 'wiki-b', path: '', description: 'Second wiki' },
  ],
};

function writeRawArticle(wikiDir: string, slug: string, sourceUrl: string, body: string = 'content') {
  const rawDir = path.join(wikiDir, 'raw', 'articles');
  fs.mkdirSync(rawDir, { recursive: true });
  const frontmatter = [
    '---',
    `title: "${slug}"`,
    `source_url: ${sourceUrl}`,
    `sha256: abc123`,
    `ingested: 2026-04-28`,
    '---',
  ].join('\n');
  fs.writeFileSync(path.join(rawDir, `${slug}.md`), `${frontmatter}\n\n${body}\n`);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'url-index-test-'));
  for (const wiki of MOCK_WIKIS.wikis) {
    const wikiDir = path.join(tmpDir, wiki.name);
    fs.mkdirSync(path.join(wikiDir, 'raw', 'articles'), { recursive: true });
    wiki.path = wikiDir;
  }
  wikisJsonPath = path.join(tmpDir, 'wikis.json');
  fs.writeFileSync(wikisJsonPath, JSON.stringify(MOCK_WIKIS));
  process.env.WIKIS_JSON_PATH = wikisJsonPath;
});

afterEach(() => {
  delete process.env.WIKIS_JSON_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('buildUrlIndex', () => {
  it('scans raw/articles/ frontmatter and writes .url-index', async () => {
    const { buildUrlIndex } = await import('./url-index.js');
    const wikiDir = MOCK_WIKIS.wikis[0].path;
    writeRawArticle(wikiDir, 'article-one', 'https://example.com/one');
    writeRawArticle(wikiDir, 'article-two', 'https://example.com/two');

    buildUrlIndex(wikiDir);

    const indexPath = path.join(wikiDir, 'raw', '.url-index');
    expect(fs.existsSync(indexPath)).toBe(true);
    const lines = fs.readFileSync(indexPath, 'utf8').trim().split('\n').sort();
    expect(lines).toEqual(['https://example.com/one', 'https://example.com/two']);
  });

  it('produces empty .url-index when no articles exist', async () => {
    const { buildUrlIndex } = await import('./url-index.js');
    const wikiDir = MOCK_WIKIS.wikis[0].path;

    buildUrlIndex(wikiDir);

    const indexPath = path.join(wikiDir, 'raw', '.url-index');
    expect(fs.existsSync(indexPath)).toBe(true);
    expect(fs.readFileSync(indexPath, 'utf8').trim()).toBe('');
  });

  it('skips articles without source_url in frontmatter', async () => {
    const { buildUrlIndex } = await import('./url-index.js');
    const wikiDir = MOCK_WIKIS.wikis[0].path;
    writeRawArticle(wikiDir, 'with-url', 'https://example.com/yes');
    // Write article without source_url
    const rawDir = path.join(wikiDir, 'raw', 'articles');
    fs.writeFileSync(path.join(rawDir, 'no-url.md'), '---\ntitle: "No URL"\nsha256: abc\n---\n\nContent\n');

    buildUrlIndex(wikiDir);

    const indexPath = path.join(wikiDir, 'raw', '.url-index');
    const lines = fs.readFileSync(indexPath, 'utf8').trim().split('\n');
    expect(lines).toEqual(['https://example.com/yes']);
  });
});

describe('loadAllUrlIndexes', () => {
  it('reads .url-index across multiple wikis and returns deduplicated Set', async () => {
    const { loadAllUrlIndexes, appendUrlIndex } = await import('./url-index.js');
    const wikiA = MOCK_WIKIS.wikis[0].path;
    const wikiB = MOCK_WIKIS.wikis[1].path;

    appendUrlIndex(wikiA, 'https://example.com/shared');
    appendUrlIndex(wikiA, 'https://example.com/only-a');
    appendUrlIndex(wikiB, 'https://example.com/shared');
    appendUrlIndex(wikiB, 'https://example.com/only-b');

    const urls = loadAllUrlIndexes();
    expect(urls.size).toBe(3);
    expect(urls.has('https://example.com/shared')).toBe(true);
    expect(urls.has('https://example.com/only-a')).toBe(true);
    expect(urls.has('https://example.com/only-b')).toBe(true);
  });

  it('returns empty set when .url-index files do not exist', async () => {
    const { loadAllUrlIndexes } = await import('./url-index.js');
    const urls = loadAllUrlIndexes();
    expect(urls.size).toBe(0);
  });

  it('returns empty set when WIKIS_JSON_PATH is missing', async () => {
    const { loadAllUrlIndexes } = await import('./url-index.js');
    process.env.WIKIS_JSON_PATH = '/nonexistent/wikis.json';
    const urls = loadAllUrlIndexes();
    expect(urls.size).toBe(0);
  });
});

describe('appendUrlIndex', () => {
  it('creates .url-index if absent and appends URL', async () => {
    const { appendUrlIndex } = await import('./url-index.js');
    const wikiDir = MOCK_WIKIS.wikis[0].path;
    const indexPath = path.join(wikiDir, 'raw', '.url-index');

    expect(fs.existsSync(indexPath)).toBe(false);
    appendUrlIndex(wikiDir, 'https://example.com/new');
    expect(fs.existsSync(indexPath)).toBe(true);

    const content = fs.readFileSync(indexPath, 'utf8').trim();
    expect(content).toBe('https://example.com/new');
  });

  it('is idempotent — does not duplicate existing URLs', async () => {
    const { appendUrlIndex } = await import('./url-index.js');
    const wikiDir = MOCK_WIKIS.wikis[0].path;
    const indexPath = path.join(wikiDir, 'raw', '.url-index');

    appendUrlIndex(wikiDir, 'https://example.com/dup');
    appendUrlIndex(wikiDir, 'https://example.com/dup');
    appendUrlIndex(wikiDir, 'https://example.com/dup');

    const lines = fs.readFileSync(indexPath, 'utf8').trim().split('\n');
    expect(lines).toEqual(['https://example.com/dup']);
  });

  it('appends multiple distinct URLs', async () => {
    const { appendUrlIndex } = await import('./url-index.js');
    const wikiDir = MOCK_WIKIS.wikis[0].path;
    const indexPath = path.join(wikiDir, 'raw', '.url-index');

    appendUrlIndex(wikiDir, 'https://example.com/a');
    appendUrlIndex(wikiDir, 'https://example.com/b');
    appendUrlIndex(wikiDir, 'https://example.com/c');

    const lines = fs.readFileSync(indexPath, 'utf8').trim().split('\n');
    expect(lines.length).toBe(3);
    expect(lines).toContain('https://example.com/a');
    expect(lines).toContain('https://example.com/b');
    expect(lines).toContain('https://example.com/c');
  });
});

describe('extractSourceUrl', () => {
  it('extracts source_url from valid YAML frontmatter', async () => {
    const { extractSourceUrl } = await import('./url-index.js');
    const md = '---\ntitle: "Test"\nsource_url: https://example.com/page\nsha256: abc\n---\n\nBody';
    expect(extractSourceUrl(md)).toBe('https://example.com/page');
  });

  it('returns null when no source_url in frontmatter', async () => {
    const { extractSourceUrl } = await import('./url-index.js');
    const md = '---\ntitle: "Test"\nsha256: abc\n---\n\nBody';
    expect(extractSourceUrl(md)).toBeNull();
  });

  it('returns null when no frontmatter at all', async () => {
    const { extractSourceUrl } = await import('./url-index.js');
    expect(extractSourceUrl('Just plain text')).toBeNull();
  });
});
