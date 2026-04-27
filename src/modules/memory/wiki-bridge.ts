import fs from 'fs';
import path from 'path';
import os from 'os';
import { log } from '../../log.js';

interface WikiEntry {
  name: string;
  path: string;
  description: string;
}

interface WikisJson {
  version: number;
  wikis: WikiEntry[];
}

const DEFAULT_WIKIS_PATH = path.join(os.homedir(), '.claude', 'wikis.json');

export function generateWikiContext(groupDir: string, wikisJsonPath: string = DEFAULT_WIKIS_PATH): void {
  const wikis = loadWikisJson(wikisJsonPath);
  if (!wikis || wikis.length === 0) return;

  const sections: string[] = [];
  for (const wiki of wikis) {
    if (!fs.existsSync(wiki.path)) {
      log.warn('Wiki path missing, skipping', { wiki: wiki.name, path: wiki.path });
      continue;
    }
    const articleCount = countArticles(wiki.path);
    const roots = parseHierarchyRoots(wiki.path);
    sections.push(renderWikiSection(wiki, articleCount, roots));
  }

  if (sections.length === 0) return;

  const fragment = `# Available Wikis\n<!-- Frozen at spawn. Search mid-session via wiki_search tool. -->\n\n${sections.join('\n')}`;

  const fragmentsDir = path.join(groupDir, '.claude-fragments');
  if (!fs.existsSync(fragmentsDir)) fs.mkdirSync(fragmentsDir, { recursive: true });

  const outPath = path.join(fragmentsDir, 'wiki-context.md');
  const tmpPath = `${outPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmpPath, fragment);
  fs.renameSync(tmpPath, outPath);
}

function loadWikisJson(jsonPath: string): WikiEntry[] | null {
  if (!fs.existsSync(jsonPath)) return null;
  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const parsed: WikisJson = JSON.parse(raw);
    return parsed.wikis ?? [];
  } catch {
    return null;
  }
}

function countArticles(wikiPath: string): number {
  const articlesDir = path.join(wikiPath, 'articles');
  if (!fs.existsSync(articlesDir)) return 0;
  return countMdFilesRecursive(articlesDir);
}

function countMdFilesRecursive(dir: string): number {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += countMdFilesRecursive(path.join(dir, entry.name));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      count++;
    }
  }
  return count;
}

export function parseHierarchyRoots(wikiPath: string): string[] {
  const schemaPath = path.join(wikiPath, 'schema.md');
  if (!fs.existsSync(schemaPath)) return [];
  const raw = fs.readFileSync(schemaPath, 'utf-8');
  return extractRootsFromSchema(raw);
}

function extractRootsFromSchema(content: string): string[] {
  const lines = content.split('\n');
  const roots: string[] = [];
  let inSection = false;

  for (const line of lines) {
    if (/^## Hierarchy Roots/.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^## /.test(line)) break;
    if (inSection) {
      const match = line.match(/^- (.+)$/);
      if (match) roots.push(match[1].trim());
    }
  }
  return roots;
}

function renderWikiSection(wiki: WikiEntry, articleCount: number, roots: string[]): string {
  const lines: string[] = [];
  lines.push(`## ${wiki.name} (${articleCount} articles)`);
  lines.push(wiki.description);
  if (roots.length > 0) {
    lines.push(`Topics: ${roots.join(', ')}`);
  }
  lines.push('');
  return lines.join('\n');
}
