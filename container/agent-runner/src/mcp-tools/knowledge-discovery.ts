import type { KnowledgeVectorStore } from './knowledge-vector-store.js';
import { cosineSimilarity } from './vector-utils.js';

export interface ClaimCandidate {
  text: string;
  contextual_text: string;
  article_slug: string;
  section: string;
  source_url: string | null;
  similarity: number;
  nearestClaim: string;
}

export function discoverClaimsInArticle(
  store: KnowledgeVectorStore,
  articleSlug: string,
  topK: number,
  minSimilarity = 0.0,
): ClaimCandidate[] {
  const sentences = store.getByArticleSlug(articleSlug, 'sentence');
  if (sentences.length === 0) return [];

  const claims = store.db_allWithEmbeddings('claim');
  if (claims.length === 0) return [];

  const candidates: ClaimCandidate[] = [];

  for (const sent of sentences) {
    let maxSim = -1;
    let nearestClaim = '';

    for (const claim of claims) {
      const sim = cosineSimilarity(sent.embedding, claim.embedding);
      if (sim > maxSim) {
        maxSim = sim;
        nearestClaim = claim.text;
      }
    }

    if (maxSim >= minSimilarity) {
      candidates.push({
        text: sent.text,
        contextual_text: sent.contextual_text,
        article_slug: sent.article_slug,
        section: sent.section,
        source_url: sent.source_url,
        similarity: Math.round(maxSim * 1000) / 1000,
        nearestClaim,
      });
    }
  }

  candidates.sort((a, b) => b.similarity - a.similarity);
  return candidates.slice(0, topK);
}
