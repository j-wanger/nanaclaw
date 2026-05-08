# Project: nanaclaw

> Last updated: 2026-05-08 by /dev-debrief

## Recommended Next Action

Phase 45 complete. Commit and push, restart service. Next: curate trading wiki using new wiki-curator skill, or plan Phase 46.

## Active Phase

**[[phase-45-ux-persona-curation-fixes|Phase 45: UX, Persona, and Curation Fixes]]** (status: complete, 100%)

Entry criteria: MET (Phase 44 complete, daily-use UX issues identified)
Exit criteria: 6/6 met. 0 remaining.
Progress: 100% (6/6 tasks done)

## Active Phase Contract

Phase: 45 - UX, Persona, and Curation Fixes
Tasks: 6 (2M + 4S, see tasks.md)
Transition: continue
Abort: if blocked >3 attempts, ask user: skip or abort

## Recent Decisions

| Decision | Confidence | Date |
|----------|------------|------|
| [[per-group-persona-via-claude-local]] | high | 2026-05-08 |
| [[phase-45-ux-persona-curation-approach]] | medium | 2026-05-08 |
| [[curated-article-embedding-approach]] | high | 2026-05-07 |

## Blockers and Open Questions

- ~~[planning] Should curated article embedding strip citation markers [slug] before embedding, or leave them for contextual signal? (raised 2026-05-07)~~ resolved: strip before embedding — citation markers pollute semantic vectors, curated-only pre-processing
- ~~[planning] Article index token budget at spawn — 137 articles with title+slug is ~2K tokens; how to handle growth? (raised 2026-05-07)~~ resolved: ~2K tokens per wiki budget, warning log if >500 articles

## Session Journal (last 5)

- [2026-05-08] [[2026-05-08-phase-45-ux-persona-curation-complete|Phase 45: UX, Persona, and Curation Fixes Complete]] — 6 tasks, SOUL.md lean baseline, per-group persona via CLAUDE.local.md, wiki-curator skill, PostCompact hook, 7 memory entries
- [2026-05-07] [[2026-05-07-phase-44-curated-article-embedding-complete|Phase 44: Curated Article Embedding Complete]] — 6 tasks, curated type in knowledge store, article index at spawn, 449+377 tests pass
- [2026-05-06] [[2026-05-06-phase-43-instruction-cleanup-complete|Phase 43: Instruction Cleanup Complete]] — 6 tasks, skill instruction updates, citation convention codified
- [2026-05-05] [[2026-05-05-knowledge-pipeline-redesign|Knowledge Pipeline Redesign Discussion]] — 2 decisions (pipeline design, citation convention), 5 discovered tasks for next phase
- [2026-05-05] [[2026-05-05-phase-42-pipeline-simplification-complete|Phase 42: Pipeline Simplification Complete]] — 6 tasks, 20+ files deleted, 7 wikis cleaned, deterministic pipeline only

## Key Artifacts

| Path | Purpose | Last Modified |
|------|---------|---------------|
| memory_server/ | Standalone Python MCP server — 12 MCP tools, 186 tests | 2026-05-03 |
| container/agent-runner/src/mcp-tools/knowledge-tools.ts | knowledge_search + knowledge_embed + small-to-big expansion MCP tools | 2026-05-05 |
| container/agent-runner/src/mcp-tools/knowledge-vector-store.ts | Unified knowledge store — search, insert, getWindow, getByArticleSlug | 2026-05-05 |
| container/agent-runner/src/mcp-tools/research-fetch.ts | research_fetch — SearXNG → raw articles with Jina fallback | 2026-05-05 |
| container/skills/wiki-manager/ | Wiki management skill — updated instructions, routing, citation convention | 2026-05-08 |
| container/skills/wiki-curator/ | Wiki curation skill — taxonomy-first workflow, progress reporting, state tracking | 2026-05-08 |
| .claude/rules/session-continuity.md | Session state update triggers + compaction recovery instructions | 2026-05-08 |
| groups/dm-with-wang/CLAUDE.local.md | Full 毒舌小妹 persona for Telegram DM agent group | 2026-05-08 |
| container/agent-runner/src/providers/claude.ts | PostCompact hook writes session-state.md | 2026-05-08 |

## Cross-References

- agentic-engineering-wiki — chunking-and-embedding-strategies, wiki-retrieval-architecture (contextual retrieval, small-to-big patterns)
- agent-memory-wiki — 2,005 raw articles, research base for memory architecture
- memory_server/ — standalone Python MCP server (Phases 29-32), SQLite + FTS5 + embedding + sidecar, 186 tests, 12 MCP tools
- Knowledge pipeline — deterministic: research_fetch → knowledge_embed → knowledge_search + knowledge_conflicts
- [[knowledge-pipeline-post-phase-42-design]] — articles as optional curated layer, sentence embeddings primary
- [[inline-citation-convention]] — frontmatter sources + inline [slug] markers for provenance
- ~/.claude/skills/knowledge-wiki/ — article conventions + content model updated Phase 43
- container/skills/wiki-curator/ — taxonomy-first curation workflow skill (Phase 45)
- [[per-group-persona-via-claude-local]] — SOUL.md shared baseline + per-group CLAUDE.local.md for full persona
