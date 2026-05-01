import fs from 'fs';
import path from 'path';
import { embedBatch } from './claim-embeddings.js';
import { KnowledgeVectorStore } from './knowledge-vector-store.js';
import type { ClaimEntry } from './claim-store.js';

interface EmbedState {
  processedLines: number;
}

interface EmbedResult {
  embedded: number;
  skipped: number;
  deduped: number;
}

function readState(wikiPath: string): EmbedState {
  try {
    return JSON.parse(fs.readFileSync(path.join(wikiPath, 'embed-state.json'), 'utf8'));
  } catch {
    return { processedLines: 0 };
  }
}

function writeState(wikiPath: string, state: EmbedState): void {
  fs.writeFileSync(path.join(wikiPath, 'embed-state.json'), JSON.stringify(state));
}

export async function embedClaims(wikiPath: string): Promise<EmbedResult> {
  const jsonlPath = path.join(wikiPath, 'claims.jsonl');
  if (!fs.existsSync(jsonlPath)) return { embedded: 0, skipped: 0, deduped: 0 };

  const allLines = fs.readFileSync(jsonlPath, 'utf8').trim().split('\n').filter(Boolean);
  const state = readState(wikiPath);

  if (state.processedLines > allLines.length) {
    return dedupFallback(wikiPath, allLines);
  }

  const newLines = allLines.slice(state.processedLines);
  if (newLines.length === 0) {
    return { embedded: 0, skipped: state.processedLines, deduped: 0 };
  }

  const entries: ClaimEntry[] = newLines.map((line) => JSON.parse(line));
  const texts = entries.map((e) => e.claim);
  const embeddings = await embedBatch(texts);

  if (embeddings.length !== entries.length) {
    console.error(`[claim-embed] Partial embedding failure: got ${embeddings.length}/${entries.length} embeddings. Retryable on next call.`);
    return { embedded: 0, skipped: state.processedLines, deduped: 0 };
  }

  const store = new KnowledgeVectorStore(wikiPath);
  try {
    for (let i = 0; i < entries.length; i++) {
      store.insertEntry({
        text: entries[i].claim,
        contextual_text: entries[i].claim,
        type: 'claim',
        source_url: entries[i].source_url,
        article_slug: '',
        section: '',
        source_score: entries[i].source_score,
        wiki: entries[i].wiki,
        embedding: embeddings[i],
      });
    }
  } finally {
    store.close();
  }

  writeState(wikiPath, { processedLines: allLines.length });
  return { embedded: entries.length, skipped: state.processedLines, deduped: 0 };
}

async function dedupFallback(wikiPath: string, allLines: string[]): Promise<EmbedResult> {
  const entries: ClaimEntry[] = allLines.map((line) => JSON.parse(line));

  const store = new KnowledgeVectorStore(wikiPath);
  let embedded = 0;
  let deduped = 0;

  try {
    const existingRows = store.getAllByType('claim');
    const existingTexts = new Set(existingRows.map((r) => r.text));

    const newEntries = entries.filter((e) => !existingTexts.has(e.claim));
    deduped = entries.length - newEntries.length;

    if (newEntries.length > 0) {
      const texts = newEntries.map((e) => e.claim);
      const embeddings = await embedBatch(texts);

      if (embeddings.length === newEntries.length) {
        for (let i = 0; i < newEntries.length; i++) {
          store.insertEntry({
            text: newEntries[i].claim,
            contextual_text: newEntries[i].claim,
            type: 'claim',
            source_url: newEntries[i].source_url,
            article_slug: '',
            section: '',
            source_score: newEntries[i].source_score,
            wiki: newEntries[i].wiki,
            embedding: embeddings[i],
          });
        }
        embedded = newEntries.length;
      }
    }
  } finally {
    store.close();
  }

  writeState(wikiPath, { processedLines: allLines.length });
  return { embedded, skipped: 0, deduped };
}
