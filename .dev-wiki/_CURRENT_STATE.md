# Project: nanaclaw

> Last updated: 2026-05-03 by /dev-debrief

## Recommended Next Action

Phase 32 all tasks complete (6/6). Confirm phase completion, then run `/dev-plan` for next phase.

## Active Phase

**[[phase-32-memory-mcp-integration|Phase 32: Memory MCP Server — Nanaclaw + Consolidation]]** (status: active, ~0%)

Entry criteria: MET (Phase 31 complete)
Exit criteria: 0/8 met. 8 remaining.
Progress: ~0% (0/6 tasks done)

## Active Phase Contract

Phase: 32 - Memory MCP Server — Nanaclaw + Consolidation
Tasks: 6 (3M + 3S, see tasks.md)
Transition: continue
Abort: if blocked >3 attempts, ask user: skip or abort

## Recent Decisions

| Decision | Confidence | Date |
|----------|------------|------|
| [[phase-32-nanaclaw-consolidation-approach]] | medium | 2026-05-03 |
| [[phase-31-sidecar-trust-lifecycle-approach]] | medium | 2026-05-03 |
| [[memory-mcp-server-architecture]] | high | 2026-05-02 |

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

## Key Artifacts

| Path | Purpose | Last Modified |
|------|---------|---------------|
| memory_server/ | Standalone Python MCP server — 12 MCP tools, 186 tests | 2026-05-03 |
| memory_server/storage.py | SQLite layer: store, search, dedup, export/import, prune, global fan-out | 2026-05-03 |
| memory_server/consolidator.py | Single-link cosine clustering + Qwen sidecar merge (fail-closed) | 2026-05-03 |
| memory_server/migrate.py | MEMORY.md parser + migrator with type→category mapping | 2026-05-03 |
| memory_server/extract_cli.py | Post-session transcript extraction CLI | 2026-05-03 |
| memory_server/server.py | FastMCP wiring: 12 MCP tools with scope routing | 2026-05-03 |
| groups/dm-with-wang/container.json | Nanaclaw MCP wiring with MEMORY_PROJECT_DIR env | 2026-05-03 |

## Session Journal (last 5)

- [2026-05-03] [[2026-05-03-phase-32-memory-mcp-nanaclaw-consolidation-complete|Phase 32: Memory MCP Server — Nanaclaw + Consolidation Complete]] — 6 tasks, consolidation + migration + prune + global fan-out + MCP wiring, 186 tests, reviewer 8/10
- [2026-05-03] [[2026-05-03-phase-31-memory-mcp-sidecar-complete|Phase 31: Memory MCP Server — Sidecar + Trust Lifecycle Complete]] — 6 tasks, sidecar verifier + contradiction tracking + extractor, 157 tests, reviewer 9/10
- [2026-05-03] [[2026-05-03-phase-30-memory-mcp-embeddings-complete|Phase 30: Memory MCP Server — Embeddings + Claude Code Complete]] — 6 tasks, embedding search + RRF fusion + export/import + Claude Code rules, 130 tests, reviewer 7/10→fixed
- [2026-05-03] [[2026-05-03-phase-29-memory-mcp-core-complete|Phase 29: Memory MCP Server — Core Storage + Tools Complete]] — 6 tasks, standalone Python MCP server, 62 tests, reviewer 8/10
- [2026-05-02] Phase 28 completed (all 6 tasks). Insight extraction pipeline operational.

## Cross-References

- agentic-engineering-wiki — verifier-quality-and-scalable-oversight (TPR>96%, TNR<25% for LLM judges — validates fail-open approach)
- agent-memory-wiki — 2,005 raw articles, 573 insights in knowledge.db, research base for memory architecture
- memory_server/ — standalone Python MCP server (Phases 29-32), SQLite + FTS5 + embedding + sidecar, 186 tests, 12 MCP tools
- groups/dm-with-wang/memory-mcp-plan.md — Memory MCP Server consolidated plan (Phases 29-32)
