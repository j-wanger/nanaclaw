Knowledge tool routing -- which tool for which intent:

| Intent | Tool | Notes |
|--------|------|-------|
| Find a specific fact | `knowledge_search` | Sentence-level semantic search. Use `expand: "window"` for surrounding context |
| Find a claim with provenance | `claim_search` | Searches claim-type entries with source attribution |
| Read a full article | `wiki_search` then `wiki_read` | wiki_search finds the slug, wiki_read fetches content |
| Check wiki health | `wiki_stats` | Article counts per tier, claim coverage |
| Link claims to evidence | `claim_link` | Runs NLI verification against knowledge.db sentences |
| Find contradictions between claims | `claim_conflicts` | Three vectors: shared evidence, staleness, cross-claim NLI |
| Find sentence-level contradictions | `knowledge_conflicts` | Pairwise NLI across sentences (no claim metadata) |
| Repair stale/orphaned claims | `claim_reconcile` | Detect-then-fix pipeline. Use `dry_run: true` to preview |
| Find duplicate claims | `claim_dedup` | Cosine similarity across claim embeddings |
| Embed new articles | `knowledge_embed` | Splits articles into sentences, embeds into knowledge.db |
| Discover unannotated claims | `claim_discover` | Finds factual sentences without claim markers |

When unsure, start with `knowledge_search` (broadest). Narrow to `claim_search` for provenance-tracked facts. Use `wiki_search` + `wiki_read` when you need full article context rather than individual sentences.
