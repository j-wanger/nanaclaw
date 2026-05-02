import fs from 'fs';
import path from 'path';
import os from 'os';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';
import { embedText } from './claim-embeddings.js';
import { KnowledgeVectorStore } from './knowledge-vector-store.js';
import { embedSentences } from './sentence-embed-pipeline.js';

interface WikiEntry { name: string; path: string; description: string; }

function loadWikis(): WikiEntry[] | null {
  const wikisPath = process.env.WIKIS_JSON_PATH || path.join(os.homedir(), '.claude', 'wikis.json');
  try {
    return (JSON.parse(fs.readFileSync(wikisPath, 'utf8')) as { wikis: WikiEntry[] }).wikis || [];
  } catch { return null; }
}

function resolveWikiPath(wikiName: string): string | null {
  const wikis = loadWikis();
  const entry = wikis?.find((w) => w.name === wikiName) || wikis?.[0];
  return entry?.path || null;
}

function text(msg: string): CallToolResult {
  return { content: [{ type: 'text', text: msg }] };
}

export async function handleKnowledgeSearch(args: Record<string, unknown>): Promise<CallToolResult> {
  const wiki = (args.wiki as string || '').trim();
  const query = (args.query as string || '').trim();
  const topK = (args.top_k as number) || 10;
  const type = (args.type as string | undefined)?.trim() || undefined;

  if (!wiki) return text('Error: wiki is required');
  if (!query) return text('Error: query is required');

  const wikiPath = resolveWikiPath(wiki);
  if (!wikiPath) return text('Error: wiki not found');

  const queryVec = await embedText(query);
  if (!queryVec) return text('Error: embedding service unavailable');

  const store = new KnowledgeVectorStore(wikiPath);
  try {
    const validType = type === 'claim' || type === 'sentence' || type === 'insight' ? type : undefined;
    const results = store.searchSimilar(queryVec, topK, validType);
    return text(JSON.stringify({
      results: results.map((r) => ({
        text: r.text,
        type: r.type,
        source_url: r.source_url,
        article_slug: r.article_slug,
        section: r.section,
        similarity: Math.round(r.similarity * 1000) / 1000,
      })),
    }));
  } finally {
    store.close();
  }
}

export async function handleKnowledgeEmbed(args: Record<string, unknown>): Promise<CallToolResult> {
  const wiki = (args.wiki as string || '').trim();
  const source = (args.source as string || 'raw').trim();

  if (!wiki) return text('Error: wiki is required');

  const wikiPath = resolveWikiPath(wiki);
  if (!wikiPath) return text('Error: wiki not found');

  const dir = source === 'episodic'
    ? path.join(wikiPath, 'episodic')
    : path.join(wikiPath, 'raw', 'articles');

  if (!fs.existsSync(dir)) return text(`Error: directory not found: ${dir}`);

  const articlePaths = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(dir, f));

  const result = await embedSentences(wikiPath, articlePaths, wiki);
  return text(JSON.stringify({
    embedded: result.embedded,
    skipped: result.skipped,
    articles_processed: result.articles_processed,
  }));
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'knowledge_search',
      description: 'Semantic search across the unified knowledge store (claims + insights + sentences). Returns top-k matches with similarity scores, type, and source attribution. Use type filter to search only claims, insights, or sentences.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          wiki: { type: 'string', description: 'Wiki name to search' },
          query: { type: 'string', description: 'Search query text' },
          top_k: { type: 'number', description: 'Number of results (default: 10)' },
          type: { type: 'string', description: 'Filter by type: "claim", "insight", or "sentence". Omit for all.' },
        },
        required: ['wiki', 'query'],
      },
    },
    handler: handleKnowledgeSearch,
  },
  {
    tool: {
      name: 'knowledge_embed',
      description: 'Embed article sentences into the unified knowledge store (knowledge.db). Splits articles into sentences, adds contextual prefix [title | section], embeds via nomic-embed, classifies as type=claim or type=sentence. Incremental — tracks processed articles in sentence-embed-state.json.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          wiki: { type: 'string', description: 'Wiki name to embed' },
          source: { type: 'string', description: 'Article source: "raw" (default) or "episodic"' },
        },
        required: ['wiki'],
      },
    },
    handler: handleKnowledgeEmbed,
  },
];

registerTools(tools);
