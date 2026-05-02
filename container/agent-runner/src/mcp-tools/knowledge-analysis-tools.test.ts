import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { handleKnowledgeConflicts, handleClaimDiscover } from './knowledge-analysis-tools.js';
import { KnowledgeVectorStore } from './knowledge-vector-store.js';

let tmpDir: string;
let wikiDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'analysis-tools-test-'));
  wikiDir = path.join(tmpDir, 'test-wiki');
  fs.mkdirSync(wikiDir, { recursive: true });

  const wikisJsonPath = path.join(tmpDir, 'wikis.json');
  fs.writeFileSync(wikisJsonPath, JSON.stringify({
    version: 1,
    wikis: [{ name: 'test-wiki', path: wikiDir, description: 'Test wiki' }],
  }));
  process.env.WIKIS_JSON_PATH = wikisJsonPath;
});

afterEach(() => {
  delete process.env.WIKIS_JSON_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeEmb(values: number[]): Float32Array {
  const arr = new Float32Array(4);
  for (let i = 0; i < values.length && i < 4; i++) arr[i] = values[i];
  return arr;
}

function seedStore() {
  const store = new KnowledgeVectorStore(wikiDir);
  store.insertEntry({ text: 'Water boils at 100C.', contextual_text: '[A | Physics] Water boils at 100C.', type: 'sentence', source_url: 'https://a.com', article_slug: 'article-a', section: 'Physics', source_score: 0.9, wiki: 'test-wiki', embedding: makeEmb([1, 0, 0, 0]) });
  store.insertEntry({ text: 'Water boils at 99C under pressure.', contextual_text: '[B | Chemistry] Water boils at 99C under pressure.', type: 'sentence', source_url: 'https://b.com', article_slug: 'article-b', section: 'Chemistry', source_score: 0.7, wiki: 'test-wiki', embedding: makeEmb([0.98, 0.05, 0, 0]) });
  store.insertEntry({ text: 'The sky is blue.', contextual_text: '[B | Optics] The sky is blue.', type: 'sentence', source_url: 'https://b.com', article_slug: 'article-b', section: 'Optics', source_score: 0.7, wiki: 'test-wiki', embedding: makeEmb([0, 0, 1, 0]) });

  // Claims for discovery
  store.insertEntry({ text: 'CEO convicted of fraud.', contextual_text: 'CEO convicted of fraud.', type: 'claim', source_url: null, article_slug: 'ref', section: '', source_score: 0.8, wiki: 'test-wiki', embedding: makeEmb([0, 1, 0, 0]) });

  // A sentence in article-a that looks like a claim
  store.insertEntry({ text: 'Director found guilty of embezzlement.', contextual_text: '[A | Findings] Director found guilty.', type: 'sentence', source_url: 'https://a.com', article_slug: 'article-a', section: 'Findings', source_score: 0.9, wiki: 'test-wiki', embedding: makeEmb([0.05, 0.95, 0, 0]) });

  store.close();
}

describe('handleKnowledgeConflicts', () => {
  test('returns error when wiki is missing', async () => {
    const result = await handleKnowledgeConflicts({ article_slug: 'a' });
    expect(result.content[0].text).toContain('Error');
  });

  test('returns error when neither article_slug nor query provided', async () => {
    const result = await handleKnowledgeConflicts({ wiki: 'test-wiki' });
    expect(result.content[0].text).toContain('Error');
  });

  test('returns cross-article pairs for article_slug', async () => {
    seedStore();
    const result = await handleKnowledgeConflicts({ wiki: 'test-wiki', article_slug: 'article-a', classify: false });
    const data = JSON.parse(result.content[0].text);
    expect(data.pairs.length).toBeGreaterThan(0);
    for (const pair of data.pairs) {
      const slugs = [pair.a.article_slug, pair.b.article_slug];
      expect(slugs).toContain('article-a');
      expect(slugs[0]).not.toBe(slugs[1]);
    }
  });

  test('returns empty pairs for unknown article', async () => {
    seedStore();
    const result = await handleKnowledgeConflicts({ wiki: 'test-wiki', article_slug: 'nonexistent', classify: false });
    const data = JSON.parse(result.content[0].text);
    expect(data.pairs).toHaveLength(0);
  });

  test("type_filter='claim' restricts pairs to claim-vs-claim", async () => {
    const store = new KnowledgeVectorStore(wikiDir);
    store.insertEntry({ text: 'C in A', contextual_text: 'C in A', type: 'claim', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: makeEmb([1, 0, 0, 0]) });
    store.insertEntry({ text: 'I in A', contextual_text: 'I in A', type: 'insight', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: makeEmb([0.99, 0.05, 0, 0]) });
    store.insertEntry({ text: 'C in B', contextual_text: 'C in B', type: 'claim', source_url: null, article_slug: 'b', section: '', source_score: 0, wiki: 'w', embedding: makeEmb([0.98, 0.03, 0, 0]) });
    store.insertEntry({ text: 'I in B', contextual_text: 'I in B', type: 'insight', source_url: null, article_slug: 'b', section: '', source_score: 0, wiki: 'w', embedding: makeEmb([0.97, 0.06, 0, 0]) });
    store.close();

    const result = await handleKnowledgeConflicts({ wiki: 'test-wiki', article_slug: 'a', classify: false, type_filter: 'claim', threshold: 0.5 });
    const data = JSON.parse(result.content[0].text);
    expect(data.pairs.length).toBeGreaterThan(0);
    for (const p of data.pairs) {
      expect(p.a.text).toMatch(/^C in/);
      expect(p.b.text).toMatch(/^C in/);
    }
  });
});

describe('handleClaimDiscover', () => {
  test('returns error when wiki is missing', async () => {
    const result = await handleClaimDiscover({ article_slug: 'a' });
    expect(result.content[0].text).toContain('Error');
  });

  test('returns error when article_slug is missing', async () => {
    const result = await handleClaimDiscover({ wiki: 'test-wiki' });
    expect(result.content[0].text).toContain('Error');
  });

  test('returns ranked candidates for article', async () => {
    seedStore();
    const result = await handleClaimDiscover({ wiki: 'test-wiki', article_slug: 'article-a', validate: false });
    const data = JSON.parse(result.content[0].text);
    expect(data.candidates.length).toBeGreaterThan(0);

    // Sorted descending by similarity
    for (let i = 1; i < data.candidates.length; i++) {
      expect(data.candidates[i].similarity).toBeLessThanOrEqual(data.candidates[i - 1].similarity);
    }
  });

  test('returns empty candidates for unknown article', async () => {
    seedStore();
    const result = await handleClaimDiscover({ wiki: 'test-wiki', article_slug: 'nonexistent', validate: false });
    const data = JSON.parse(result.content[0].text);
    expect(data.candidates).toHaveLength(0);
  });
});
