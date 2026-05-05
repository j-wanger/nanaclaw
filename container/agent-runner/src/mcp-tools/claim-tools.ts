import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';
import { embedClaims } from './claim-embed-pipeline.js';
import { embedText } from './claim-embeddings.js';
import { KnowledgeVectorStore } from './knowledge-vector-store.js';
import { cosineSimilarity } from './vector-utils.js';
import { resolveWikiPath, text, type CallToolResult } from './wiki-utils.js';

export async function handleClaimEmbed(args: Record<string, unknown>): Promise<CallToolResult> {
  const wiki = (args.wiki as string || '').trim();
  if (!wiki) return text('Error: wiki is required');

  const wikiPath = resolveWikiPath(wiki);
  if (!wikiPath) return text('Error: wiki not found');

  const result = await embedClaims(wikiPath);
  return text(JSON.stringify({ embedded: result.embedded, skipped: result.skipped, deduped: result.deduped }));
}

export async function handleClaimSearch(args: Record<string, unknown>): Promise<CallToolResult> {
  const wiki = (args.wiki as string || '').trim();
  const query = (args.query as string || '').trim();
  const topK = (args.top_k as number) || 10;

  if (!wiki) return text('Error: wiki is required');
  if (!query) return text('Error: query is required');

  const wikiPath = resolveWikiPath(wiki);
  if (!wikiPath) return text('Error: wiki not found');

  const queryVec = await embedText(query);
  if (!queryVec) return text('Error: embedding service unavailable');

  const store = new KnowledgeVectorStore(wikiPath);
  try {
    const results = store.searchSimilar(queryVec, topK, 'claim');
    return text(JSON.stringify({
      results: results.map((r) => ({
        text: r.text,
        source_url: r.source_url,
        source_score: r.source_score,
        similarity: Math.round(r.similarity * 1000) / 1000,
      })),
    }));
  } finally {
    store.close();
  }
}

export async function handleClaimDedup(args: Record<string, unknown>): Promise<CallToolResult> {
  const wiki = (args.wiki as string || '').trim();
  const threshold = (args.threshold as number) || 0.92;

  if (!wiki) return text('Error: wiki is required');

  const wikiPath = resolveWikiPath(wiki);
  if (!wikiPath) return text('Error: wiki not found');

  const store = new KnowledgeVectorStore(wikiPath);
  try {
    const rows = store.db_allWithEmbeddings('claim');
    const pairs: Array<{ a: { text: string; source_url: string | null }; b: { text: string; source_url: string | null }; similarity: number }> = [];
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const sim = cosineSimilarity(rows[i].embedding, rows[j].embedding);
        if (sim > threshold) {
          pairs.push({
            a: { text: rows[i].text, source_url: rows[i].source_url },
            b: { text: rows[j].text, source_url: rows[j].source_url },
            similarity: Math.round(sim * 1000) / 1000,
          });
        }
      }
    }
    return text(JSON.stringify({ duplicates: pairs }));
  } finally {
    store.close();
  }
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'claim_embed',
      description: 'Embed claims from claims.jsonl into the unified knowledge store (knowledge.db). Incremental — only processes new entries since last run.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          wiki: { type: 'string', description: 'Wiki name to embed claims for' },
        },
        required: ['wiki'],
      },
    },
    handler: handleClaimEmbed,
  },
  {
    tool: {
      name: 'claim_search',
      description: 'Search claims by semantic similarity. Returns top-k matching claims with source attribution.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          wiki: { type: 'string', description: 'Wiki name to search' },
          query: { type: 'string', description: 'Search query text' },
          top_k: { type: 'number', description: 'Number of results (default: 10)' },
        },
        required: ['wiki', 'query'],
      },
    },
    handler: handleClaimSearch,
  },
  {
    tool: {
      name: 'claim_dedup',
      description: 'Find duplicate claims above a similarity threshold. Returns pairs with source attribution for manual review.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          wiki: { type: 'string', description: 'Wiki name to check for duplicates' },
          threshold: { type: 'number', description: 'Similarity threshold (default: 0.92)' },
        },
        required: ['wiki'],
      },
    },
    handler: handleClaimDedup,
  },
];

registerTools(tools);
