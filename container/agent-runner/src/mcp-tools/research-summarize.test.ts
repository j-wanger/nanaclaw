import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { summarizeHandler, buildEpisodicSourceUrls } from './research-summarize.js';

let tmpDir: string;
let origEnv: Record<string, string | undefined>;

function rawFm(title: string, url: string, extra = ''): string {
  return `---\ntitle: "${title}"\nsource_url: ${url}\nsha256: abc\ntier: raw\nsource: web-extract\n${extra}---\n\n# ${title}\n\nContent about ${title}.\n`;
}

function episodicFm(title: string, url: string): string {
  return `---\ntitle: "${title}"\ntags: ["test"]\nsource: worker-research\nsource_url: ${url}\ntier: episodic\n---\n\n## Summary\n\nSummary of ${title}.\n\n## Key Points\n\n- Point\n`;
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'summarize-test-'));
  origEnv = {
    WIKIS_JSON_PATH: process.env.WIKIS_JSON_PATH,
    NANOCLAW_AGENT_DIR: process.env.NANOCLAW_AGENT_DIR,
  };

  const wikiPath = path.join(tmpDir, 'test-wiki');
  fs.mkdirSync(path.join(wikiPath, 'raw', 'articles'), { recursive: true });
  fs.mkdirSync(path.join(wikiPath, 'episodic'), { recursive: true });

  fs.writeFileSync(path.join(wikiPath, 'raw', 'articles', 'article-a.md'), rawFm('Article A', 'https://a.com'));
  fs.writeFileSync(path.join(wikiPath, 'raw', 'articles', 'article-b.md'), rawFm('Article B', 'https://b.com'));
  fs.writeFileSync(path.join(wikiPath, 'raw', 'articles', 'article-c.md'), rawFm('Article C', 'https://c.com'));
  fs.writeFileSync(path.join(wikiPath, 'raw', 'articles', 'partial.md'), rawFm('Partial', 'https://p.com', 'extraction: partial\n'));

  fs.writeFileSync(path.join(wikiPath, 'episodic', 'article-a.md'), episodicFm('Article A', 'https://a.com'));

  const wikisJson = { version: 1, wikis: [{ name: 'test-wiki', path: wikiPath, description: 'Test' }] };
  fs.writeFileSync(path.join(tmpDir, 'wikis.json'), JSON.stringify(wikisJson));
  process.env.WIKIS_JSON_PATH = path.join(tmpDir, 'wikis.json');
  process.env.NANOCLAW_AGENT_DIR = tmpDir;
});

afterEach(() => {
  for (const [k, v] of Object.entries(origEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// Mock dispatch to avoid real llama-cpp calls
const origFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = mock(async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: '## Summary\n\nTest.\n\n## Key Points\n\n- Point' } }] }), { status: 200 }),
  ) as any;
});
afterEach(() => { globalThis.fetch = origFetch; });

describe('buildEpisodicSourceUrls', () => {
  test('builds Set from episodic dir', () => {
    const wikiPath = path.join(tmpDir, 'test-wiki');
    const urls = buildEpisodicSourceUrls(path.join(wikiPath, 'episodic'));
    expect(urls.has('https://a.com')).toBe(true);
    expect(urls.size).toBe(1);
  });

  test('returns empty Set for missing dir', () => {
    const urls = buildEpisodicSourceUrls('/nonexistent');
    expect(urls.size).toBe(0);
  });
});

