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

async function embedAndStore(
  store: KnowledgeVectorStore,
  sentences: PreparedSentence[],
): Promise<number> {
  let totalEmbedded = 0;

  for (let i = 0; i < sentences.length; i += EMBED_BATCH_SIZE) {
    const batch = sentences.slice(i, i + EMBED_BATCH_SIZE);
    const texts = batch.map((s) => s.contextual_text);
    const embeddings = await embedBatch(texts);

    if (embeddings.length !== batch.length) {
      console.error(`[sentence-embed] Partial embedding: got ${embeddings.length}/${batch.length}. Retrying with smaller batch.`);
      const half = Math.floor(batch.length / 2);
      if (half === 0) break;
      const firstHalf = batch.slice(0, half);
      const firstTexts = firstHalf.map((s) => s.contextual_text);
      const firstEmb = await embedBatch(firstTexts);
      if (firstEmb.length !== firstHalf.length) break;
      for (let j = 0; j < firstHalf.length; j++) {
        store.insertEntry({
          text: firstHalf[j].text,
          contextual_text: firstHalf[j].contextual_text,
          type: firstHalf[j].type,
          source_url: firstHalf[j].source_url,
          article_slug: firstHalf[j].article_slug,
          section: firstHalf[j].section,
          source_score: 0,
          wiki: firstHalf[j].wiki,
          embedding: firstEmb[j],
        });
      }
      totalEmbedded += firstHalf.length;
      continue;
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

  return totalEmbedded;
}

export async function embedSentences(
  wikiPath: string,
  articlePaths: string[],
  wiki?: string,
): Promise<EmbedResult> {
  if (articlePaths.length === 0) return { embedded: 0, skipped: 0, articles_processed: 0 };

  const state = readState(wikiPath);
  const processedSet = new Set(state.processedArticles);
  const claimTexts = loadClaimTexts(wikiPath);
  const wikiName = wiki || path.basename(wikiPath);

  const toProcess: string[] = [];
  let skipped = 0;

  for (const p of articlePaths) {
    const filename = path.basename(p);
    if (processedSet.has(filename)) {
      skipped++;
      continue;
    }
    toProcess.push(p);
  }

  if (toProcess.length === 0) return { embedded: 0, skipped, articles_processed: 0 };

  const store = new KnowledgeVectorStore(wikiPath);
  let totalEmbedded = 0;
  let articlesProcessed = 0;

  try {
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
      if (sentences.length === 0) {
        state.processedArticles.push(path.basename(articlePath));
        continue;
      }

      const prepared: PreparedSentence[] = sentences.map((s) => {
        const contextPrefix = s.section ? `[${title} | ${s.section}]` : `[${title}]`;
        const isClaim = claimTexts.has(s.text.toLowerCase().trim());
        return {
          text: s.text,
          contextual_text: `${contextPrefix} ${s.text}`,
          type: isClaim ? 'claim' as const : 'sentence' as const,
          source_url: sourceUrl,
          article_slug: slug,
          section: s.section,
          wiki: wikiName,
        };
      });

      const embedded = await embedAndStore(store, prepared);
      totalEmbedded += embedded;
      articlesProcessed++;

      // Only mark as processed AFTER successful embedding
      state.processedArticles.push(path.basename(articlePath));

      // Persist state periodically (every 10 articles) for crash recovery
      if (articlesProcessed % 10 === 0) {
        writeState(wikiPath, state);
      }
    }
  } finally {
    store.close();
  }

  writeState(wikiPath, state);
  return { embedded: totalEmbedded, skipped, articles_processed: articlesProcessed };
}
