import fs from 'fs';
import path from 'path';
import { registerTools } from './server.js';
import { loadWikis, resolveWikiByName, parseFrontmatter, stripFrontmatter, tierToDir, findSlugInDir } from './wiki-utils.js';
import type { McpToolDefinition } from './types.js';

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

export async function readHandler(args: Record<string, unknown>) {
  const wikiName = (args.wiki_name as string || '').trim();
  if (!wikiName) return ok('Error: wiki_name is required');

  const slug = (args.slug as string || '').trim();
  if (!slug) return ok('Error: slug is required');

  const tier = (args.tier as string) || 'articles';
  const maxChars = (args.max_chars as number) || 8000;

  const wikis = loadWikis();
  if (!wikis || wikis.length === 0) {
    return ok('Error: No wikis found. Check WIKIS_JSON_PATH or ~/.claude/wikis.json');
  }

  const wiki = resolveWikiByName(wikis, wikiName);
  if (!wiki) {
    return ok(`Error: Wiki "${wikiName}" not found. Available: ${wikis.map((w) => w.name).join(', ')}`);
  }

  const tierDir = tierToDir(tier);
  const baseDir = path.join(wiki.path, tierDir);
  const recursive = tier === 'articles';
  const filePath = findSlugInDir(baseDir, slug, recursive);

  if (!filePath) {
    return ok(`Error: Article "${slug}" not found in ${wikiName}/${tierDir}/`);
  }

  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return ok(`Error: Could not read ${filePath}`);
  }

  const fm = parseFrontmatter(content);
  const body = stripFrontmatter(content);
  const truncated = body.length > maxChars ? body.slice(0, maxChars) + '\n\n[truncated]' : body;

  return ok(JSON.stringify({
    wiki: wikiName,
    slug,
    tier,
    title: fm?.title || slug,
    tags: fm?.tags || [],
    created: fm?.created || null,
    status: fm?.status || null,
    source_url: fm?.source_url || null,
    body: truncated,
  }));
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'wiki_read',
      description:
        'Read a specific wiki article by slug. Use wiki_search first to discover slugs, then wiki_read to fetch content. Returns structured JSON with frontmatter fields and body text.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          wiki_name: { type: 'string', description: 'Wiki name (required — use wiki_search to find which wiki has the article)' },
          slug: { type: 'string', description: 'Article slug (filename without .md extension)' },
          tier: {
            type: 'string',
            enum: ['articles', 'episodic', 'raw', 'inbox'],
            description: 'Wiki tier to read from (default: "articles"). Use "episodic" or "raw" to check research output.',
          },
          max_chars: {
            type: 'number',
            description: 'Maximum body characters to return (default: 8000). Longer articles are truncated.',
          },
        },
        required: ['wiki_name', 'slug'],
      },
    },
    handler: readHandler,
  },
];

registerTools(tools);
