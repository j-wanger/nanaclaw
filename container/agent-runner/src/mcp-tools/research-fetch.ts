import fs from 'fs';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { registerTools } from './server.js';
import { loadAllUrlIndexes, appendUrlIndex } from './url-index.js';
import { tryJinaExtract } from './jina.js';
import { validateRawArticle } from './article-validation.js';
import { computeSourceScore, loadAuthorityConfig, type AuthorityConfig } from './source-score.js';
import type { McpToolDefinition } from './types.js';

function log(msg: string): void {
  console.error(`[research-fetch] ${msg}`);
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

function loadWikis(): WikiEntry[] | null {
  const wikisPath = process.env.WIKIS_JSON_PATH || path.join(os.homedir(), '.claude', 'wikis.json');
  try {
    const raw = JSON.parse(fs.readFileSync(wikisPath, 'utf8')) as WikisJson;
    return raw.wikis || [];
  } catch {
    return null;
  }
}

function resolveWiki(wikis: WikiEntry[], wikiName?: string): WikiEntry {
  if (wikiName) {
    const match = wikis.find((w) => w.name === wikiName);
    if (match) return match;
  }
  return wikis[0];
}

interface SearxngResult {
  title: string;
  url: string;
  content: string;
}

function unwrapSearxng(data: { results?: SearxngResult[] }, limit: number): SearxngResult[] {
  return (data.results || []).slice(0, limit);
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function computeSha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function extractContent(html: string, url: string, maxChars: number): string {
  const { document } = parseHTML(html);
  const reader = new Readability(document as unknown as Document, { charThreshold: 100 });
  const article = reader.parse();

  let text: string;
  if (!article || !article.textContent?.trim()) {
    text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  } else {
    const title = article.title ? `# ${article.title}\n\nSource: ${url}\n\n` : '';
    text = title + article.textContent.trim();
  }

  if (text.length > maxChars) {
    return text.slice(0, maxChars) + '\n\n[Truncated]';
  }
  return text;
}

const FULL_CONTENT_THRESHOLD = 500;

interface ArticleResult {
  path: string;
  title: string;
  url: string;
  quality: 'full' | 'partial';
  chars: number;
  validation_issues?: string[];
}

function buildRawFrontmatter(title: string, sourceUrl: string, contentBody: string, quality: 'full' | 'partial', sourceScore?: number): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    '---',
    `title: "${title}"`,
    `source_url: ${sourceUrl}`,
    `sha256: ${computeSha256(contentBody)}`,
    `ingested: ${today}`,
    'tier: raw',
    'source: web-extract',
  ];
  if (typeof sourceScore === 'number') lines.push(`source_score: ${sourceScore}`);
  if (quality === 'partial') lines.push('extraction: partial');
  lines.push('---');
  return lines.join('\n');
}

let authorityConfig: AuthorityConfig | undefined;

