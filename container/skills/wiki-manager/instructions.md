Wiki tool usage rules:

- Always call `wiki_search` before `wiki_read` unless you already have the slug from a previous search or research_fetch output.
- `wiki_read` requires `wiki_name` — the search results tell you which wiki an article is in.
- Default tier for `wiki_read` is `articles`. Use `tier: "episodic"` or `tier: "raw"` to inspect research pipeline output.
- `wiki_stats` is cheap — call it when reporting research results or checking wiki health.
- Research output goes to wikis (raw tier via research_fetch), not to MEMORY.md. Relationship context goes to MEMORY.md, not to wikis.

For knowledge tools (`knowledge_search`, `knowledge_conflicts`, `knowledge_embed`), see `knowledge-routing.md` for the intent-to-tool routing table.
