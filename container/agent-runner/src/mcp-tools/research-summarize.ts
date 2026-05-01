import fs from 'fs';
import path from 'path';
import os from 'os';
import { registerTools } from './server.js';
import { extractSourceUrl } from './url-index.js';
import { AGENT_DIR } from '../config.js';
import type { McpToolDefinition } from './types.js';

const CLAIM_BOUNDARY = 'Extract atomic claims as [CLAIM] tags in a ## Claims section. Each claim must be a standalone factual assertion — atomic, independent, declarative, and attributable to this source';

const EPISODIC_OBJECTIVE = 'Summarize this source into a structured article with ## Summary, ## Key Points, ## Claims, and ## Source sections.';
const EPISODIC_BOUNDARIES = [
  'Use only facts from this source',
  'Include source URL as attribution',
  'Do NOT add external knowledge',
  CLAIM_BOUNDARY,
];
const EPISODIC_POSTCONDITIONS = [
  { type: 'contains' as const, params: { substring: '## Summary' } },
  { type: 'contains' as const, params: { substring: '## Claims' } },
];

const CLAIMS_ONLY_OBJECTIVE = 'Extract atomic claims from this source. Output a ## Claims section with [CLAIM] tags only.';
const CLAIMS_ONLY_BOUNDARIES = [
  'Use only facts from this source',
  'Do NOT add external knowledge',
  CLAIM_BOUNDARY,
];
const CLAIMS_ONLY_POSTCONDITIONS = [
  { type: 'contains' as const, params: { substring: '## Claims' } },
];

interface WikiEntry { name: string; path: string; description: string; }

function loadWikis(): WikiEntry[] | null {
  const wikisPath = process.env.WIKIS_JSON_PATH || path.join(os.homedir(), '.claude', 'wikis.json');
  try {
    const raw = JSON.parse(fs.readFileSync(wikisPath, 'utf8')) as { wikis: WikiEntry[] };
    return raw.wikis || [];
  } catch { return null; }
}

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function log(msg: string): void {
  console.error(`[research-summarize] ${msg}`);
}

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function extractFrontmatter(markdown: string): Record<string, string> {
  const fm: Record<string, string> = {};
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return fm;
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return fm;
}

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n*/, '');
}

interface SummarizeState {
  wiki: string;
  raw_dir: string;
  total_raw: number;
  summarized: number;
  remaining: number;
  started_at: string;
}

function stateFilePath(): string {
  const base = process.env.NANOCLAW_AGENT_DIR || AGENT_DIR;
  return path.join(base, 'summarize-state.json');
}

function readState(): SummarizeState | null {
  try {
    return JSON.parse(fs.readFileSync(stateFilePath(), 'utf8'));
  } catch { return null; }
}

function writeState(state: SummarizeState): void {
  fs.writeFileSync(stateFilePath(), JSON.stringify(state, null, 2));
}

export function buildEpisodicSourceUrls(episodicDir: string): Set<string> {
  const urls = new Set<string>();
  if (!fs.existsSync(episodicDir)) return urls;
  try {
    for (const file of fs.readdirSync(episodicDir).filter((f) => f.endsWith('.md'))) {
      const content = fs.readFileSync(path.join(episodicDir, file), 'utf8');
      const url = extractSourceUrl(content);
      if (url) urls.add(url);
    }
  } catch {}
  return urls;
}

interface DispatchResult {
  path: string;
  title: string;
  worker_id: string | null;
  episodic_path: string | null;
  skipped?: string;
}

async function dispatchForPaths(
  paths: string[],
  wiki: string,
  tags: string[],
  wikiPath: string,
  handleDispatch: typeof import('./local-worker/tools.js').handleDispatchWorker,
  claimsOnly = false,
): Promise<DispatchResult[]> {
  const results: DispatchResult[] = [];

  for (const filePath of paths) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      results.push({ path: filePath, title: '?', worker_id: null, episodic_path: null, skipped: 'file not found' });
      continue;
    }

    const fm = extractFrontmatter(content);
    const title = (fm.title || '').replace(/^"|"$/g, '') || filePath.split('/').pop()?.replace('.md', '') || 'untitled';

    if (fm.extraction === 'partial' || fm.extraction === 'invalid') {
      results.push({ path: filePath, title, worker_id: null, episodic_path: null, skipped: 'partial extraction' });
      continue;
    }

    const body = stripFrontmatter(content);
    const sourceUrl = extractSourceUrl(content) || undefined;

    const objective = claimsOnly ? CLAIMS_ONLY_OBJECTIVE : EPISODIC_OBJECTIVE;
    const boundaries = claimsOnly ? CLAIMS_ONLY_BOUNDARIES : EPISODIC_BOUNDARIES;
    const postconditions = claimsOnly ? CLAIMS_ONLY_POSTCONDITIONS : EPISODIC_POSTCONDITIONS;
    const tier = claimsOnly ? 'claims' as const : 'episodic' as const;

    const dispatchResult = await handleDispatch({
      type: 'research',
      outputFormat: 'markdown',
      objective,
      context: body,
      boundaries,
      postconditions,
      timeout_ms: 1_200_000,
      context_budget_tokens: 6000,
      write_to: { wiki, tier, title, tags, source_url: sourceUrl },
    });

    const resultText = (dispatchResult.content[0] as { text: string }).text;
    const idMatch = resultText.match(/ID: (wt-[\w-]+)/);

    const episodicPath = wikiPath ? path.join(wikiPath, 'episodic', `${generateSlug(title)}.md`) : null;
    results.push({ path: filePath, title, worker_id: idMatch?.[1] || null, episodic_path: episodicPath });
    log(`Dispatched summarize worker for: ${title}`);
  }

  return results;
}

