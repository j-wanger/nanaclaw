import fs from 'fs';
import path from 'path';
import { registerTools } from './server.js';
import { extractSourceUrl } from './url-index.js';
import type { McpToolDefinition } from './types.js';

function log(msg: string): void {
  console.error(`[research-review] ${msg}`);
}

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n*/, '');
}

function findRawSource(episodicContent: string, rawDir: string): string | null {
  const sourceUrl = extractSourceUrl(episodicContent);
  if (!sourceUrl) return null;

  try {
    for (const file of fs.readdirSync(rawDir).filter((f) => f.endsWith('.md'))) {
      const rawContent = fs.readFileSync(path.join(rawDir, file), 'utf8');
      const rawUrl = extractSourceUrl(rawContent);
      if (rawUrl === sourceUrl) return rawContent;
    }
  } catch {}
  return null;
}

interface ReviewDispatchResult {
  episodic_path: string;
  worker_id: string | null;
  skipped?: string;
}

export async function reviewHandler(args: Record<string, unknown>) {
  const episodicPaths = args.episodic_paths as string[] | undefined;
  if (!episodicPaths || episodicPaths.length === 0) return ok('Error: episodic_paths array is required');

  const wiki = (args.wiki as string || '').trim();
  if (!wiki) return ok('Error: wiki name is required');

  const rawDir = (args.raw_dir as string || '').trim();
  if (!rawDir) return ok('Error: raw_dir is required (path to raw/articles/)');

  let handleDispatch: typeof import('./local-worker/tools.js').handleDispatchWorker;
  try {
    const mod = await import('./local-worker/tools.js');
    handleDispatch = mod.handleDispatchWorker;
  } catch {
    return ok('Error: dispatch_worker not available');
  }

  const results: ReviewDispatchResult[] = [];

  for (const epPath of episodicPaths) {
    let episodicContent: string;
    try {
      episodicContent = fs.readFileSync(epPath, 'utf8');
    } catch {
      results.push({ episodic_path: epPath, worker_id: null, skipped: 'file not found' });
      continue;
    }

    const rawContent = findRawSource(episodicContent, rawDir);
    if (!rawContent) {
      results.push({ episodic_path: epPath, worker_id: null, skipped: 'no matching raw source found' });
      continue;
    }

    const rawBody = stripFrontmatter(rawContent);
    const epBody = stripFrontmatter(episodicContent);

    const context = `--- SOURCE ---\n${rawBody}\n\n--- SUMMARY ---\n${epBody}`;

    const dispatchResult = await handleDispatch({
      type: 'structured-output',
      outputFormat: 'json',
      objective: 'Compare this SUMMARY against its SOURCE. Check if every claim in the summary appears in the source. Do NOT use your own knowledge — only the source text provided.',
      context,
      boundaries: [
        'ONLY compare summary against the source text above',
        'Do NOT fact-check against your own knowledge or training data',
        'A claim is correct if it appears in SOURCE, even if you have never seen it before',
        'Score 1-10 based on faithfulness to SOURCE only',
        'passed=true if score >= 6',
      ],
      postconditions: [
        { type: 'json-valid', params: {} },
        { type: 'contains', params: { substring: 'passed' } },
      ],
      timeout_ms: 1_200_000,
      context_budget_tokens: 4000,
      write_to: { wiki, tier: 'review', target_path: epPath },
    });

    const resultText = (dispatchResult.content[0] as { text: string }).text;
    const idMatch = resultText.match(/ID: (wt-[\w-]+)/);

    results.push({ episodic_path: epPath, worker_id: idMatch?.[1] || null });
    log(`Dispatched review worker for: ${path.basename(epPath)}`);
  }

  const dispatched = results.filter((r) => r.worker_id);
  const skipped = results.filter((r) => r.skipped);

  return ok(JSON.stringify({
    dispatched: dispatched.length,
    skipped: skipped.length,
  }));
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'research_review',
      description:
        'Mechanically dispatch one review worker per episodic article. Each reviewer compares the summary against its raw source (matched by source_url). Scores faithfulness to source only — not factual accuracy. Results auto-inject when complete.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          episodic_paths: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of episodic article file paths to review',
          },
          wiki: { type: 'string', description: 'Wiki name (for write_to routing)' },
          raw_dir: { type: 'string', description: 'Path to raw/articles/ directory (to find matching sources)' },
        },
        required: ['episodic_paths', 'wiki', 'raw_dir'],
      },
    },
    handler: reviewHandler,
  },
];

registerTools(tools);