async function fetchAndWrite(
  result: SearxngResult,
  wikiPath: string,
  maxChars: number,
): Promise<ArticleResult> {
  if (!authorityConfig) authorityConfig = loadAuthorityConfig(wikiPath);
  const resp = await fetch(result.url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const contentType = resp.headers.get('content-type') || '';
  const body = await resp.text();

  let content = contentType.includes('html')
    ? extractContent(body, result.url, maxChars)
    : body.slice(0, maxChars);

  let quality: 'full' | 'partial' = 'full';

  if (content.length < FULL_CONTENT_THRESHOLD) {
    const jinaContent = await tryJinaExtract(result.url, maxChars, content.length);
    if (jinaContent) content = jinaContent;

    if (content.length < FULL_CONTENT_THRESHOLD) {
      quality = 'partial';
      if (result.content && result.content.length > content.length) {
        content = `# ${result.title}\n\nSource: ${result.url}\n\n${result.content}`;
      }
      log(`Partial extraction (${content.length} chars), using snippet fallback: ${result.url}`);
    }
  }

  const slug = generateSlug(result.title || 'untitled');
  const rawDir = path.join(wikiPath, 'raw', 'articles');
  fs.mkdirSync(rawDir, { recursive: true });

  const sourceScore = computeSourceScore(result.url, content.length, authorityConfig);
  const frontmatter = buildRawFrontmatter(result.title || slug, result.url, content, quality, sourceScore);
  const filePath = path.join(rawDir, `${slug}.md`);
  fs.writeFileSync(filePath, `${frontmatter}\n\n${content}\n`);

  appendUrlIndex(wikiPath, result.url);

  const validation = validateRawArticle(filePath);
  if (!validation.valid) {
    log(`Validation failed for ${slug}: ${validation.issues.join(', ')}`);
    let raw = fs.readFileSync(filePath, 'utf8');
    const fmEnd = raw.indexOf('\n---', 3);
    if (fmEnd !== -1 && !raw.includes('extraction: invalid')) {
      raw = raw.slice(0, fmEnd) + '\nextraction: invalid' + raw.slice(fmEnd);
      fs.writeFileSync(filePath, raw);
    }
  }

  return { path: filePath, title: result.title || slug, url: result.url, quality, chars: content.length, validation_issues: validation.valid ? undefined : validation.issues };
}

export async function fetchHandler(args: Record<string, unknown>) {
  const query = (args.query as string || '').trim();
  if (!query) return ok('Error: query is required');

  const searxngUrl = process.env.SEARXNG_URL;
  if (!searxngUrl) {
    return ok('Error: SEARXNG_URL not configured. Set the environment variable to your SearXNG instance URL.');
  }

  const wikis = loadWikis();
  if (!wikis || wikis.length === 0) {
    return ok('Error: No wikis found. Check WIKIS_JSON_PATH or ~/.claude/wikis.json');
  }

  const wikiName = args.wiki_name as string | undefined;
  const maxResults = Math.min(Math.max((args.max_results as number) || 20, 1), 50);
  const maxChars = (args.max_chars as number) || 30_000;

  const targetWiki = resolveWiki(wikis, wikiName);

  let searchResults: SearxngResult[];
  try {
    const url = `${searxngUrl}/search?q=${encodeURIComponent(query)}&format=json`;
    const resp = await fetch(url);
    if (!resp.ok) return ok(`Error: SearXNG returned ${resp.status}`);
    const data = (await resp.json()) as { results?: SearxngResult[] };
    searchResults = unwrapSearxng(data, maxResults);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return ok(`Error: SearXNG search failed — ${msg}`);
  }

  if (searchResults.length === 0) {
    return ok(JSON.stringify({ added: 0, skipped: 0, failed: 0, full: 0, partial: 0, new_articles: [] }));
  }

  const knownUrls = loadAllUrlIndexes();
  const newResults = searchResults.filter((r) => !knownUrls.has(r.url));
  const skipped = searchResults.length - newResults.length;

  if (newResults.length === 0) {
    return ok(JSON.stringify({ added: 0, skipped, failed: 0, full: 0, partial: 0, new_articles: [] }));
  }

  const settled = await Promise.allSettled(
    newResults.map((r) => fetchAndWrite(r, targetWiki.path, maxChars)),
  );

  const articles: ArticleResult[] = [];
  let failed = 0;
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      articles.push(result.value);
    } else {
      failed++;
      log(`Fetch failed: ${result.reason}`);
    }
  }

  const full = articles.filter((a) => a.quality === 'full').length;
  const partial = articles.filter((a) => a.quality === 'partial').length;

  const rawDir = path.join(targetWiki.path, 'raw', 'articles');
  return ok(JSON.stringify({
    added: articles.length,
    skipped, failed, full, partial,
    raw_dir: rawDir,
    wiki: targetWiki.name,
    new_articles: articles.map((a) => ({ title: a.title, url: a.url })),
  }));
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'research_fetch',
      description:
        'Search the web and fetch results as raw wiki articles in a single call. Searches via SearXNG, deduplicates against the URL index, fetches new pages, and writes raw articles with sha256 provenance. Returns {added, skipped, failed, new_articles: [{title, url}]}. Pure script — zero LLM cost.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Search query' },
          wiki_name: { type: 'string', description: 'Target wiki name (defaults to first wiki)' },
          max_results: { type: 'number', description: 'Max search results to process (default 20, max 50)' },
          max_chars: { type: 'number', description: 'Max chars per extracted page (default 30000)' },
        },
        required: ['query'],
      },
    },
    handler: fetchHandler,
  },
];

registerTools(tools);
