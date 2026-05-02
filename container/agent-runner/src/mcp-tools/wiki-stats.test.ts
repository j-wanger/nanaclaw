import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { statsHandler } from './wiki-stats.js';

function getText(result: { content: Array<{ text: string }> }): string {
  return result.content[0].text;
}

describe('wiki_stats', () => {
  let tmpDir: string;
  let origEnv: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-stats-test-'));
    origEnv = process.env.WIKIS_JSON_PATH;

    const wiki1 = path.join(tmpDir, 'wiki-a');
    fs.mkdirSync(path.join(wiki1, 'articles', 'concepts'), { recursive: true });
    fs.mkdirSync(path.join(wiki1, 'raw', 'articles'), { recursive: true });
    fs.mkdirSync(path.join(wiki1, 'episodic'), { recursive: true });
    fs.mkdirSync(path.join(wiki1, 'inbox'), { recursive: true });

    fs.writeFileSync(path.join(wiki1, 'articles', 'concepts', 'a.md'), '---\ntitle: a\n---\n');
    fs.writeFileSync(path.join(wiki1, 'articles', 'concepts', 'b.md'), '---\ntitle: b\n---\n');
    fs.writeFileSync(path.join(wiki1, 'articles', 'c.md'), '---\ntitle: c\n---\n');
    fs.writeFileSync(path.join(wiki1, 'raw', 'articles', 'r1.md'), '---\ntitle: r1\n---\n');
    fs.writeFileSync(path.join(wiki1, 'episodic', 'e1.md'), '---\ntitle: e1\n---\n');
    fs.writeFileSync(path.join(wiki1, 'episodic', 'e2.md'), '---\ntitle: e2\n---\n');

    const wiki2 = path.join(tmpDir, 'wiki-b');
    fs.mkdirSync(path.join(wiki2, 'articles'), { recursive: true });
    fs.mkdirSync(path.join(wiki2, 'raw', 'articles'), { recursive: true });
    fs.writeFileSync(path.join(wiki2, 'articles', 'x.md'), '---\ntitle: x\n---\n');
    fs.writeFileSync(path.join(wiki2, 'raw', 'articles', 'y.md'), '---\ntitle: y\n---\n');
    fs.writeFileSync(path.join(wiki2, 'raw', 'articles', 'z.md'), '---\ntitle: z\n---\n');

    const wikisJson = {
      version: 1,
      wikis: [
        { name: 'wiki-a', path: wiki1, description: 'Wiki A' },
        { name: 'wiki-b', path: wiki2, description: 'Wiki B' },
      ],
    };
    fs.writeFileSync(path.join(tmpDir, 'wikis.json'), JSON.stringify(wikisJson));
    process.env.WIKIS_JSON_PATH = path.join(tmpDir, 'wikis.json');
  });

  afterEach(() => {
    if (origEnv === undefined) delete process.env.WIKIS_JSON_PATH;
    else process.env.WIKIS_JSON_PATH = origEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns correct counts per tier for all wikis', async () => {
    const result = await statsHandler({});
    const data = JSON.parse(getText(result));
    expect(data.wikis).toHaveLength(2);

    const a = data.wikis.find((w: { name: string }) => w.name === 'wiki-a');
    expect(a.articles).toBe(3);
    expect(a.raw).toBe(1);
    expect(a.episodic).toBe(2);
    expect(a.inbox).toBe(0);

    const b = data.wikis.find((w: { name: string }) => w.name === 'wiki-b');
    expect(b.articles).toBe(1);
    expect(b.raw).toBe(2);
    expect(b.episodic).toBe(0);
    expect(b.inbox).toBe(0);
  });

  test('filters to single wiki with wiki_name', async () => {
    const result = await statsHandler({ wiki_name: 'wiki-a' });
    const data = JSON.parse(getText(result));
    expect(data.wikis).toHaveLength(1);
    expect(data.wikis[0].name).toBe('wiki-a');
    expect(data.wikis[0].articles).toBe(3);
  });

  test('returns error for unknown wiki_name', async () => {
    const result = await statsHandler({ wiki_name: 'nonexistent' });
    expect(getText(result)).toContain('Error');
    expect(getText(result)).toContain('not found');
  });

  test('returns error when wikis.json missing', async () => {
    process.env.WIKIS_JSON_PATH = '/nonexistent/wikis.json';
    const result = await statsHandler({});
    expect(getText(result)).toContain('Error');
    expect(getText(result)).toContain('No wikis found');
  });

  test('handles missing tier directories gracefully', async () => {
    const wiki3 = path.join(tmpDir, 'wiki-empty');
    fs.mkdirSync(wiki3, { recursive: true });
    const wikisJson = { version: 1, wikis: [{ name: 'empty', path: wiki3, description: 'Empty' }] };
    fs.writeFileSync(process.env.WIKIS_JSON_PATH!, JSON.stringify(wikisJson));

    const result = await statsHandler({});
    const data = JSON.parse(getText(result));
    expect(data.wikis[0].raw).toBe(0);
    expect(data.wikis[0].episodic).toBe(0);
    expect(data.wikis[0].inbox).toBe(0);
    expect(data.wikis[0].articles).toBe(0);
  });
});
