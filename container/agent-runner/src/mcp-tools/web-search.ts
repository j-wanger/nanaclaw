import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';

function log(msg: string): void {
  console.error(`[web-search] ${msg}`);
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface SearxngResult {
  title: string;
  url: string;
  content: string;
}

function normalizeResults(raw: SearxngResult[], limit: number): SearchResult[] {
  return raw.slice(0, limit).map((r) => ({
    title: r.title || '',
    url: r.url || '',
    snippet: r.content || '',
  }));
}

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

export async function searchHandler(args: Record<string, unknown>) {
  const query = (args.query as string || '').trim();
  if (!query) {
    return ok('Error: query is required');
  }

  const searxngUrl = process.env.SEARXNG_URL;
  if (!searxngUrl) {
    return ok('Error: SEARXNG_URL not configured. Set the environment variable to your SearXNG instance URL.');
  }

  const maxResults = Math.min(Math.max((args.max_results as number) || 10, 1), 50);

  try {
    const url = `${searxngUrl}/search?q=${encodeURIComponent(query)}&format=json`;
    const resp = await fetch(url);

    if (!resp.ok) {
      return ok(`Error: SearXNG returned ${resp.status} ${resp.statusText}`);
    }

    const data = (await resp.json()) as { results?: SearxngResult[] };
    const results = normalizeResults(data.results || [], maxResults);
    return ok(JSON.stringify(results));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Search failed: ${msg}`);
    return ok(`Error: Search failed — ${msg}`);
  }
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'web_search',
      description:
        'Search the web via SearXNG. Returns JSON array of {title, url, snippet}. Use web_extract to fetch full page content from URLs.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Search query' },
          max_results: {
            type: 'number',
            description: 'Maximum results to return (default 10, max 50)',
          },
        },
        required: ['query'],
      },
    },
    handler: searchHandler,
  },
];

registerTools(tools);