describe('research_summarize stateful (raw_dir)', () => {
  test('dispatches unsummarized articles, skips existing', async () => {
    const wikiPath = path.join(tmpDir, 'test-wiki');
    const result = await summarizeHandler({
      wiki: 'test-wiki',
      raw_dir: path.join(wikiPath, 'raw', 'articles'),
      batch_size: 60,
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.dispatched).toBe(2); // b and c (a already has episodic)
    expect(data.skipped_existing).toBe(1); // a
    expect(data.skipped_partial).toBe(1); // partial
    expect(data.remaining).toBe(0);
  });

  test('writes summarize-state.json', async () => {
    const wikiPath = path.join(tmpDir, 'test-wiki');
    await summarizeHandler({
      wiki: 'test-wiki',
      raw_dir: path.join(wikiPath, 'raw', 'articles'),
    });
    const statePath = path.join(tmpDir, 'summarize-state.json');
    expect(fs.existsSync(statePath)).toBe(true);
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    expect(state.wiki).toBe('test-wiki');
    expect(state.total_raw).toBe(4);
    expect(state.remaining).toBe(0);
  });

  test('batch_size limits dispatch count', async () => {
    const wikiPath = path.join(tmpDir, 'test-wiki');
    const result = await summarizeHandler({
      wiki: 'test-wiki',
      raw_dir: path.join(wikiPath, 'raw', 'articles'),
      batch_size: 1,
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.dispatched).toBe(1);
    expect(data.remaining).toBe(1); // one more unsummarized
  });

  test('returns done when all summarized', async () => {
    const wikiPath = path.join(tmpDir, 'test-wiki');
    // Add episodic for b and c too
    fs.writeFileSync(path.join(wikiPath, 'episodic', 'article-b.md'), episodicFm('Article B', 'https://b.com'));
    fs.writeFileSync(path.join(wikiPath, 'episodic', 'article-c.md'), episodicFm('Article C', 'https://c.com'));

    const result = await summarizeHandler({
      wiki: 'test-wiki',
      raw_dir: path.join(wikiPath, 'raw', 'articles'),
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.dispatched).toBe(0);
    expect(data.remaining).toBe(0);
    expect(data.message).toContain('All raw articles');
  });

  test('returns error for missing raw_dir', async () => {
    const result = await summarizeHandler({ wiki: 'test-wiki', raw_dir: '/nonexistent' });
    expect(result.content[0].text).toContain('Error');
  });

  test('includes review_args in response', async () => {
    const wikiPath = path.join(tmpDir, 'test-wiki');
    const result = await summarizeHandler({
      wiki: 'test-wiki',
      raw_dir: path.join(wikiPath, 'raw', 'articles'),
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.review_args).toBeDefined();
    expect(data.review_args.wiki).toBe('test-wiki');
    expect(data.review_args.raw_dir).toContain('raw/articles');
  });
});

describe('research_summarize legacy (paths)', () => {
  test('paths param still works for backward compat', async () => {
    const wikiPath = path.join(tmpDir, 'test-wiki');
    const result = await summarizeHandler({
      wiki: 'test-wiki',
      paths: [path.join(wikiPath, 'raw', 'articles', 'article-b.md')],
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.dispatched).toBe(1);
  });

  test('requires either paths or raw_dir', async () => {
    const result = await summarizeHandler({ wiki: 'test-wiki' });
    expect(result.content[0].text).toContain('Error');
  });
});

describe('research_summarize claims_only mode', () => {
  test('claims_only=true dispatches with claims tier and claim-only boundaries', async () => {
    const wikiPath = path.join(tmpDir, 'test-wiki');
    await summarizeHandler({
      wiki: 'test-wiki',
      raw_dir: path.join(wikiPath, 'raw', 'articles'),
      claims_only: true,
      batch_size: 1,
    });

    // Read the dispatched task contract from worker-tasks/
    const tasksDir = path.join(tmpDir, 'worker-tasks');
    const taskFiles = fs.readdirSync(tasksDir).filter((f) => f.endsWith('.json'));
    expect(taskFiles.length).toBe(1);

    const state = JSON.parse(fs.readFileSync(path.join(tasksDir, taskFiles[0]), 'utf8'));
    const contract = state.contract;

    // write_to.tier should be 'claims'
    expect(contract.write_to.tier).toBe('claims');

    // postconditions should require ## Claims but NOT ## Summary
    const substrings = contract.postconditions
      .filter((p: any) => p.type === 'contains')
      .map((p: any) => p.params.substring);
    expect(substrings).toContain('## Claims');
    expect(substrings).not.toContain('## Summary');
  });

  test('claims_only=false (default) still dispatches with episodic tier', async () => {
    const wikiPath = path.join(tmpDir, 'test-wiki');
    await summarizeHandler({
      wiki: 'test-wiki',
      raw_dir: path.join(wikiPath, 'raw', 'articles'),
      batch_size: 1,
    });

    const tasksDir = path.join(tmpDir, 'worker-tasks');
    const taskFiles = fs.readdirSync(tasksDir).filter((f) => f.endsWith('.json'));
    expect(taskFiles.length).toBe(1);

    const state = JSON.parse(fs.readFileSync(path.join(tasksDir, taskFiles[0]), 'utf8'));
    expect(state.contract.write_to.tier).toBe('episodic');

    const substrings = state.contract.postconditions
      .filter((p: any) => p.type === 'contains')
      .map((p: any) => p.params.substring);
    expect(substrings).toContain('## Summary');
  });
});

describe('research_summarize insights_only mode', () => {
  test('insights_only=true dispatches with insights tier and insight-only boundaries', async () => {
    const wikiPath = path.join(tmpDir, 'test-wiki');
    await summarizeHandler({
      wiki: 'test-wiki',
      raw_dir: path.join(wikiPath, 'raw', 'articles'),
      insights_only: true,
      batch_size: 1,
    });

    const tasksDir = path.join(tmpDir, 'worker-tasks');
    const taskFiles = fs.readdirSync(tasksDir).filter((f) => f.endsWith('.json'));
    expect(taskFiles.length).toBe(1);

    const state = JSON.parse(fs.readFileSync(path.join(tasksDir, taskFiles[0]), 'utf8'));
    const contract = state.contract;

    expect(contract.write_to.tier).toBe('insights');

    const substrings = contract.postconditions
      .filter((p: any) => p.type === 'contains')
      .map((p: any) => p.params.substring);
    expect(substrings).toContain('## Insights');
    expect(substrings).not.toContain('## Summary');
    expect(substrings).not.toContain('## Claims');

    // Objective should mention insights/heuristics
    expect(contract.objective.toLowerCase()).toMatch(/insight|heuristic|pattern/);
  });

  test('insights_only=false (default) still dispatches with episodic tier', async () => {
    const wikiPath = path.join(tmpDir, 'test-wiki');
    await summarizeHandler({
      wiki: 'test-wiki',
      raw_dir: path.join(wikiPath, 'raw', 'articles'),
      batch_size: 1,
    });

    const tasksDir = path.join(tmpDir, 'worker-tasks');
    const taskFiles = fs.readdirSync(tasksDir).filter((f) => f.endsWith('.json'));
    expect(taskFiles.length).toBe(1);

    const state = JSON.parse(fs.readFileSync(path.join(tasksDir, taskFiles[0]), 'utf8'));
    expect(state.contract.write_to.tier).toBe('episodic');
  });
});
