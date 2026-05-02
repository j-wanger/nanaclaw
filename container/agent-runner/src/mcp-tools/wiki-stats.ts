import fs from 'fs';
import path from 'path';
import { registerTools } from './server.js';
import { loadWikis, resolveWikiByName, tierToDir } from './wiki-utils.js';
import type { McpToolDefinition } from './types.js';

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function countMdFiles(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) count++;
      else if (entry.isDirectory()) count += countMdFiles(path.join(dir, entry.name));
    }
  } catch {}
  return count;
}

const TIERS = ['raw', 'episodic', 'inbox', 'articles'] as const;

export async function statsHandler(args: Record<string, unknown>) {
  const wikiName = args.wiki_name as string | undefined;

  const wikis = loadWikis();
  if (!wikis || wikis.length === 0) {
    return ok('Error: No wikis found. Check WIKIS_JSON_PATH or ~/.claude/wikis.json');
  }

  let targets = wikis;
  if (wikiName) {
    const match = resolveWikiByName(wikis, wikiName);
    if (!match) return ok(`Error: Wiki "${wikiName}" not found. Available: ${wikis.map((w) => w.name).join(', ')}`);
    targets = [match];
  }

  const results = targets.map((wiki) => {
    const counts: Record<string, number> = {};
    for (const tier of TIERS) {
      counts[tier] = countMdFiles(path.join(wiki.path, tierToDir(tier)));
    }
    return { name: wiki.name, ...counts };
  });

  return ok(JSON.stringify({ wikis: results }));
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'wiki_stats',
      description:
        'Get article counts per wiki tier (raw, episodic, inbox, articles). Use to check wiki health and identify consolidation backlog.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          wiki_name: {
            type: 'string',
            description: 'Specific wiki to check (omit for all wikis)',
          },
        },
        required: [],
      },
    },
    handler: statsHandler,
  },
];

registerTools(tools);
