import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { generateWikiContext } from './wiki-bridge.js';

let tmpDir: string;
let wikiDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-bridge-test-'));
  wikiDir = path.join(tmpDir, 'test-wiki');
  fs.mkdirSync(wikiDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeWikisJson(wikis: Array<{ name: string; path: string; description: string }>): string {
  const jsonPath = path.join(tmpDir, 'wikis.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ version: 1, wikis }, null, 2));
  return jsonPath;
}

function writeSchema(dir: string, roots: string[]): void {
  const rootsList = roots.map((r) => `- ${r}`).join('\n');
  fs.writeFileSync(
    path.join(dir, 'schema.md'),
    `---\ndomain: Test wiki\n---\n\n# Wiki Schema\n\n## Hierarchy Roots\n${rootsList}\n\n## Conventions\n- Test convention\n`,
  );
}

function writeArticles(dir: string, count: number): void {
  const articlesDir = path.join(dir, 'articles');
  const subDirs = ['concepts', 'patterns', 'decisions'];
  for (const sub of subDirs) {
    fs.mkdirSync(path.join(articlesDir, sub), { recursive: true });
  }
  for (let i = 0; i < count; i++) {
    const sub = subDirs[i % subDirs.length];
    fs.writeFileSync(
      path.join(articlesDir, sub, `article-${i}.md`),
      `---\ntitle: Article ${i}\ntags: [test]\n---\n\nContent ${i}\n`,
    );
  }
}

function fragmentPath(): string {
  return path.join(tmpDir, 'group', '.claude-fragments', 'wiki-context.md');
}

describe('generateWikiContext', () => {
  it('produces wiki-context.md with names, descriptions, roots, and counts', () => {
    writeSchema(wikiDir, ['fraud', 'sanctions', 'typologies']);
    writeArticles(wikiDir, 15);
    const jsonPath = writeWikisJson([
      { name: 'test-wiki', path: wikiDir, description: 'A test knowledge base for testing.' },
    ]);

    const groupDir = path.join(tmpDir, 'group');
    fs.mkdirSync(groupDir, { recursive: true });
    generateWikiContext(groupDir, jsonPath);

    expect(fs.existsSync(fragmentPath())).toBe(true);
    const content = fs.readFileSync(fragmentPath(), 'utf-8');
    expect(content).toContain('test-wiki');
    expect(content).toContain('A test knowledge base');
    expect(content).toContain('fraud');
    expect(content).toContain('sanctions');
    expect(content).toContain('typologies');
    expect(content).toContain('15');
  });

  it('handles multiple wikis', () => {
    const wiki2 = path.join(tmpDir, 'wiki-2');
    fs.mkdirSync(wiki2, { recursive: true });
    writeSchema(wikiDir, ['alpha', 'beta']);
    writeArticles(wikiDir, 10);
    writeSchema(wiki2, ['gamma']);
    writeArticles(wiki2, 5);

    const jsonPath = writeWikisJson([
      { name: 'wiki-one', path: wikiDir, description: 'First wiki.' },
      { name: 'wiki-two', path: wiki2, description: 'Second wiki.' },
    ]);

    const groupDir = path.join(tmpDir, 'group');
    fs.mkdirSync(groupDir, { recursive: true });
    generateWikiContext(groupDir, jsonPath);

    const content = fs.readFileSync(fragmentPath(), 'utf-8');
    expect(content).toContain('wiki-one');
    expect(content).toContain('wiki-two');
    expect(content).toContain('alpha');
    expect(content).toContain('gamma');
  });

  it('does nothing when wikis.json is missing', () => {
    const groupDir = path.join(tmpDir, 'group');
    fs.mkdirSync(groupDir, { recursive: true });
    generateWikiContext(groupDir, path.join(tmpDir, 'nonexistent.json'));

    expect(fs.existsSync(fragmentPath())).toBe(false);
  });

  it('does nothing when wikis array is empty', () => {
    const jsonPath = writeWikisJson([]);
    const groupDir = path.join(tmpDir, 'group');
    fs.mkdirSync(groupDir, { recursive: true });
    generateWikiContext(groupDir, jsonPath);

    expect(fs.existsSync(fragmentPath())).toBe(false);
  });

  it('skips wiki with missing path and continues with others', () => {
    writeSchema(wikiDir, ['real-root']);
    writeArticles(wikiDir, 3);

    const jsonPath = writeWikisJson([
      { name: 'missing-wiki', path: path.join(tmpDir, 'ghost'), description: 'Gone.' },
      { name: 'real-wiki', path: wikiDir, description: 'Present.' },
    ]);

    const groupDir = path.join(tmpDir, 'group');
    fs.mkdirSync(groupDir, { recursive: true });
    generateWikiContext(groupDir, jsonPath);

    const content = fs.readFileSync(fragmentPath(), 'utf-8');
    expect(content).not.toContain('missing-wiki');
    expect(content).toContain('real-wiki');
    expect(content).toContain('real-root');
  });

  it('handles wiki without schema.md gracefully', () => {
    writeArticles(wikiDir, 5);
    const jsonPath = writeWikisJson([{ name: 'no-schema', path: wikiDir, description: 'Wiki without schema.' }]);

    const groupDir = path.join(tmpDir, 'group');
    fs.mkdirSync(groupDir, { recursive: true });
    generateWikiContext(groupDir, jsonPath);

    const content = fs.readFileSync(fragmentPath(), 'utf-8');
    expect(content).toContain('no-schema');
    expect(content).toContain('5');
    expect(content).not.toContain('Hierarchy');
  });

  it('counts articles recursively across subdirectories', () => {
    const articlesDir = path.join(wikiDir, 'articles');
    fs.mkdirSync(path.join(articlesDir, 'concepts', 'sub'), { recursive: true });
    fs.mkdirSync(path.join(articlesDir, 'patterns'), { recursive: true });
    fs.writeFileSync(path.join(articlesDir, 'concepts', 'a.md'), 'article');
    fs.writeFileSync(path.join(articlesDir, 'concepts', 'sub', 'b.md'), 'nested');
    fs.writeFileSync(path.join(articlesDir, 'patterns', 'c.md'), 'pattern');
    fs.writeFileSync(path.join(articlesDir, 'not-md.txt'), 'skip me');
    writeSchema(wikiDir, ['test']);

    const jsonPath = writeWikisJson([{ name: 'nested-wiki', path: wikiDir, description: 'Nested articles.' }]);

    const groupDir = path.join(tmpDir, 'group');
    fs.mkdirSync(groupDir, { recursive: true });
    generateWikiContext(groupDir, jsonPath);

    const content = fs.readFileSync(fragmentPath(), 'utf-8');
    expect(content).toContain('3 articles');
  });

  it('stays under ~500 tokens per wiki budget', () => {
    writeSchema(
      wikiDir,
      Array.from({ length: 20 }, (_, i) => `root-${i}`),
    );
    writeArticles(wikiDir, 100);
    const jsonPath = writeWikisJson([
      { name: 'big-wiki', path: wikiDir, description: 'A wiki with many articles and roots.' },
    ]);

    const groupDir = path.join(tmpDir, 'group');
    fs.mkdirSync(groupDir, { recursive: true });
    generateWikiContext(groupDir, jsonPath);

    const content = fs.readFileSync(fragmentPath(), 'utf-8');
    // ~500 tokens ≈ ~2000 chars per wiki
    expect(content.length).toBeLessThan(2500);
  });

  it('creates .claude-fragments directory if missing', () => {
    writeSchema(wikiDir, ['root']);
    writeArticles(wikiDir, 1);
    const jsonPath = writeWikisJson([{ name: 'test', path: wikiDir, description: 'Test.' }]);

    const groupDir = path.join(tmpDir, 'group');
    fs.mkdirSync(groupDir, { recursive: true });
    expect(fs.existsSync(path.join(groupDir, '.claude-fragments'))).toBe(false);
    generateWikiContext(groupDir, jsonPath);
    expect(fs.existsSync(fragmentPath())).toBe(true);
  });
});
