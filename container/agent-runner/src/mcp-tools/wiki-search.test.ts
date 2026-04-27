import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-search-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.WIKIS_JSON_PATH;
  delete process.env.WIKI_TOOLS_DIR;
});

function writeWikisJson(wikis: Array<{ name: string; path: string; description: string }>): void {
  const jsonPath = path.join(tmpDir, 'wikis.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ version: 1, wikis }, null, 2));
  process.env.WIKIS_JSON_PATH = jsonPath;
}

function writeArticles(wikiDir: string, articles: Array<{ slug: string; title: string; tags: string[]; subdir?: string }>): void {
  for (const a of articles) {
    const dir = path.join(wikiDir, 'articles', a.subdir || 'concepts');
    fs.mkdirSync(dir, { recursive: true });
    const tagStr = a.tags.map((t) => `"${t}"`).join(', ');
    fs.writeFileSync(
      path.join(dir, `${a.slug}.md`),
      `---\ntitle: "${a.title}"\ntags: [${tagStr}]\ncreated: 2026-04-26\n---\n\nContent for ${a.title}.\n`,
    );
  }
}

// Import the handler after env setup
async function getHandler() {
  const mod = await import('./wiki-search.js');
  return mod.searchHandler;
}

function textContent(result: { content: Array<{ type: string; text: string }> }): string {
  return result.content[0]?.text ?? '';
}

describe('wiki_search', () => {
  it('returns structured error when WIKIS_JSON_PATH is missing', async () => {
    process.env.WIKIS_JSON_PATH = path.join(tmpDir, 'nonexistent.json');
    const handler = await getHandler();
    const result = await handler({ query: 'test', top_k: 5 });
    expect(textContent(result)).toContain('Error');
  });

  it('routes to correct wiki with explicit wiki_name', async () => {
    const wiki1 = path.join(tmpDir, 'wiki-a');
    const wiki2 = path.join(tmpDir, 'wiki-b');
    writeArticles(wiki1, [{ slug: 'alpha', title: 'Alpha Article', tags: ['test'] }]);
    writeArticles(wiki2, [{ slug: 'beta', title: 'Beta Article', tags: ['test'] }]);
    writeWikisJson([
      { name: 'wiki-a', path: wiki1, description: 'First wiki.' },
      { name: 'wiki-b', path: wiki2, description: 'Second wiki.' },
    ]);

    const handler = await getHandler();
    const result = await handler({ query: 'beta', wiki_name: 'wiki-b', top_k: 5 });
    const text = textContent(result);
    expect(text).toContain('Beta Article');
    expect(text).not.toContain('Alpha Article');
  });

  describe('keyword fallback (no search index)', () => {
    it('returns results matching article titles', async () => {
      const wikiDir = path.join(tmpDir, 'wiki');
      writeArticles(wikiDir, [
        { slug: 'fraud-detection', title: 'Fraud Detection Patterns', tags: ['aml'] },
        { slug: 'sanctions', title: 'Sanctions Screening', tags: ['compliance'] },
        { slug: 'unrelated', title: 'Database Optimization', tags: ['perf'] },
      ]);
      writeWikisJson([
        { name: 'test-wiki', path: wikiDir, description: 'Test wiki.' },
      ]);

      const handler = await getHandler();
      const result = await handler({ query: 'fraud detection', top_k: 5 });
      const text = textContent(result);
      expect(text).toContain('Fraud Detection');
    });

    it('scores title matches higher than tag matches', async () => {
      const wikiDir = path.join(tmpDir, 'wiki');
      writeArticles(wikiDir, [
        { slug: 'title-match', title: 'Fraud Analysis Deep Dive', tags: ['other'] },
        { slug: 'tag-match', title: 'Something Else', tags: ['fraud'] },
      ]);
      writeWikisJson([
        { name: 'test-wiki', path: wikiDir, description: 'Test wiki.' },
      ]);

      const handler = await getHandler();
      const result = await handler({ query: 'fraud', top_k: 5 });
      const text = textContent(result);
      const titleIdx = text.indexOf('Fraud Analysis');
      const tagIdx = text.indexOf('Something Else');
      expect(titleIdx).toBeLessThan(tagIdx);
    });

    it('searches across subdirectories', async () => {
      const wikiDir = path.join(tmpDir, 'wiki');
      writeArticles(wikiDir, [
        { slug: 'concept-a', title: 'Agent Memory', tags: ['memory'], subdir: 'concepts' },
        { slug: 'pattern-b', title: 'Memory Patterns', tags: ['design'], subdir: 'patterns' },
      ]);
      writeWikisJson([
        { name: 'test-wiki', path: wikiDir, description: 'Test wiki.' },
      ]);

      const handler = await getHandler();
      const result = await handler({ query: 'memory', top_k: 10 });
      const text = textContent(result);
      expect(text).toContain('Agent Memory');
      expect(text).toContain('Memory Patterns');
    });
  });

  it('skips search.py tier when WIKI_TOOLS_DIR is unset', async () => {
    const wikiDir = path.join(tmpDir, 'wiki');
    fs.mkdirSync(wikiDir, { recursive: true });
    writeArticles(wikiDir, [
      { slug: 'test', title: 'Test Article', tags: ['test'] },
    ]);
    writeWikisJson([
      { name: 'test-wiki', path: wikiDir, description: 'Test wiki.' },
    ]);
    delete process.env.WIKI_TOOLS_DIR;

    const handler = await getHandler();
    const result = await handler({ query: 'test', top_k: 5 });
    const text = textContent(result);
    expect(text).toContain('Test Article');
  });

  it('handles corrupt search.py output gracefully', async () => {
    const wikiDir = path.join(tmpDir, 'wiki');
    fs.mkdirSync(wikiDir, { recursive: true });
    // Create a fake .wiki-index.db file (not dir) so the index check passes
    fs.writeFileSync(path.join(wikiDir, '.wiki-index.db'), 'fake');
    writeArticles(wikiDir, [
      { slug: 'fallback', title: 'Fallback Article', tags: ['test'] },
    ]);
    writeWikisJson([
      { name: 'test-wiki', path: wikiDir, description: 'Test wiki.' },
    ]);

    // Point to a fake script that outputs garbage
    const fakeToolsDir = path.join(tmpDir, 'fake-tools');
    fs.mkdirSync(fakeToolsDir, { recursive: true });
    fs.writeFileSync(path.join(fakeToolsDir, 'search.py'), '#!/usr/bin/env python3\nprint("NOT JSON")');
    fs.chmodSync(path.join(fakeToolsDir, 'search.py'), 0o755);
    process.env.WIKI_TOOLS_DIR = fakeToolsDir;

    const handler = await getHandler();
    const result = await handler({ query: 'fallback', top_k: 5 });
    const text = textContent(result);
    // Should fall back to keyword search after corrupt search.py output
    expect(text).toContain('Fallback Article');
  });
});
