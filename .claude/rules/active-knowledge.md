# Active Knowledge
## Phase: 37 - Small-to-Big Retrieval

### Sentence-Window Expansion Pattern
from: [[decision:phase-37-small-to-big-retrieval-approach]] + approach review findings
retrieved: 2026-05-05

- 98.3% of raw articles in knowledge.db have no sub-section headings (45/2654 with >1 section) — section expansion returns entire articles
- Sentence-window via ID ordering: N rows before/after matched ID within same article_slug using LIMIT (no contiguity assumption)
- Overlap merging: same-article matches with overlapping windows collapse into single parent_text with best similarity
- IDs are sequential within articles due to sequential embed pipeline (embedSentences processes one article at a time)

### Existing Infrastructure
from: knowledge-vector-store.ts + knowledge-tools.ts
retrieved: 2026-05-05

- KnowledgeVectorStore.searchSimilar returns SearchResult[] with id, text, contextual_text, article_slug, section, similarity
- handleKnowledgeSearch embeds query → searchSimilar → JSON response with results array
- knowledge table has idx_knowledge_article index on article_slug (used by getByArticleSlug, will support getWindow)
- bun:sqlite uses $name params in both SQL and JS keys
