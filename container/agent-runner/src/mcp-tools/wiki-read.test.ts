import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { readHandler } from './wiki-read.js';

function getText(result: { content: Array<{ text: string }> }): string {
  return result.content[0].text;
}

describe('wiki_read', () => {
  let tmpDir: string;
  let origEnv: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-read-test-'));
    origEnv = process.env.WIKIS_JSON_PATH;

    const wikiPath = path.join(tmpDir, 'test-wiki');
    fs.mkdirSync(path.join(wikiPath, 'articles', 'concepts'), { recursive: true });
    fs.mkdirSync(path.join(wikiPath, 'raw', 'articles'), { recursive: true });
    fs.mkdirSync(path.join(wikiPath, 'episodic'), { recursive: true });
    fs.mkdirSync(path.join(wikiPath, 'inbox'), { recursive: true });

    fs.writeFileSync(path.join(wikiPath, 'articles', 'concepts', 'test-article.md'),
      '---\ntitle: "Test Article"\ntags: ["testing", "demo"]\ncreated: 2026-04-29\nstatus: published\n---\n\n# Test Article\n\nThis is the body content.\n');

    fs.writeFileSync(path.join(wikiPath, 'raw', 'articles', 'raw-source.md'),
      '---\ntitle: "Raw Source"\ntags: ["raw"]\ntier: raw\ncreated: 2026-04-29\nsource_url: https://example.com/page\nsha256: abc123\n---\n\nRaw content here.\n');

    fs.writeFileSync(path.join(wikiPath, 'episodic', 'ep-finding.md'),
      '---\ntitle: "Episodic Finding"\ntags: ["research"]\ntier: episodic\ncreated: 2026-04-29\nsource: worker-research\n---\n\nEpisodic content.\n');

    fs.writeFileSync(path.join(wikiPath, 'inbox', 'inbox-entry.md'),
      '---\ntitle: "Inbox Entry"\ntags: ["pending"]\nstatus: inbox\n---\n\nInbox content.\n');

    const wikisJson = { version: 1, wikis: [{ name: 'test-wiki', path: wikiPath, description: 'Test wiki' }] };
    fs.writeFileSync(path.join(tmpDir, 'wikis.json'), JSON.stringify(wikisJson));
    process.env.WIKIS_JSON_PATH = path.join(tmpDir, 'wikis.json');
  });

  afterEach(() => {
    if (origEnv === undefined) delete process.env.WIKIS_JSON_PATH;
    else process.env.WIKIS_JSON_PATH = origEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns structured content for articles tier (recursive)', async () => {
    const result = await readHandler({ wiki_name: 'test-wiki', slug: 'test-article' });
    const data = JSON.parse(getText(result));
    expect(data.title).toBe('Test Article');
    expect(data.tags).toEqual(['testing', 'demo']);
    expect(data.tier).toBe('articles');
    expect(data.created).toBe('2026-04-29');
    expect(data.status).toBe('published');
    expect(data.body).toContain('This is the body content.');
    expect(data.wiki).toBe('test-wiki');
    expect(data.slug).toBe('test-article');
  });

  test('reads raw tier', async () => {
    const result = await readHandler({ wiki_name: 'test-wiki', slug: 'raw-source', tier: 'raw' });
    const data = JSON.parse(getText(result));
    expect(data.title).toBe('Raw Source');
    expect(data.tier).toBe('raw');
    expect(data.source_url).toBe('https://example.com/page');
    expect(data.body).toContain('Raw content here.');
  });

  test('reads episodic tier', async () => {
    const result = await readHandler({ wiki_name: 'test-wiki', slug: 'ep-finding', tier: 'episodic' });
    const data = JSON.parse(getText(result));
    expect(data.title).toBe('Episodic Finding');
    expect(data.tier).toBe('episodic');
  });

  test('reads inbox tier', async () => {
    const result = await readHandler({ wiki_name: 'test-wiki', slug: 'inbox-entry', tier: 'inbox' });
    const data = JSON.parse(getText(result));
    expect(data.title).toBe('Inbox Entry');
    expect(data.tier).toBe('inbox');
  });

  test('defaults to articles tier', async () => {
    const result = await readHandler({ wiki_name: 'test-wiki', slug: 'test-article' });
    const data = JSON.parse(getText(result));
    expect(data.tier).toBe('articles');
  });

  test('returns error for unknown slug', async () => {
    const result = await readHandler({ wiki_name: 'test-wiki', slug: 'nonexistent' });
    expect(getText(result)).toContain('Error');
    expect(getText(result)).toContain('not found');
  });

  test('returns error for unknown wiki_name', async () => {
    const result = await readHandler({ wiki_name: 'no-such-wiki', slug: 'test-article' });
    expect(getText(result)).toContain('Error');
    expect(getText(result)).toContain('not found');
    expect(getText(result)).toContain('Available');
  });

  test('requires wiki_name', async () => {
    const result = await readHandler({ slug: 'test-article' });
    expect(getText(result)).toContain('Error');
    expect(getText(result)).toContain('wiki_name');
  });

  test('requires slug', async () => {
    const result = await readHandler({ wiki_name: 'test-wiki' });
    expect(getText(result)).toContain('Error');
    expect(getText(result)).toContain('slug');
  });

  test('truncates body at max_chars', async () => {
    const wikiPath = JSON.parse(fs.readFileSync(process.env.WIKIS_JSON_PATH!, 'utf8')).wikis[0].path;
    const longBody = 'x'.repeat(500);
    fs.writeFileSync(path.join(wikiPath, 'articles', 'long-article.md'),
      `---\ntitle: "Long"\ntags: []\n---\n\n${longBody}\n`);

    const result = await readHandler({ wiki_name: 'test-wiki', slug: 'long-article', max_chars: 100 });
    const data = JSON.parse(getText(result));
    expect(data.body.length).toBeLessThan(200);
    expect(data.body).toContain('[truncated]');
  });

  test('returns error when wikis.json missing', async () => {
    process.env.WIKIS_JSON_PATH = '/nonexistent/wikis.json';
    const result = await readHandler({ wiki_name: 'test-wiki', slug: 'test-article' });
    expect(getText(result)).toContain('Error');
    expect(getText(result)).toContain('No wikis found');
  });
});
