import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';
import { loadWikis, type WikiEntry } from './wiki-utils.js';

function log(msg: string): void {
  console.error(`[wiki-write] ${msg}`);
}

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function scoreWiki(wiki: WikiEntry, topic: string, tags: string[]): number {
  const desc = wiki.description.toLowerCase();
  const name = wiki.name.toLowerCase();
  const topicLower = topic.toLowerCase();
  const topicWords = topicLower.split(/\s+/).filter((w) => w.length > 2);

  let score = 0;
  for (const word of topicWords) {
    if (desc.includes(word)) score += 1;
    if (name.includes(word)) score += 2;
  }
  for (const tag of tags) {
    if (desc.includes(tag.toLowerCase())) score += 2;
    if (name.includes(tag.toLowerCase())) score += 3;
  }
  return score;
}

function routeToWiki(wikis: WikiEntry[], topic: string, tags: string[], explicitName?: string): WikiEntry {
  if (explicitName) {
    const match = wikis.find((w) => w.name === explicitName);
    if (match) return match;
    log(`Explicit wiki_name "${explicitName}" not found, falling back to auto-routing`);
  }

  let best = wikis[0];
  let bestScore = -1;
  for (const wiki of wikis) {
    const s = scoreWiki(wiki, topic, tags);
    if (s > bestScore) {
      bestScore = s;
      best = wiki;
    }
  }
  return best;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export function computeSha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

interface FrontmatterOptions {
  title: string;
  tags: string[];
  tier?: string;
  workerId?: string;
  taskId?: string;
  sourceUrl?: string;
  contentBody?: string;
}

function buildFrontmatter(opts: FrontmatterOptions): string {
  const tagStr = opts.tags.map((t) => `"${t}"`).join(', ');
  const today = new Date().toISOString().slice(0, 10);
  const isRaw = opts.tier === 'raw';
  const isEpisodic = opts.tier === 'episodic';
  const source = isRaw ? 'web-extract' : isEpisodic ? 'worker-research' : 'web-research';
  const lines = [
    '---',
    `title: "${opts.title}"`,
    `tags: [${tagStr}]`,
    `source: ${source}`,
    `created: ${today}`,
  ];
  if (isRaw) {
    lines.push(`tier: raw`);
    lines.push(`ingested: ${today}`);
    if (opts.sourceUrl) lines.push(`source_url: ${opts.sourceUrl}`);
    if (opts.contentBody) lines.push(`sha256: ${computeSha256(opts.contentBody)}`);
  } else {
    lines.push(`status: inbox`);
    if (isEpisodic) {
      lines.push(`tier: episodic`);
      if (opts.workerId) lines.push(`worker_id: ${opts.workerId}`);
      if (opts.taskId) lines.push(`task_id: ${opts.taskId}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

export async function writeHandler(args: Record<string, unknown>) {
  const title = (args.title as string || '').trim();
  if (!title) {
    return ok('Error: title is required');
  }

  const content = (args.content as string) || '';
  const tags = (args.tags as string[]) || [];
  const topic = (args.topic as string) || title;
  const wikiName = args.wiki_name as string | undefined;
  const tier = args.tier as string | undefined;
  const workerId = args.worker_id as string | undefined;
  const taskId = args.task_id as string | undefined;
  const sourceUrl = args.source_url as string | undefined;

  const wikis = loadWikis();
  if (!wikis || wikis.length === 0) {
    return ok('Error: No wikis found. Check WIKIS_JSON_PATH or ~/.claude/wikis.json');
  }

  const target = routeToWiki(wikis, topic, tags, wikiName);
  const subdir = tier === 'raw' ? path.join('raw', 'articles') : tier === 'episodic' ? 'episodic' : 'inbox';
  const outputDir = path.join(target.path, subdir);

  try {
    fs.mkdirSync(outputDir, { recursive: true });

    const slug = generateSlug(title);
    const filename = `${slug}.md`;
    const filePath = path.join(outputDir, filename);
    const frontmatter = buildFrontmatter({ title, tags, tier, workerId, taskId, sourceUrl, contentBody: content });
    const fullContent = `${frontmatter}\n\n${content}\n`;

    fs.writeFileSync(filePath, fullContent);
    log(`Wrote research to ${target.name}/${subdir}/${filename}`);

    return ok(`Written to ${target.name}/${subdir}/${filename}`);
  } catch {
    return ok(`Error: Cannot write to ${outputDir}`);
  }
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'wiki_write',
      description:
        'Write research output to a knowledge wiki. Auto-routes to the best-matching wiki based on topic, or specify wiki_name to override. Writes to the wiki inbox/ for later absorption.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          title: { type: 'string', description: 'Article title' },
          content: { type: 'string', description: 'Article body (markdown)' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Topic tags for categorization and routing',
          },
          topic: {
            type: 'string',
            description: 'Topic description for wiki routing (defaults to title)',
          },
          wiki_name: {
            type: 'string',
            description: 'Explicit wiki name to write to (overrides auto-routing)',
          },
          tier: {
            type: 'string',
            enum: ['inbox', 'episodic', 'raw'],
            description: 'Output tier: "inbox" (default) for standard entries, "episodic" for autonomous research output with provenance, "raw" for immutable source material with sha256',
          },
          source_url: {
            type: 'string',
            description: 'Source URL for raw tier entries (provenance tracking)',
          },
          worker_id: {
            type: 'string',
            description: 'Worker task ID that produced this entry (episodic tier provenance)',
          },
          task_id: {
            type: 'string',
            description: 'Scheduled task ID that triggered the research (episodic tier provenance)',
          },
        },
        required: ['title', 'content', 'tags'],
      },
    },
    handler: writeHandler,
  },
];

registerTools(tools);
