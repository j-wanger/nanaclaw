# Project: nanaclaw

> Last updated: 2026-05-07 by /dev-debrief (Phase 44 complete)

## Recommended Next Action

Run `/dev-plan` for next phase. Candidates: domain expert agents, context size calibration, compaction resilience patterns.

## Active Phase

**[[phase-44-curated-article-embedding|Phase 44: Curated Article Embedding + Index-in-Context]]** (status: completed)

Entry criteria: MET
Exit criteria: MET — curated articles embedded with type "curated", index-in-context at spawn, type filtering in knowledge_search, docs updated

Progress: 100% (6/6 tasks)

## Active Phase Contract

Phase: 44 - Curated Article Embedding + Index-in-Context
Tasks: 6 (see tasks.md)
Transition: continue
Abort: if blocked >3 attempts, ask user: skip or abort

## Recent Decisions

| Decision | Confidence | Date |
|----------|------------|------|
| [[curated-article-embedding-approach]] | high | 2026-05-07 |
| [[knowledge-pipeline-post-phase-42-design]] | high | 2026-05-05 |
| [[inline-citation-convention]] | high | 2026-05-06 |

## Blockers and Open Questions

- ~~[planning] Should curated article embedding strip citation markers [slug] before embedding, or leave them for contextual signal? (raised 2026-05-07)~~ resolved: strip before embedding — citation markers pollute semantic vectors, curated-only pre-processing
- ~~[planning] Article index token budget at spawn — 137 articles with title+slug is ~2K tokens; how to handle growth? (raised 2026-05-07)~~ resolved: ~2K tokens per wiki budget, warning log if >500 articles

## Session Journal (last 5)

- [2026-05-07] [[2026-05-07-phase-44-curated-article-embedding-complete|Phase 44: Curated Article Embedding Complete]] — 6 tasks, curated type in knowledge store, article index at spawn, 449+377 tests pass
- [2026-05-06] [[2026-05-06-phase-43-instruction-cleanup-complete|Phase 43: Instruction Cleanup Complete]] — 6 tasks, skill instruction updates, citation convention codified
- [2026-05-05] [[2026-05-05-knowledge-pipeline-redesign|Knowledge Pipeline Redesign Discussion]] — 2 decisions (pipeline design, citation convention), 5 discovered tasks for next phase
- [2026-05-05] [[2026-05-05-phase-42-pipeline-simplification-complete|Phase 42: Pipeline Simplification Complete]] — 6 tasks, 20+ files deleted, 7 wikis cleaned, deterministic pipeline only
- [2026-05-05] [[2026-05-05-phase-41-memory-migration-bugfixes-complete|Phase 41: Memory Migration Bugfixes]] — 3 bugs fixed (FTS rebuild, content dedup, source-type tag)

## Key Artifacts

| Path | Purpose | Last Modified |
|------|---------|---------------|
| memory_server/ | Standalone Python MCP server — 12 MCP tools, 186 tests | 2026-05-03 |
| container/agent-runner/src/mcp-tools/knowledge-tools.ts | knowledge_search + knowledge_embed + small-to-big expansion MCP tools | 2026-05-05 |
| container/agent-runner/src/mcp-tools/knowledge-vector-store.ts | Unified knowledge store — search, insert, getWindow, getByArticleSlug | 2026-05-05 |
| container/agent-runner/src/mcp-tools/research-fetch.ts | research_fetch — SearXNG → raw articles with Jina fallback | 2026-05-05 |
| container/skills/wiki-manager/ | Wiki management skill — updated instructions, routing, citation convention | 2026-05-06 |

## Cross-References

- agentic-engineering-wiki — chunking-and-embedding-strategies, wiki-retrieval-architecture (contextual retrieval, small-to-big patterns)
- agent-memory-wiki — 2,005 raw articles, research base for memory architecture
- memory_server/ — standalone Python MCP server (Phases 29-32), SQLite + FTS5 + embedding + sidecar, 186 tests, 12 MCP tools
- Knowledge pipeline — deterministic: research_fetch → knowledge_embed → knowledge_search + knowledge_conflicts
- [[knowledge-pipeline-post-phase-42-design]] — articles as optional curated layer, sentence embeddings primary
- [[inline-citation-convention]] — frontmatter sources + inline [slug] markers for provenance
- ~/.claude/skills/knowledge-wiki/ — article conventions + content model updated Phase 43
