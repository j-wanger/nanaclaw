import type { KnowledgeVectorStore, KnowledgeRow } from './knowledge-vector-store.js';
import { cosineSimilarity } from './vector-utils.js';

export interface ConflictPairEntry {
  text: string;
  contextual_text: string;
  article_slug: string;
  section: string;
  source_url: string | null;
}

export interface ConflictPair {
  a: ConflictPairEntry;
  b: ConflictPairEntry;
  similarity: number;
}

function toEntry(row: KnowledgeRow & { embedding?: Float32Array }): ConflictPairEntry {
  return {
    text: row.text,
    contextual_text: row.contextual_text,
    article_slug: row.article_slug,
    section: row.section,
    source_url: row.source_url,
  };
}

function deduplicatePairs(pairs: ConflictPair[]): ConflictPair[] {
  const seen = new Set<string>();
  return pairs.filter((p) => {
    const key = [p.a.text, p.b.text].sort().join('\0');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function findArticleConflicts(
  store: KnowledgeVectorStore,
  articleSlug: string,
  topK: number,
  minSimilarity = 0.7,
): ConflictPair[] {
  const articleRows = store.getByArticleSlug(articleSlug);
  if (articleRows.length === 0) return [];

  const allRows = store.db_allWithEmbeddings();
  const pairs: ConflictPair[] = [];

  for (const artRow of articleRows) {
    for (const other of allRows) {
      if (other.article_slug === articleSlug) continue;

      const sim = cosineSimilarity(artRow.embedding, other.embedding);
      if (sim < minSimilarity) continue;

      pairs.push({
        a: toEntry(artRow),
        b: toEntry(other),
        similarity: Math.round(sim * 1000) / 1000,
      });
    }
  }

  pairs.sort((a, b) => b.similarity - a.similarity);
  const deduplicated = deduplicatePairs(pairs);
  return deduplicated.slice(0, topK);
}

export function findQueryConflicts(
  store: KnowledgeVectorStore,
  queryVec: Float32Array,
  topK: number,
  searchTopK = 50,
): ConflictPair[] {
  const results = store.searchSimilar(queryVec, searchTopK);
  const pairs: ConflictPair[] = [];

  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      if (results[i].article_slug === results[j].article_slug) continue;

      const sim = Math.min(results[i].similarity, results[j].similarity);
      pairs.push({
        a: toEntry(results[i]),
        b: toEntry(results[j]),
        similarity: Math.round(sim * 1000) / 1000,
      });
    }
  }

  pairs.sort((a, b) => b.similarity - a.similarity);
  return deduplicatePairs(pairs).slice(0, topK);
}
