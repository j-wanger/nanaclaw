Wiki tool usage rules:

- Always call `wiki_search` before `wiki_read` unless you already have the slug from a previous search or research_fetch output.
- `wiki_read` requires `wiki_name` — the search results tell you which wiki an article is in.
- Default tier for `wiki_read` is `articles`. Use `tier: "episodic"` or `tier: "raw"` to inspect research output.
- `wiki_stats` is cheap — call it when reporting research results or checking if consolidation is needed.
- Research output goes to wikis (raw/episodic tiers), not to MEMORY.md. Relationship context goes to MEMORY.md, not to wikis.
- Episodic → articles promotion is handled by the user. When stats show a large episodic backlog, mention it but don't attempt to consolidate.
