import fs from 'fs';
import path from 'path';
import os from 'os';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';
import { embedText } from './claim-embeddings.js';
import { KnowledgeVectorStore } from './knowledge-vector-store.js';
import type { SearchResult, KnowledgeRow } from './knowledge-vector-store.js';
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

export interface ExpandedSearchResult {
  text: string;
  contextual_text: string;
  type: string;
  source_url: string | null;
  article_slug: string;
  section: string;
  similarity: number;
  parent_text?: string;
  matched_sentences?: string[];
}

interface WindowEntry {
  matchId: number;
  similarity: number;
  text: string;
  result: SearchResult;
  windowRows: KnowledgeRow[];
  minId: number;
  maxId: number;
}

export function expandSearchResults(
  results: SearchResult[],
  store: KnowledgeVectorStore,
  windowSize: number,
): ExpandedSearchResult[] {
  const byArticle = new Map<string, WindowEntry[]>();

  for (const r of results) {
    const windowRows = store.getWindow(r.id, r.article_slug, windowSize);
    if (windowRows.length === 0) continue;
    const entry: WindowEntry = {
      matchId: r.id,
      similarity: r.similarity,
      text: r.text,
      result: r,
      windowRows,
      minId: windowRows[0].id,
      maxId: windowRows[windowRows.length - 1].id,
    };
    const slug = r.article_slug;
    if (!byArticle.has(slug)) byArticle.set(slug, []);
    byArticle.get(slug)!.push(entry);
  }

  const expanded: ExpandedSearchResult[] = [];

  for (const [, entries] of byArticle) {
    entries.sort((a, b) => a.minId - b.minId);

    const groups: WindowEntry[][] = [];
    let current: WindowEntry[] = [entries[0]];

    for (let i = 1; i < entries.length; i++) {
      const prev = current[current.length - 1];
      if (entries[i].minId <= prev.maxId) {
        current.push(entries[i]);
      } else {
        groups.push(current);
        current = [entries[i]];
      }
    }
    groups.push(current);

    for (const group of groups) {
      const allRows = new Map<number, KnowledgeRow>();
      for (const entry of group) {
        for (const row of entry.windowRows) {
          allRows.set(row.id, row);
        }
      }
      const sorted = [...allRows.values()].sort((a, b) => a.id - b.id);
      const parentText = sorted.map((r) => r.text).join('\n');

      const bestMatch = group.reduce((a, b) => a.similarity > b.similarity ? a : b);
      expanded.push({
        text: bestMatch.result.text,
        contextual_text: bestMatch.result.contextual_text,
        type: bestMatch.result.type,
        source_url: bestMatch.result.source_url,
        article_slug: bestMatch.result.article_slug,
        section: bestMatch.result.section,
        similarity: bestMatch.result.similarity,
        parent_text: parentText,
        matched_sentences: group.map((e) => e.text),
      });
    }
  }

  expanded.sort((a, b) => b.similarity - a.similarity);
  return expanded;
}

export async function handleKnowledgeSearch(args: Record<string, unknown>): Promise<CallToolResult> {
  const wiki = (args.wiki as string || '').trim();
  const query = (args.query as string || '').trim();
  const topK = (args.top_k as number) || 10;
  const type = (args.type as string | undefined)?.trim() || undefined;
  const expand = (args.expand as string || 'none').trim();
  const windowSize = (args.window_size as number) || 3;

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

    if (expand === 'window') {
      const expanded = expandSearchResults(results, store, windowSize);
      return text(JSON.stringify({
        results: expanded.map((r) => ({
          text: r.text,
          contextual_text: r.contextual_text,
          type: r.type,
          source_url: r.source_url,
          article_slug: r.article_slug,
          section: r.section,
          similarity: Math.round(r.similarity * 1000) / 1000,
          parent_text: r.parent_text,
          matched_sentences: r.matched_sentences,
        })),
      }));
    }

    return text(JSON.stringify({
      results: results.map((r) => ({
        text: r.text,
        contextual_text: r.contextual_text,
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
      description: 'Semantic search across the unified knowledge store (claims + insights + sentences). Returns top-k matches with similarity scores, type, and source attribution. Use type filter to search only claims, insights, or sentences. Use expand="window" to include surrounding sentences as parent context (small-to-big retrieval).',
      inputSchema: {
        type: 'object' as const,
        properties: {
          wiki: { type: 'string', description: 'Wiki name to search' },
          query: { type: 'string', description: 'Search query text' },
          top_k: { type: 'number', description: 'Number of results (default: 10)' },
          type: { type: 'string', description: 'Filter by type: "claim", "insight", or "sentence". Omit for all.' },
          expand: { type: 'string', description: 'Expand results with surrounding context: "none" (default) or "window" (sentence window).' },
          window_size: { type: 'number', description: 'Number of sentences before/after each match when expand="window" (default: 3).' },
        },
        required: ['wiki', 'query'],
      },
    },
    handler: handleKnowledgeSearch,
  },
  {
    tool: {
      name: 'knowledge_embed',
      description: 'Embed article sentences into the unified knowledge store (knowledge.db). Splits articles into sentences, adds contextual prefix "Document: {title}. Section: {section}.", embeds via nomic-embed, classifies as type=claim or type=sentence. Incremental — tracks processed articles in sentence-embed-state.json.',
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
