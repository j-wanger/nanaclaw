Wiki tool usage rules:

- Always call `wiki_search` before `wiki_read` unless you already have the slug from a previous search or research_fetch output.
- `wiki_read` requires `wiki_name` — the search results tell you which wiki an article is in.
- Default tier for `wiki_read` is `articles`. Use `tier: "episodic"` or `tier: "raw"` to inspect research pipeline output.
- `wiki_stats` is cheap — call it when reporting research results or checking wiki health.
- Research output goes to wikis (raw tier via research_fetch), not to MEMORY.md. Relationship context goes to MEMORY.md, not to wikis.

For knowledge tools (`knowledge_search`, `knowledge_conflicts`, `knowledge_embed`), see `knowledge-routing.md` for the intent-to-tool routing table.

## Curated Article Embedding

Curated wiki articles (in `articles/`) can be embedded into knowledge.db for semantic search alongside raw source sentences. Use `knowledge_embed` with `source: "articles"` to embed them. All curated entries get type `"curated"` and citation markers (`[source-slug]`) are stripped before embedding. Use `knowledge_search` with `type: "curated"` to search only the curated layer.

At spawn, a full article index is injected into context listing all curated articles by category. This enables native attention routing — you already know what articles exist without searching.

## Inline Citation Convention

When writing wiki articles, use inline citations to trace factual claims back to source material.

**Frontmatter:** List all referenced sources in a `sources` array:
```yaml
sources: [tbml-invoicing-patterns, sanctions-evasion-methods]
```

**Inline:** Place `[source-slug]` after factual sentences, referencing the raw article slug:
```
Trade-based money laundering uses over/under-invoicing to move value [tbml-invoicing-patterns].
```

This is a convention enforced by prompt instructions, not code — there is no automated linking or verification at runtime. The `[slug]` markers are grep-able, so future verification tooling can parse them programmatically if needed.

**When to cite:** After factual claims that originate from a specific source. Do not cite common knowledge, transitional sentences, or your own analysis.
