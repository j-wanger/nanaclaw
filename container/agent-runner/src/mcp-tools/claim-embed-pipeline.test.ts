import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { embedClaims } from './claim-embed-pipeline.js';
import { KnowledgeVectorStore } from './knowledge-vector-store.js';

let tmpDir: string;
const origFetch = globalThis.fetch;

function makeClaimLine(claim: string, url: string | null = null): string {
  return JSON.stringify({
    claim,
    source_url: url,
    source_score: 0.5,
    wiki: 'test-wiki',
    created: '2026-04-30',
  });
}

function mockEmbeddings(count: number) {
  const embeddings = Array.from({ length: count }, (_, i) => ({
    embedding: new Array(768).fill(0).map((_, j) => (i + 1) * 0.01 + j * 0.001),
  }));
  return new Response(JSON.stringify(embeddings), { status: 200 });
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'embed-pipeline-test-'));
});

afterEach(() => {
  globalThis.fetch = origFetch;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('embedClaims', () => {
  test('reads JSONL entries and stores embedded claims in claims.db', async () => {
    const jsonl = [
      makeClaimLine('Water boils at 100°C', 'https://a.com'),
      makeClaimLine('The sky is blue', 'https://b.com'),
    ].join('\n') + '\n';
    fs.writeFileSync(path.join(tmpDir, 'claims.jsonl'), jsonl);

    globalThis.fetch = mock(() => Promise.resolve(mockEmbeddings(2))) as any;

    const result = await embedClaims(tmpDir);
    expect(result.embedded).toBe(2);

    const store = new KnowledgeVectorStore(tmpDir);
    const results = store.searchSimilar(new Float32Array(768), 10, 'claim');
    expect(results.length).toBe(2);
    store.close();
  });

  test('incremental processing skips already-processed entries via offset', async () => {
    const jsonl = [
      makeClaimLine('Claim 1'),
      makeClaimLine('Claim 2'),
    ].join('\n') + '\n';
    fs.writeFileSync(path.join(tmpDir, 'claims.jsonl'), jsonl);
    fs.writeFileSync(path.join(tmpDir, 'embed-state.json'), JSON.stringify({ processedLines: 2 }));

    globalThis.fetch = mock(() => Promise.resolve(mockEmbeddings(1))) as any;

    const result = await embedClaims(tmpDir);
    expect(result.embedded).toBe(0);
    expect(result.skipped).toBe(2);
  });

  test('processes new lines appended after previous run', async () => {
    const jsonl = [
      makeClaimLine('Claim 1'),
      makeClaimLine('Claim 2'),
      makeClaimLine('Claim 3'),
    ].join('\n') + '\n';
    fs.writeFileSync(path.join(tmpDir, 'claims.jsonl'), jsonl);
    fs.writeFileSync(path.join(tmpDir, 'embed-state.json'), JSON.stringify({ processedLines: 2 }));

    globalThis.fetch = mock(() => Promise.resolve(mockEmbeddings(1))) as any;

    const result = await embedClaims(tmpDir);
    expect(result.embedded).toBe(1);
    expect(result.skipped).toBe(2);

    const state = JSON.parse(fs.readFileSync(path.join(tmpDir, 'embed-state.json'), 'utf8'));
    expect(state.processedLines).toBe(3);
  });

  test('dedup fallback when offset exceeds actual lines', async () => {
    const jsonl = [
      makeClaimLine('Claim A'),
      makeClaimLine('Claim B'),
    ].join('\n') + '\n';
    fs.writeFileSync(path.join(tmpDir, 'claims.jsonl'), jsonl);
    // Offset claims more lines than exist — inconsistent state
    fs.writeFileSync(path.join(tmpDir, 'embed-state.json'), JSON.stringify({ processedLines: 999 }));

    const store = new KnowledgeVectorStore(tmpDir);
    store.insertEntry({ text: 'Claim A', contextual_text: 'Claim A', type: 'claim', source_url: null, article_slug: '', section: '', source_score: 0.5, wiki: 'test-wiki', embedding: new Float32Array(768) });
    store.close();

    globalThis.fetch = mock(() => Promise.resolve(mockEmbeddings(1))) as any;

    const result = await embedClaims(tmpDir);
    // Should fall back to dedup: Claim A already in DB, only Claim B is new
    expect(result.embedded).toBe(1);
    expect(result.deduped).toBe(1);
  });

  test('returns zero when no claims.jsonl exists', async () => {
    const result = await embedClaims(tmpDir);
    expect(result.embedded).toBe(0);
  });
});