export async function summarizeHandler(args: Record<string, unknown>) {
  const wiki = (args.wiki as string || '').trim();
  if (!wiki) return ok('Error: wiki name is required');

  const tags = (args.tags as string[]) || [];
  const rawDirParam = args.raw_dir as string | undefined;
  const pathsParam = args.paths as string[] | undefined;
  const batchSize = (args.batch_size as number) || 60;
  const claimsOnly = !!(args.claims_only as boolean);

  if (!rawDirParam && (!pathsParam || pathsParam.length === 0)) {
    return ok('Error: either raw_dir or paths is required');
  }

  let handleDispatch: typeof import('./local-worker/tools.js').handleDispatchWorker;
  try {
    const mod = await import('./local-worker/tools.js');
    handleDispatch = mod.handleDispatchWorker;
  } catch {
    return ok('Error: dispatch_worker not available');
  }

  const wikis = loadWikis();
  const wikiEntry = wikis?.find((w) => w.name === wiki) || wikis?.[0];
  const wikiPath = wikiEntry?.path || '';

  // Legacy paths-based flow
  if (pathsParam && pathsParam.length > 0 && !rawDirParam) {
    const results = await dispatchForPaths(pathsParam, wiki, tags, wikiPath, handleDispatch, claimsOnly);
    const dispatched = results.filter((r) => r.worker_id);
    const skipped = results.filter((r) => r.skipped);
    const rawDir = wikiPath ? path.join(wikiPath, 'raw', 'articles') : '';
    const episodicPaths = dispatched.map((r) => r.episodic_path).filter(Boolean) as string[];

    return ok(JSON.stringify({
      dispatched: dispatched.length,
      skipped: skipped.length,
      review_args: { episodic_paths: episodicPaths, wiki, raw_dir: rawDir },
    }));
  }

  // Stateful raw_dir-based flow
  const rawDir = rawDirParam!;
  if (!fs.existsSync(rawDir)) return ok(`Error: raw_dir does not exist: ${rawDir}`);

  const allRawFiles = fs.readdirSync(rawDir).filter((f) => f.endsWith('.md')).sort();
  const episodicDir = path.join(wikiPath, 'episodic');
  const coveredUrls = buildEpisodicSourceUrls(episodicDir);

  const unsummarized: string[] = [];
  let skippedExisting = 0;
  let skippedPartial = 0;

  for (const file of allRawFiles) {
    const filePath = path.join(rawDir, file);
    let content: string;
    try { content = fs.readFileSync(filePath, 'utf8'); } catch { continue; }

    const fm = extractFrontmatter(content);
    if (fm.extraction === 'partial' || fm.extraction === 'invalid') {
      skippedPartial++;
      continue;
    }

    const sourceUrl = extractSourceUrl(content);
    if (sourceUrl && coveredUrls.has(sourceUrl)) {
      skippedExisting++;
      continue;
    }

    unsummarized.push(filePath);
  }

  const batch = unsummarized.slice(0, batchSize);
  if (batch.length === 0) {
    const state = readState();
    if (state) {
      try { fs.unlinkSync(stateFilePath()); } catch {}
    }
    return ok(JSON.stringify({
      dispatched: 0,
      skipped_partial: skippedPartial,
      skipped_existing: skippedExisting,
      remaining: 0,
      message: 'All raw articles have been summarized.',
    }));
  }

  const results = await dispatchForPaths(batch, wiki, tags, wikiPath, handleDispatch, claimsOnly);
  const dispatched = results.filter((r) => r.worker_id);
  const remaining = unsummarized.length - batch.length;

  const state: SummarizeState = {
    wiki,
    raw_dir: rawDir,
    total_raw: allRawFiles.length,
    summarized: skippedExisting + dispatched.length,
    remaining,
    started_at: readState()?.started_at || new Date().toISOString(),
  };
  writeState(state);

  const episodicPaths = dispatched.map((r) => r.episodic_path).filter(Boolean) as string[];

  return ok(JSON.stringify({
    dispatched: dispatched.length,
    skipped_partial: skippedPartial,
    skipped_existing: skippedExisting,
    remaining,
    review_args: { episodic_paths: episodicPaths, wiki, raw_dir: rawDir },
  }));
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'research_summarize',
      description:
        'Dispatch summarize workers for raw articles. Use raw_dir + batch_size for bulk operations (tool handles offset, dedup, and progress tracking via summarize-state.json). Use paths for manual one-off summarization. Default: each raw article becomes one episodic wiki article. Set claims_only=true to extract claims only (no episodic article).',
      inputSchema: {
        type: 'object' as const,
        properties: {
          wiki: { type: 'string', description: 'Target wiki name' },
          raw_dir: {
            type: 'string',
            description: 'Path to raw/articles/ directory. Tool handles batching, dedup, and progress tracking.',
          },
          batch_size: {
            type: 'number',
            description: 'Articles per batch (default: 60). Tool dispatches this many unsummarized articles.',
          },
          paths: {
            type: 'array',
            items: { type: 'string' },
            description: 'Manual mode: explicit raw article paths to summarize (overrides raw_dir).',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags for all episodic articles',
          },
          claims_only: {
            type: 'boolean',
            description: 'When true, extract claims only (no episodic article). Workers output ## Claims with [CLAIM] tags; results append to claims.jsonl.',
          },
        },
        required: ['wiki'],
      },
    },
    handler: summarizeHandler,
  },
];

registerTools(tools);
