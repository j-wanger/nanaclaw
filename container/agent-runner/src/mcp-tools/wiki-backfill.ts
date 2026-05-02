import fs from 'fs';
import path from 'path';
import { registerTools } from './server.js';
import { loadWikis, resolveWikiByName, parseFrontmatter } from './wiki-utils.js';
import { extractSourceUrl } from './url-index.js';
import type { McpToolDefinition } from './types.js';

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function normalizeSlug(filename: string): string {
  return filename.replace(/\.md$/, '').toLowerCase();
}

function findRawMatch(epSlug: string, rawDir: string): string | null {
  if (!fs.existsSync(rawDir)) return null;

  try {
    const rawFiles = fs.readdirSync(rawDir).filter((f) => f.endsWith('.md'));

    for (const file of rawFiles) {
      const rawSlug = normalizeSlug(file);
      if (rawSlug === epSlug) {
        const content = fs.readFileSync(path.join(rawDir, file), 'utf8');
        return extractSourceUrl(content);
      }
    }

    for (const file of rawFiles) {
      const rawSlug = normalizeSlug(file);
      const minLen = Math.min(epSlug.length, rawSlug.length);
      const prefixLen = Math.min(minLen, 30);
      if (prefixLen >= 10 && epSlug.slice(0, prefixLen) === rawSlug.slice(0, prefixLen)) {
        const content = fs.readFileSync(path.join(rawDir, file), 'utf8');
        const url = extractSourceUrl(content);
        if (url) return url;
      }
    }
  } catch {}
  return null;
}

export async function backfillHandler(args: Record<string, unknown>) {
  const wikiName = (args.wiki_name as string || '').trim();
  if (!wikiName) return ok('Error: wiki_name is required');

  const wikis = loadWikis();
  if (!wikis || wikis.length === 0) return ok('Error: No wikis found');

  const wiki = resolveWikiByName(wikis, wikiName);
  if (!wiki) return ok(`Error: Wiki "${wikiName}" not found`);

  const episodicDir = path.join(wiki.path, 'episodic');
  const rawDir = path.join(wiki.path, 'raw', 'articles');

  if (!fs.existsSync(episodicDir)) return ok('Error: No episodic/ directory');

  const files = fs.readdirSync(episodicDir).filter((f) => f.endsWith('.md'));
  let fixed = 0;
  let unmatched = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(episodicDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    if (extractSourceUrl(content)) {
      skipped++;
      continue;
    }

    const epSlug = normalizeSlug(file);
    const sourceUrl = findRawMatch(epSlug, rawDir);

    if (sourceUrl) {
      const fmEnd = content.indexOf('\n---', 3);
      if (fmEnd !== -1) {
        const updated = content.slice(0, fmEnd) + `\nsource_url: ${sourceUrl}` + content.slice(fmEnd);
        fs.writeFileSync(filePath, updated);
        fixed++;
      } else {
        unmatched++;
      }
    } else {
      unmatched++;
    }
  }

  return ok(JSON.stringify({ fixed, unmatched, skipped, total: files.length }));
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'wiki_backfill_source_urls',
      description:
        'One-shot repair: scan episodic articles missing source_url and match them to raw articles by slug similarity. Writes source_url into episodic frontmatter for matches.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          wiki_name: { type: 'string', description: 'Wiki to backfill (required)' },
        },
        required: ['wiki_name'],
      },
    },
    handler: backfillHandler,
  },
];

registerTools(tools);
