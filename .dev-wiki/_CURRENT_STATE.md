# Project: nanaclaw

> Last updated: 2026-05-06 by /dev-plan (Phase 43 planned)

## Recommended Next Action

Phase 43 active. 6 tasks — instruction cleanup across wiki-manager and knowledge-wiki skill files. Remove all references to deleted claim tools, simplify article lifecycle, codify inline citation convention. No code changes.

## Active Phase

**[[phase-43-knowledge-pipeline-instruction-cleanup|Phase 43: Knowledge Pipeline Instruction Cleanup]]** (status: active, ~0%)

Entry criteria: MET (Phase 42 complete, claim tools deleted, pipeline simplified)
Exit criteria: Zero grep matches for deleted tool names in skill files, inline citation convention documented

Progress: ~0% (tasks planned, implementation not started)

## Active Phase Contract

Phase: 43 - Knowledge Pipeline Instruction Cleanup
Tasks: 6 (see tasks.md)
Transition: continue
Abort: if blocked >3 attempts, ask user: skip or abort

## Recent Decisions

| Decision | Confidence | Date |
|----------|------------|------|
| [[include-knowledge-wiki-files-in-scope]] | high | 2026-05-06 |
| [[simplify-episodic-tier-references]] | medium | 2026-05-06 |
| [[knowledge-pipeline-post-phase-42-design]] | high | 2026-05-05 |

## Blockers and Open Questions

- ~~[planning] Qwen3 tool-calling format reliability unknown — experiments will determine approach (raised 2026-04-26)~~ resolved: Phase 6a experiments passed, OpenAI function_call format works
- ~~[planning] dispatch_worker MCP tool handler does not wire `tools` field to contract — workers silently run single-shot (raised 2026-04-26, Task 1 of Phase 6b)~~ resolved: Phase 6b Task 1
- ~~[planning] wiki-bridge: search.py location discovery — WIKI_TOOLS_DIR env var or convention? (raised 2026-04-26)~~ resolved: WIKI_TOOLS_DIR env var, propagates via process.env spread in host-mode
- ~~[planning] OneCLI CA cert availability in host-mode Bun process — proxy works but cert injection unknown (raised 2026-04-26)~~ resolved: OneCLI proxy works in host mode (agent received Claude API access)
- ~~[planning] SearXNG not yet installed — required for research loop E2E (raised 2026-04-26)~~ resolved: SearXNG installed via Docker on port 8888
- ~~[planning] Fragment symlinks point to Docker /app/... paths in host-mode — agent can't read skill/module instructions (raised 2026-04-27)~~ resolved: Phase 11 (5 fixes: symlink paths, bun path, idle worker check, env vars, fragment imports)
- ~~[planning] llama-cpp multi-instance hosting — `--parallel N` flag or secondary 8B model for concurrent research workers (raised 2026-04-27)~~ resolved: Phase 13 — server already has 4 slots, max_concurrent updated to 4
- ~~[implementation] Worker step-repetition: Qwen workers consistently fail to transition from search/extract to wiki_write within timeout (raised 2026-04-27, Phase 13 live test)~~ resolved: Phase 15 — removed LLM from search/extract, workers only do cognitive tasks (summarize, review)
- ~~[implementation] checkWorkerResults poll-loop pickup: result files not cleaned up after worker completion (raised 2026-04-27, Phase 13 live test)~~ resolved: Phase 15 — compact result injection, write_to post-processing handles file routing
- ~~[implementation] Review stage inert: findRawSource() in research-review.ts matches by source_url in episodic frontmatter, but writeEpisodicArticle() never writes source_url — review workers are silently skipped (raised 2026-04-28, Phase 15 reviewer)~~ resolved: Phase 16 Task 4 — source_url propagated through WriteTo interface

## Session Journal (last 5)

- [2026-05-05] [[2026-05-05-knowledge-pipeline-redesign|Knowledge Pipeline Redesign Discussion]] — 2 decisions (pipeline design, citation convention), 5 discovered tasks for next phase
- [2026-05-05] [[2026-05-05-phase-42-pipeline-simplification-complete|Phase 42: Pipeline Simplification Complete]] — 6 tasks, 20+ files deleted, 7 wikis cleaned, deterministic pipeline only
- [2026-05-05] [[2026-05-05-phase-41-memory-migration-bugfixes-complete|Phase 41: Memory Migration Bugfixes]] — 3 bugs fixed (FTS rebuild, content dedup, source-type tag)
- [2026-05-05] [[2026-05-05-phase-40-memory-migration-claim-dedup-complete|Phase 40: Memory Migration + Claim Dedup Guard Complete]] — 3 tasks, auto-migrate + max_claims cap, closes all review issues
- [2026-05-05] [[2026-05-05-phase-38-review-remediation-complete|Phase 38: Review Remediation Complete]] — 7 tasks, search routing + dedup + taxonomy + dual-read, reviewer 6/10→fixed

## Key Artifacts

| Path | Purpose | Last Modified |
|------|---------|---------------|
| memory_server/ | Standalone Python MCP server — 12 MCP tools, 186 tests | 2026-05-03 |
| container/agent-runner/src/mcp-tools/knowledge-tools.ts | knowledge_search + knowledge_embed + small-to-big expansion MCP tools | 2026-05-05 |
| container/agent-runner/src/mcp-tools/knowledge-vector-store.ts | Unified knowledge store — search, insert, getWindow, getByArticleSlug | 2026-05-05 |
| container/agent-runner/src/mcp-tools/research-fetch.ts | research_fetch — SearXNG → raw articles with Jina fallback | 2026-05-05 |

## Cross-References

- agentic-engineering-wiki — chunking-and-embedding-strategies, wiki-retrieval-architecture (contextual retrieval, small-to-big patterns)
- agent-memory-wiki — 2,005 raw articles, research base for memory architecture
- memory_server/ — standalone Python MCP server (Phases 29-32), SQLite + FTS5 + embedding + sidecar, 186 tests, 12 MCP tools
- Knowledge pipeline — deterministic: research_fetch → knowledge_embed → knowledge_search + knowledge_conflicts
- [[knowledge-pipeline-post-phase-42-design]] — articles as optional curated layer, sentence embeddings primary
- [[inline-citation-convention]] — frontmatter sources + inline [slug] markers for provenance
