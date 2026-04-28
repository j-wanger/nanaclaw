import fs from 'fs';
import path from 'path';
import os from 'os';

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

export function extractSourceUrl(markdown: string): string | null {
  const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const urlMatch = fmMatch[1].match(/^source_url:\s*(.+)$/m);
  return urlMatch ? urlMatch[1].trim() : null;
}

export function buildUrlIndex(wikiPath: string): void {
  const rawDir = path.join(wikiPath, 'raw', 'articles');
  const indexPath = path.join(wikiPath, 'raw', '.url-index');

  const urls: string[] = [];
  try {
    const files = fs.readdirSync(rawDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(rawDir, file), 'utf8');
      const url = extractSourceUrl(content);
      if (url) urls.push(url);
    }
  } catch {
    // rawDir doesn't exist — write empty index
  }

  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, urls.length > 0 ? urls.join('\n') + '\n' : '');
}

export function loadAllUrlIndexes(): Set<string> {
  const wikis = loadWikis();
  if (!wikis) return new Set();

  const urls = new Set<string>();
  for (const wiki of wikis) {
    const indexPath = path.join(wiki.path, 'raw', '.url-index');
    try {
      const content = fs.readFileSync(indexPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed) urls.add(trimmed);
      }
    } catch {
      // .url-index doesn't exist for this wiki
    }
  }
  return urls;
}

export function appendUrlIndex(wikiPath: string, url: string): void {
  const indexPath = path.join(wikiPath, 'raw', '.url-index');

  let existing = new Set<string>();
  try {
    const content = fs.readFileSync(indexPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed) existing.add(trimmed);
    }
  } catch {
    // file doesn't exist yet
  }

  if (existing.has(url)) return;

  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.appendFileSync(indexPath, url + '\n');
}
