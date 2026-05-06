Knowledge tool routing -- which tool for which intent:

| Intent | Tool | Notes |
|--------|------|-------|
| Find a specific fact | `knowledge_search` | Sentence-level semantic search. Use `expand: "window"` for surrounding context |
| Read a full article | `wiki_search` then `wiki_read` | wiki_search finds the slug, wiki_read fetches content |
| Check wiki health | `wiki_stats` | Article counts per tier |
| Find sentence-level contradictions | `knowledge_conflicts` | Pairwise similarity across sentences, optional Qwen classification |
| Embed new articles | `knowledge_embed` | Splits articles into sentences, embeds into knowledge.db |

When unsure, start with `knowledge_search` (broadest). Use `wiki_search` + `wiki_read` when you need full article context rather than individual sentences.
