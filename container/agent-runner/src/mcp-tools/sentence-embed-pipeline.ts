import fs from 'fs';
import path from 'path';
import { embedBatch } from './claim-embeddings.js';
import { KnowledgeVectorStore } from './knowledge-vector-store.js';
import { splitSentences } from './sentence-splitter.js';
import type { ClaimEntry } from './claim-store.js';

const EMBED_BATCH_SIZE = 256;

interface SentenceEmbedState {
  processedArticles: string[];
}

interface EmbedResult {
  embedded: number;
  skipped: number;
  articles_processed: number;
}

function readState(wikiPath: string): SentenceEmbedState {
  try {
    return JSON.parse(fs.readFileSync(path.join(wikiPath, 'sentence-embed-state.json'), 'utf8'));
  } catch {
    return { processedArticles: [] };
  }
}

function writeState(wikiPath: string, state: SentenceEmbedState): void {
  fs.writeFileSync(path.join(wikiPath, 'sentence-embed-state.json'), JSON.stringify(state, null, 2));
}

function loadClaimTexts(wikiPath: string): Set<string> {
  const claimsPath = path.join(wikiPath, 'claims.jsonl');
  const texts = new Set<string>();
  if (!fs.existsSync(claimsPath)) return texts;
  for (const line of fs.readFileSync(claimsPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as ClaimEntry;
      texts.add(entry.claim.toLowerCase().trim());
    } catch { /* skip */ }
  }
  return texts;
}

function extractFrontmatter(content: string): Record<string, string> {
  const fm: Record<string, string> = {};
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return fm;
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
  }
  return fm;
}

interface PreparedSentence {
  text: string;
  contextual_text: string;
  type: 'claim' | 'sentence';
  source_url: string | null;
  article_slug: string;
  section: string;
  wiki: string;
}

export async function embedSentences(
  wikiPath: string,
  articlePaths: string[],
  wiki?: string,
): Promise<EmbedResult> {
  if (articlePaths.length === 0) return { embedded: 0, skipped: 0, articles_processed: 0 };

  const state = readState(wikiPath);
  const claimTexts = loadClaimTexts(wikiPath);
  const wikiName = wiki || path.basename(wikiPath);

  const toProcess: string[] = [];
  let skipped = 0;

  for (const p of articlePaths) {
    const filename = path.basename(p);
    if (state.processedArticles.includes(filename)) {
      skipped++;
      continue;
    }
    toProcess.push(p);
  }

  if (toProcess.length === 0) return { embedded: 0, skipped, articles_processed: 0 };

  const allPrepared: PreparedSentence[] = [];

  for (const articlePath of toProcess) {
    let content: string;
    try {
      content = fs.readFileSync(articlePath, 'utf8');
    } catch { continue; }

    const fm = extractFrontmatter(content);
    const title = fm.title || path.basename(articlePath, '.md');
    const sourceUrl = fm.source_url || null;
    const slug = path.basename(articlePath, '.md');

    const sentences = splitSentences(content);

    for (const s of sentences) {
      const contextPrefix = s.section ? `[${title} | ${s.section}]` : `[${title}]`;
      const contextualText = `${contextPrefix} ${s.text}`;
      const isClaim = claimTexts.has(s.text.toLowerCase().trim());

      allPrepared.push({
        text: s.text,
        contextual_text: contextualText,
        type: isClaim ? 'claim' : 'sentence',
        source_url: sourceUrl,
        article_slug: slug,
        section: s.section,
        wiki: wikiName,
      });
    }

    state.processedArticles.push(path.basename(articlePath));
  }

  if (allPrepared.length === 0) {
    writeState(wikiPath, state);
    return { embedded: 0, skipped, articles_processed: toProcess.length };
  }

  const store = new KnowledgeVectorStore(wikiPath);
  let totalEmbedded = 0;

  try {
    for (let i = 0; i < allPrepared.length; i += EMBED_BATCH_SIZE) {
      const batch = allPrepared.slice(i, i + EMBED_BATCH_SIZE);
      const texts = batch.map((s) => s.contextual_text);
      const embeddings = await embedBatch(texts);

      if (embeddings.length !== batch.length) {
        console.error(`[sentence-embed] Partial embedding: got ${embeddings.length}/${batch.length}. Stopping batch.`);
        break;
      }

      for (let j = 0; j < batch.length; j++) {
        store.insertEntry({
          text: batch[j].text,
          contextual_text: batch[j].contextual_text,
          type: batch[j].type,
          source_url: batch[j].source_url,
          article_slug: batch[j].article_slug,
          section: batch[j].section,
          source_score: 0,
          wiki: batch[j].wiki,
          embedding: embeddings[j],
        });
      }
      totalEmbedded += batch.length;
    }
  } finally {
    store.close();
  }

  writeState(wikiPath, state);
  return { embedded: totalEmbedded, skipped, articles_processed: toProcess.length };
}
