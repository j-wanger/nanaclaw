import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { validateContract, type TaskContract } from './local-worker/contract.js';

/**
 * Pipeline integration test: verifies that the output of web_search can flow
 * through to a dispatch_worker research contract and that the synthesized
 * output is compatible with wiki_write.
 */

let originalFetch: typeof globalThis.fetch;
let tmpDir: string;

let searchHandler: (args: Record<string, unknown>) => Promise<CallToolResult>;
let extractHandler: (args: Record<string, unknown>) => Promise<CallToolResult>;
let writeHandler: (args: Record<string, unknown>) => Promise<CallToolResult>;

function getText(result: CallToolResult): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

const MOCK_SEARCH_RESPONSE = {
  results: [
    { title: 'GraphRAG Overview', url: 'https://example.com/graphrag', content: 'Microsoft GraphRAG uses knowledge graphs for retrieval.' },
    { title: 'RAG Patterns 2026', url: 'https://example.com/rag', content: 'Corrective RAG improves retrieval quality.' },
  ],
};

const MOCK_HTML = `<!DOCTYPE html><html><head><title>GraphRAG</title></head><body>
<article><h1>GraphRAG</h1>
<p>GraphRAG builds a knowledge graph from documents, then uses community summaries for retrieval. This approach outperforms naive RAG on global queries by 20-30%. The pipeline has three stages: indexing, community detection, and query-time summarization.</p>
<p>Key finding: hierarchical community structure captures both local and global relationships. This enables multi-hop reasoning that traditional vector similarity cannot achieve.</p>
<p>Implementation uses LLM-extracted entities and relationships stored in a graph database. Query routing decides between local search (direct entity lookup) and global search (community summary aggregation).</p>
</article></body></html>`;

const MOCK_WIKIS = {
  version: 1,
  wikis: [
    { name: 'agentic-engineering-wiki', path: '', description: 'AI agent systems, context engineering, harness design, workflow patterns.' },
  ],
};

beforeEach(async () => {
  originalFetch = globalThis.fetch;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-test-'));

  MOCK_WIKIS.wikis[0].path = tmpDir;
  fs.mkdirSync(path.join(tmpDir, 'inbox'), { recursive: true });

  const wikisPath = path.join(tmpDir, 'wikis.json');
  fs.writeFileSync(wikisPath, JSON.stringify(MOCK_WIKIS));
  process.env.WIKIS_JSON_PATH = wikisPath;
  process.env.SEARXNG_URL = 'http://localhost:8888';

  const search = await import('./web-search.js');
  const extract = await import('./web-extract.js');
  const wiki = await import('./wiki-write.js');
  searchHandler = search.searchHandler;
  extractHandler = extract.extractHandler;
  writeHandler = wiki.writeHandler;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.WIKIS_JSON_PATH;
  delete process.env.SEARXNG_URL;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('web research pipeline', () => {
  it('search results can be serialized into dispatch_worker contract context', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(MOCK_SEARCH_RESPONSE), { status: 200, headers: { 'content-type': 'application/json' } })),
    ) as typeof fetch;

    const searchResult = await searchHandler({ query: 'GraphRAG knowledge graph retrieval' });
    const searchText = getText(searchResult);
    const results = JSON.parse(searchText);

    expect(results.length).toBe(2);

    const contract: TaskContract = {
      id: 'pipeline-test-1',
      type: 'research',
      objective: 'Synthesize findings on GraphRAG vs traditional RAG',
      outputFormat: 'markdown',
      context: `Search results:\n${results.map((r: { title: string; url: string; snippet: string }) => `- ${r.title}: ${r.snippet} (${r.url})`).join('\n')}`,
      boundaries: ['Do not hallucinate sources', 'Cite URLs from context'],
      postconditions: [
        { type: 'contains', params: { substring: '## Key Findings' } },
        { type: 'line-count', params: { min: '5', max: '200' } },
      ],
      timeout_ms: 60000,
      context_budget_tokens: 4096,
    };

    const validation = validateContract(contract);
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);
    expect(contract.context).toContain('GraphRAG');
    expect(contract.type).toBe('research');
  });

  it('extracted content fits within worker context budget', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(MOCK_HTML, { status: 200, headers: { 'content-type': 'text/html' } })),
    ) as typeof fetch;

    const extractResult = await extractHandler({ url: 'https://example.com/graphrag', max_chars: 8000 });
    const content = getText(extractResult);

    expect(content.length).toBeLessThan(8100);
    expect(content).toContain('GraphRAG');

    const contract: TaskContract = {
      id: 'pipeline-test-2',
      type: 'research',
      objective: 'Summarize GraphRAG approach',
      outputFormat: 'markdown',
      context: content,
      boundaries: [],
      postconditions: [],
      timeout_ms: 60000,
      context_budget_tokens: 6000,
    };

    const validation = validateContract(contract);
    expect(validation.valid).toBe(true);
  });

  it('synthesized output is compatible with wiki_write', async () => {
    const synthesized = `## Key Findings

- GraphRAG outperforms naive RAG on global queries by 20-30%
- Hierarchical community structure enables multi-hop reasoning
- Three-stage pipeline: indexing, community detection, query-time summarization

## Sources

| # | Title | URL |
|---|-------|-----|
| 1 | GraphRAG Overview | https://example.com/graphrag |
| 2 | RAG Patterns 2026 | https://example.com/rag |

## Open Questions

- How does GraphRAG scale to 1M+ document corpora?`;

    const wikiResult = await writeHandler({
      title: 'GraphRAG vs Traditional RAG',
      content: synthesized,
      tags: ['rag', 'knowledge-graph', 'retrieval'],
      topic: 'agent systems context engineering retrieval',
    });

    const text = getText(wikiResult);
    expect(text).toContain('agentic-engineering-wiki');

    const files = fs.readdirSync(path.join(tmpDir, 'inbox'));
    expect(files.length).toBe(1);

    const written = fs.readFileSync(path.join(tmpDir, 'inbox', files[0]), 'utf8');
    expect(written).toContain('title: "GraphRAG vs Traditional RAG"');
    expect(written).toContain('source: web-research');
    expect(written).toContain('## Key Findings');
    expect(written).toContain('## Sources');
  });
});
