import fs from 'fs';
import path from 'path';
import os from 'os';
import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';

function log(msg: string): void {
  console.error(`[wiki-search] ${msg}`);
}

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

interface WikiEntry {
  name: string;
  path: string;
  description: string;
}

interface WikisJson {
  version: number;
  wikis: WikiEntry[];
}

interface SearchResult {
  slug: string;
  title: string;
  score: number;
}

function loadWikis(): WikiEntry[] | null {
  const wikisPath = process.env.WIKIS_JSON_PATH || path.join(os.homedir(), '.claude', 'wikis.json');
  try {
    const raw = JSON.parse(fs.readFileSync(wikisPath, 'utf8')) as WikisJson;
    return raw.wikis || [];
  } catch {
    return null;
  }
}

function resolveWiki(wikis: WikiEntry[], wikiName?: string): WikiEntry | null {
  if (wikiName) {
    return wikis.find((w) => w.name === wikiName) ?? null;
  }
  return null;
}

function hasSearchIndex(wikiPath: string): boolean {
  const dbPath = path.join(wikiPath, '.wiki-index.db');
  try {
    const stat = fs.statSync(dbPath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

async function searchViaScript(wikiPath: string, query: string, topK: number): Promise<SearchResult[] | null> {
  const toolsDir = process.env.WIKI_TOOLS_DIR;
  if (!toolsDir) return null;

  const scriptPath = path.join(toolsDir, 'search.py');
  if (!fs.existsSync(scriptPath)) {
    log(`search.py not found at ${scriptPath}`);
    return null;
  }

  try {
    const proc = Bun.spawn(
      ['python3', scriptPath, 'query', '--wiki-path', wikiPath, '--query', query, '--top', String(topK), '--bm25-only'],
      { stdout: 'pipe', stderr: 'pipe' },
    );
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      log(`search.py exited ${exitCode}: ${stderr.slice(0, 200)}`);
      return null;
    }

    const parsed = JSON.parse(stdout);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((r: { slug?: string; title?: string; score?: number }, i: number) => ({
      slug: r.slug || `result-${i}`,
      title: r.title || r.slug || `Result ${i}`,
      score: r.score ?? 1 - i * 0.1,
    }));
  } catch (err) {
    log(`search.py failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export function keywordSearch(wikiPath: string, query: string, topK: number): SearchResult[] {
  const articlesDir = path.join(wikiPath, 'articles');
  if (!fs.existsSync(articlesDir)) return [];

  const queryTerms = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (queryTerms.length === 0) return [];

  const results: SearchResult[] = [];
  scanArticlesRecursive(articlesDir, queryTerms, results);

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

function scanArticlesRecursive(dir: string, queryTerms: string[], results: SearchResult[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanArticlesRecursive(fullPath, queryTerms, results);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const slug = entry.name.replace(/\.md$/, '');
      const score = scoreArticle(fullPath, queryTerms);
      if (score > 0) {
        const title = extractTitle(fullPath) || slug;
        results.push({ slug, title, score });
      }
    }
  }
}

function scoreArticle(filePath: string, queryTerms: string[]): number {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const frontmatter = extractFrontmatter(raw);
    if (!frontmatter) return 0;

    let score = 0;
    const titleLower = (frontmatter.title || '').toLowerCase();
    const tags = (frontmatter.tags || []).map((t: string) => t.toLowerCase());

    for (const term of queryTerms) {
      if (titleLower.includes(term)) score += 3;
      if (tags.some((t: string) => t.includes(term))) score += 1;
    }
    return score;
  } catch {
    return 0;
  }
}

function extractFrontmatter(content: string): { title?: string; tags?: string[] } | null {
  if (!content.startsWith('---')) return null;
  const endIdx = content.indexOf('---', 3);
  if (endIdx === -1) return null;
  const fm = content.slice(3, endIdx);

  const titleMatch = fm.match(/title:\s*"?([^"\n]+)"?/);
  const tagsMatch = fm.match(/tags:\s*\[([^\]]*)\]/);

  return {
    title: titleMatch?.[1]?.trim(),
    tags: tagsMatch?.[1]
      ? tagsMatch[1].split(',').map((t) => t.trim().replace(/^["']|["']$/g, ''))
      : [],
  };
}

function extractTitle(filePath: string): string | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const fm = extractFrontmatter(raw);
    return fm?.title ?? null;
  } catch {
    return null;
  }
}

function formatResults(results: SearchResult[], wikiName: string): string {
  if (results.length === 0) return `No results found in ${wikiName}.`;
  const lines = results.map((r, i) => `${i + 1}. **${r.title}** (${r.slug})`);
  return `Found ${results.length} results in ${wikiName}:\n${lines.join('\n')}`;
}

export async function searchHandler(args: Record<string, unknown>) {
  const query = (args.query as string || '').trim();
  if (!query) return ok('Error: query is required');

  const topK = (args.top_k as number) || 10;
  const wikiName = args.wiki_name as string | undefined;

  const wikis = loadWikis();
  if (!wikis || wikis.length === 0) {
    return ok('Error: No wikis found. Check WIKIS_JSON_PATH or ~/.claude/wikis.json');
  }

  const targets = wikiName
    ? [resolveWiki(wikis, wikiName)].filter((w): w is WikiEntry => w !== null)
    : wikis;

  if (targets.length === 0) {
    return ok(`Error: Wiki "${wikiName}" not found in registry.`);
  }

  const allResults: Array<{ wiki: string; results: SearchResult[] }> = [];

  for (const wiki of targets) {
    if (!fs.existsSync(wiki.path)) {
      log(`Wiki path missing: ${wiki.path}`);
      continue;
    }

    let results: SearchResult[] | null = null;

    if (hasSearchIndex(wiki.path)) {
      results = await searchViaScript(wiki.path, query, topK);
    }

    if (!results) {
      results = keywordSearch(wiki.path, query, topK);
    }

    if (results.length > 0) {
      allResults.push({ wiki: wiki.name, results });
    }
  }

  if (allResults.length === 0) {
    return ok(`No results found for "${query}" across ${targets.length} wiki(s).`);
  }

  const sections = allResults.map((r) => formatResults(r.results, r.wiki));
  return ok(sections.join('\n\n'));
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'wiki_search',
      description:
        'Search knowledge wikis for articles matching a query. Uses search index (BM25) when available, falls back to keyword matching over article titles and tags. Specify wiki_name to search a specific wiki, or omit to search all.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Search query' },
          wiki_name: {
            type: 'string',
            description: 'Specific wiki to search (omit to search all)',
          },
          top_k: {
            type: 'number',
            description: 'Maximum results to return (default: 10)',
          },
        },
        required: ['query'],
      },
    },
    handler: searchHandler,
  },
];

registerTools(tools);
