Knowledge tool routing -- which tool for which intent:

| Intent | Tool | Notes |
|--------|------|-------|
| Find a specific fact | `knowledge_search` | Sentence-level semantic search. Use `expand: "window"` for surrounding context |
| Read a full article | `wiki_search` then `wiki_read` | wiki_search finds the slug, wiki_read fetches content |
| Check wiki health | `wiki_stats` | Article counts per tier |
| Find sentence-level contradictions | `knowledge_conflicts` | Pairwise similarity across sentences, optional Qwen classification |
| Embed new articles | `knowledge_embed` | Splits articles into sentences, embeds into knowledge.db |
| Embed curated articles | `knowledge_embed` with `source: "articles"` | Embeds curated wiki articles as type "curated", strips citation markers |
| Find curated knowledge | `knowledge_search` with `type: "curated"` | Searches only curated article sentences |

## Retrieval Decision Tree

When answering a domain question:

1. **Know the article slug?** (from the article index in context) → `wiki_read` directly
2. **Need a fact or summary?** → `knowledge_search` with `type: "curated"` first — curated articles are synthesized, cited, and higher signal than raw sources
3. **Curated layer has no results, or need depth/provenance?** → `knowledge_search` with `type: "sentence"` to hit the raw source layer (217K+ sentences)
4. **Need full article context after finding a sentence?** → use the `article_slug` from results, then `wiki_read`

Default: curated first, raw for depth. The article index in your context is a catalog — use it to route directly to `wiki_read` when a relevant article is obvious.
