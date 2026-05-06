import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';
import { KnowledgeVectorStore } from './knowledge-vector-store.js';
import { findArticleConflicts, findQueryConflicts } from './knowledge-conflicts.js';
import { classifyConflictPairs } from './knowledge-classify.js';
import { embedText } from './claim-embeddings.js';
import { resolveWikiPath, text, type CallToolResult } from './wiki-utils.js';

export async function handleKnowledgeConflicts(args: Record<string, unknown>): Promise<CallToolResult> {
  const wiki = (args.wiki as string || '').trim();
  const articleSlug = (args.article_slug as string || '').trim();
  const query = (args.query as string || '').trim();
  const topK = (args.top_k as number) || 20;
  const threshold = (args.threshold as number) || 0.7;
  const classify = args.classify !== false;
  const rawTypeFilter = (args.type_filter as string | undefined)?.trim();
  const typeFilter = rawTypeFilter === 'claim' || rawTypeFilter === 'sentence' || rawTypeFilter === 'insight'
    ? rawTypeFilter
    : undefined;

  if (!wiki) return text('Error: wiki is required');
  if (!articleSlug && !query) return text('Error: article_slug or query is required');

  const wikiPath = resolveWikiPath(wiki);
  if (!wikiPath) return text('Error: wiki not found');

  const store = new KnowledgeVectorStore(wikiPath);
  try {
    let pairs;
    if (articleSlug) {
      pairs = findArticleConflicts(store, articleSlug, topK, threshold, typeFilter);
    } else {
      const queryVec = await embedText(query);
      if (!queryVec) return text('Error: embedding service unavailable');
      pairs = findQueryConflicts(store, queryVec, topK);
    }

    if (classify && pairs.length > 0) {
      const classified = await classifyConflictPairs(pairs);
      return text(JSON.stringify({
        pairs: classified.map((p) => ({
          a: { text: p.a.text, article_slug: p.a.article_slug, section: p.a.section, source_url: p.a.source_url },
          b: { text: p.b.text, article_slug: p.b.article_slug, section: p.b.section, source_url: p.b.source_url },
          similarity: p.similarity,
          classification: p.classification || null,
          explanation: p.explanation || null,
        })),
      }));
    }

    return text(JSON.stringify({
      pairs: pairs.map((p) => ({
        a: { text: p.a.text, article_slug: p.a.article_slug, section: p.a.section, source_url: p.a.source_url },
        b: { text: p.b.text, article_slug: p.b.article_slug, section: p.b.section, source_url: p.b.source_url },
        similarity: p.similarity,
      })),
    }));
  } finally {
    store.close();
  }
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'knowledge_conflicts',
      description: 'Find potential contradictions across wiki articles. Surfaces cross-article sentence pairs with high semantic similarity, optionally classified by a Qwen worker as agree/contradict/unrelated. Use article_slug for article-scoped analysis, or query for topic-based search.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          wiki: { type: 'string', description: 'Wiki name to search' },
          article_slug: { type: 'string', description: 'Article slug to find conflicts for' },
          query: { type: 'string', description: 'Alternative: search by query text instead of article_slug' },
          threshold: { type: 'number', description: 'Minimum similarity threshold (default: 0.7)' },
          top_k: { type: 'number', description: 'Maximum number of pairs to return (default: 20)' },
          classify: { type: 'boolean', description: 'Classify pairs via Qwen worker (default: true). Set false for embedding-only results.' },
          type_filter: { type: 'string', description: 'Restrict pairs to a single type: "claim", "insight", or "sentence". Omit to use the default (claims+sentences mixed; insight-vs-insight pairs excluded).' },
        },
        required: ['wiki'],
      },
    },
    handler: handleKnowledgeConflicts,
  },
];

registerTools(tools);
