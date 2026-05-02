import fs from 'fs';
import path from 'path';
import os from 'os';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';
import { KnowledgeVectorStore } from './knowledge-vector-store.js';
import { findArticleConflicts, findQueryConflicts } from './knowledge-conflicts.js';
import { discoverClaimsInArticle } from './knowledge-discovery.js';
import { classifyConflictPairs, validateClaimCandidates } from './knowledge-classify.js';
import { embedText } from './claim-embeddings.js';

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

export async function handleKnowledgeConflicts(args: Record<string, unknown>): Promise<CallToolResult> {
  const wiki = (args.wiki as string || '').trim();
  const articleSlug = (args.article_slug as string || '').trim();
  const query = (args.query as string || '').trim();
  const topK = (args.top_k as number) || 20;
  const threshold = (args.threshold as number) || 0.7;
  const classify = args.classify !== false;

  if (!wiki) return text('Error: wiki is required');
  if (!articleSlug && !query) return text('Error: article_slug or query is required');

  const wikiPath = resolveWikiPath(wiki);
  if (!wikiPath) return text('Error: wiki not found');

  const store = new KnowledgeVectorStore(wikiPath);
  try {
    let pairs;
    if (articleSlug) {
      pairs = findArticleConflicts(store, articleSlug, topK, threshold);
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

export async function handleClaimDiscover(args: Record<string, unknown>): Promise<CallToolResult> {
  const wiki = (args.wiki as string || '').trim();
  const articleSlug = (args.article_slug as string || '').trim();
  const topK = (args.top_k as number) || 20;
  const minSimilarity = (args.min_similarity as number) || 0.0;
  const validate = args.validate !== false;

  if (!wiki) return text('Error: wiki is required');
  if (!articleSlug) return text('Error: article_slug is required');

  const wikiPath = resolveWikiPath(wiki);
  if (!wikiPath) return text('Error: wiki not found');

  const store = new KnowledgeVectorStore(wikiPath);
  try {
    const candidates = discoverClaimsInArticle(store, articleSlug, topK, minSimilarity);

    if (validate && candidates.length > 0) {
      const validated = await validateClaimCandidates(candidates);
      return text(JSON.stringify({
        candidates: validated.map((c) => ({
          text: c.text,
          article_slug: c.article_slug,
          section: c.section,
          similarity: c.similarity,
          nearestClaim: c.nearestClaim,
          validated: c.validated ?? null,
          explanation: c.explanation ?? null,
        })),
      }));
    }

    return text(JSON.stringify({
      candidates: candidates.map((c) => ({
        text: c.text,
        article_slug: c.article_slug,
        section: c.section,
        similarity: c.similarity,
        nearestClaim: c.nearestClaim,
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
        },
        required: ['wiki'],
      },
    },
    handler: handleKnowledgeConflicts,
  },
  {
    tool: {
      name: 'claim_discover',
      description: 'Discover unclaimed sentences that resemble existing claims. Ranks sentences in a given article by their similarity to known claims, optionally validated by a Qwen worker. High-similarity unclaimed sentences are likely missed extraction candidates.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          wiki: { type: 'string', description: 'Wiki name' },
          article_slug: { type: 'string', description: 'Article to scan for claim candidates' },
          top_k: { type: 'number', description: 'Maximum number of candidates (default: 20)' },
          min_similarity: { type: 'number', description: 'Minimum similarity to nearest claim (default: 0.0)' },
          validate: { type: 'boolean', description: 'Validate candidates via Qwen worker (default: true). Set false for embedding-only ranking.' },
        },
        required: ['wiki', 'article_slug'],
      },
    },
    handler: handleClaimDiscover,
  },
];

registerTools(tools);
