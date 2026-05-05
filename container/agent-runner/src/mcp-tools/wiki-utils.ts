import fs from 'fs';
import path from 'path';
import os from 'os';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
export type { CallToolResult };

export interface WikiEntry {
  name: string;
  path: string;
  description: string;
}

export interface WikiFrontmatter {
  title?: string;
  tags?: string[];
  tier?: string;
  created?: string;
  updated?: string;
  status?: string;
  source?: string;
  source_url?: string;
  sha256?: string;
  [key: string]: string | string[] | undefined;
}

export function loadWikis(): WikiEntry[] | null {
  const wikisPath = process.env.WIKIS_JSON_PATH || path.join(os.homedir(), '.claude', 'wikis.json');
  try {
    const raw = JSON.parse(fs.readFileSync(wikisPath, 'utf8')) as { wikis: WikiEntry[] };
    return raw.wikis || [];
  } catch {
    return null;
  }
}

export function resolveWikiByName(wikis: WikiEntry[], name: string): WikiEntry | null {
  return wikis.find((w) => w.name === name) ?? null;
}

export function resolveWikiPath(wikiName: string): string | null {
  const wikis = loadWikis();
  if (!wikis || wikis.length === 0) return null;
  const entry = wikis.find((w) => w.name === wikiName) || wikis[0];
  return entry?.path || null;
}

export function text(msg: string): CallToolResult {
  return { content: [{ type: 'text', text: msg }] };
}

export function parseFrontmatter(content: string): WikiFrontmatter | null {
  if (!content.startsWith('---')) return null;
  const endIdx = content.indexOf('\n---', 3);
  if (endIdx === -1) return null;
  const fm = content.slice(4, endIdx);

  const result: WikiFrontmatter = {};
  for (const line of fm.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx <= 0) continue;
    const key = line.slice(0, colonIdx).trim();
    const rawVal = line.slice(colonIdx + 1).trim();

    if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      result[key] = rawVal
        .slice(1, -1)
        .split(',')
        .map((t) => t.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      result[key] = rawVal.replace(/^["']|["']$/g, '');
    }
  }
  return result;
}

export function stripFrontmatter(content: string): string {
  if (!content.startsWith('---')) return content;
  const endIdx = content.indexOf('\n---', 3);
  if (endIdx === -1) return content;
  return content.slice(endIdx + 4).replace(/^\n+/, '');
}

export function tierToDir(tier: string): string {
  switch (tier) {
    case 'raw': return path.join('raw', 'articles');
    case 'episodic': return 'episodic';
    case 'inbox': return 'inbox';
    case 'articles':
    default: return 'articles';
  }
}

export function findSlugInDir(dir: string, slug: string, recursive: boolean): string | null {
  if (!fs.existsSync(dir)) return null;
  const target = `${slug}.md`;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && entry.name === target) return fullPath;
      if (recursive && entry.isDirectory()) {
        const found = findSlugInDir(fullPath, slug, true);
        if (found) return found;
      }
    }
  } catch {}
  return null;
}
