import fs from 'fs';
import { registerTools } from './server.js';
import { extractSourceUrl } from './url-index.js';
import type { McpToolDefinition } from './types.js';

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

interface DispatchResult {
  path: string;
  title: string;
  worker_id: string | null;
  skipped?: string;
}

export async function summarizeHandler(args: Record<string, unknown>) {
  const paths = args.paths as string[] | undefined;
  if (!paths || paths.length === 0) return ok('Error: paths array is required');

  const wiki = (args.wiki as string || '').trim();
  if (!wiki) return ok('Error: wiki name is required');

  const tags = (args.tags as string[]) || [];

  let handleDispatch: typeof import('./local-worker/tools.js').handleDispatchWorker;
  try {
    const mod = await import('./local-worker/tools.js');
    handleDispatch = mod.handleDispatchWorker;
  } catch {
    return ok('Error: dispatch_worker not available');
  }

  const results: DispatchResult[] = [];

  for (const filePath of paths) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      results.push({ path: filePath, title: '?', worker_id: null, skipped: 'file not found' });
      continue;
    }

    const fm = extractFrontmatter(content);
    const title = (fm.title || '').replace(/^"|"$/g, '') || filePath.split('/').pop()?.replace('.md', '') || 'untitled';

    if (fm.extraction === 'partial') {
      results.push({ path: filePath, title, worker_id: null, skipped: 'partial extraction' });
      continue;
    }

    const body = stripFrontmatter(content);

    const dispatchResult = await handleDispatch({
      type: 'research',
      outputFormat: 'markdown',
      objective: `Summarize this source into a structured article with ## Summary, ## Key Points, and ## Source sections.`,
      context: body,
      boundaries: ['Use only facts from this source', 'Include source URL as attribution', 'Do NOT add external knowledge'],
      postconditions: [{ type: 'contains', params: { substring: '## Summary' } }],
      timeout_ms: 1_200_000,
      context_budget_tokens: 6000,
      write_to: { wiki, tier: 'episodic', title, tags },
    });

    const resultText = (dispatchResult.content[0] as { text: string }).text;
    const idMatch = resultText.match(/ID: (wt-[\w-]+)/);

    results.push({ path: filePath, title, worker_id: idMatch?.[1] || null });
    log(`Dispatched summarize worker for: ${title}`);
  }

  const dispatched = results.filter((r) => r.worker_id);
  const skipped = results.filter((r) => r.skipped);

  return ok(JSON.stringify({
    dispatched: dispatched.length,
    skipped: skipped.length,
    workers: dispatched.map((r) => ({ path: r.path, title: r.title, worker_id: r.worker_id })),
    skipped_details: skipped.map((r) => ({ path: r.path, title: r.title, reason: r.skipped })),
  }));
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'research_summarize',
      description:
        'Mechanically dispatch one summarize worker per raw article. Each raw article becomes one episodic wiki article via write_to. Returns worker IDs. Results auto-inject when complete.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          paths: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of raw article file paths to summarize',
          },
          wiki: { type: 'string', description: 'Target wiki name' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags for all episodic articles',
          },
        },
        required: ['paths', 'wiki'],
      },
    },
    handler: summarizeHandler,
  },
];

registerTools(tools);
