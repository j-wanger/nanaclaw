import fs from 'fs';
import path from 'path';
import os from 'os';
import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';

function log(msg: string): void {
  console.error(`[wiki-write] ${msg}`);
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

interface FrontmatterOptions {
  title: string;
  tags: string[];
  tier?: string;
  workerId?: string;
  taskId?: string;
}

function buildFrontmatter(opts: FrontmatterOptions): string {
  const tagStr = opts.tags.map((t) => `"${t}"`).join(', ');
  const today = new Date().toISOString().slice(0, 10);
  const isEpisodic = opts.tier === 'episodic';
  const source = isEpisodic ? 'worker-research' : 'web-research';
  const lines = [
    '---',
    `title: "${opts.title}"`,
    `tags: [${tagStr}]`,
    `source: ${source}`,
    `created: ${today}`,
    `status: inbox`,
  ];
  if (isEpisodic) {
    lines.push(`tier: episodic`);
    if (opts.workerId) lines.push(`worker_id: ${opts.workerId}`);
    if (opts.taskId) lines.push(`task_id: ${opts.taskId}`);
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

  const wikis = loadWikis();
  if (!wikis || wikis.length === 0) {
    return ok('Error: No wikis found. Check WIKIS_JSON_PATH or ~/.claude/wikis.json');
  }

  const target = routeToWiki(wikis, topic, tags, wikiName);
  const subdir = tier === 'episodic' ? 'episodic' : 'inbox';
  const outputDir = path.join(target.path, subdir);

  try {
    fs.mkdirSync(outputDir, { recursive: true });

    const slug = generateSlug(title);
    const filename = `${slug}.md`;
    const filePath = path.join(outputDir, filename);
    const frontmatter = buildFrontmatter({ title, tags, tier, workerId, taskId });
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
            enum: ['inbox', 'episodic'],
            description: 'Output tier: "inbox" (default) for standard entries, "episodic" for autonomous research output with provenance',
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
