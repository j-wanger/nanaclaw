# Active Knowledge — Phase 16

## Cross-Wiki (agentic-engineering-wiki)
- Tool results are the primary context budget consumer in long sessions — "drop tool results" is a standard compaction strategy, but better to never load them [[wiki:context-compaction-strategies]]
- Working zone is ~60-70% of context window; compaction triggers at ~80% — each research_fetch call consuming 3KB means 73 calls ≈ 220KB ≈ 50-100K tokens, filling the working zone [[wiki:context-window-budget-management]]
- Context shaping is the orchestrator's most impactful job — what each worker sees determines success more than prompt instructions [[wiki:orchestrator-design-patterns]]
- Persist important decisions to files immediately — relying solely on conversation memory is the anti-pattern; it gets summarized away [[wiki:session-lifecycle]]

## Phase Decisions
- Compact output format: {added, skipped, failed, new_articles: [{title, url}]} — preserves coverage evaluation signal (titles + URLs for domain/quality), drops expendable metadata (paths, quality, chars)
- source_url propagation chain: WriteTo interface → research_summarize extracts from raw → writeEpisodicArticle writes to episodic frontmatter → findRawSource matches
- Communication in both SKILL.md and instructions.md — instructions.md survives compaction better (auto-injected fragment)
