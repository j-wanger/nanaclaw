# Project: nanaclaw

> Last updated: 2026-05-05 by /dev-plan

## Recommended Next Action

Begin Phase 40 implementation. Task 1: auto-migrate MEMORY.md at spawn.

## Active Phase

**[[phase-40-memory-migration-claim-dedup|Phase 40: Memory Migration + Claim Dedup Guard]]** (status: active, ~0%)

Entry criteria: MET (Phase 39 complete, context builder dual-read implemented, memory skill updated)
Exit criteria: 0/3 met. 3 remaining.
Progress: ~0% (0/3 tasks done)

## Active Phase Contract

Phase: 40 - Memory Migration + Claim Dedup Guard
Tasks: 3 (1M + 2S, see tasks.md)
Transition: continue
Abort: if blocked >3 attempts, ask user: skip or abort

## Recent Decisions

| Decision | Confidence | Date |
|----------|------------|------|
| [[phase-40-memory-migration-claim-dedup-approach]] | medium | 2026-05-05 |
| [[phase-38-review-remediation-approach]] | medium | 2026-05-05 |
| [[phase-37-small-to-big-retrieval-approach]] | high | 2026-05-05 |

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
| /Users/jwang/knowledge-wiki/skills/knowledge-wiki/claim-spec.md | Canonical claim provenance system spec | 2026-05-04 |
| container/agent-runner/src/mcp-tools/claim-reconcile.ts | claim_reconcile MCP tool — detect-then-fix stale/orphan pipeline | 2026-05-05 |
| container/agent-runner/src/mcp-tools/claim-conflicts.ts | claim_conflicts MCP tool — three-vector conflict detection | 2026-05-04 |
| container/agent-runner/src/mcp-tools/claim-linker.ts | claim_link MCP tool — two-pass pipeline (vector + NLI) + parseClaimMetadata | 2026-05-04 |
| container/agent-runner/src/mcp-tools/knowledge-tools.ts | knowledge_search + knowledge_embed + small-to-big expansion MCP tools | 2026-05-05 |
| container/agent-runner/src/mcp-tools/knowledge-vector-store.ts | Unified knowledge store — search, insert, getWindow, getByArticleSlug | 2026-05-05 |

## Session Journal (last 5)

- [2026-05-05] [[2026-05-05-phase-38-review-remediation-complete|Phase 38: Review Remediation Complete]] — 7 tasks, search routing + dedup + taxonomy + dual-read, reviewer 6/10→fixed
- [2026-05-05] [[2026-05-05-phase-37-small-to-big-retrieval-complete|Phase 37: Small-to-Big Retrieval Complete]] — 3 tasks, sentence-window expansion + overlap merge, 12 new tests
- [2026-05-05] [[2026-05-05-phase-36-claim-reconciliation-complete|Phase 36: Claim Reconciliation Complete]] — 3 tasks, claim_reconcile MCP tool + detect-then-fix pipeline, reviewer 8/10
- [2026-05-04] [[2026-05-04-phase-35-claim-conflict-detection-complete|Phase 35: Claim Conflict Detection Complete]] — 6 tasks, claim_conflicts MCP tool + 3 detection vectors, reviewer 8/10
- [2026-05-04] [[2026-05-04-phase-34-claim-linker-complete|Phase 34: Claim Linker Complete]] — 6 tasks, claim_link MCP tool + NLI pipeline, reviewer 7/10→fixed

## Cross-References

- agentic-engineering-wiki — chunking-and-embedding-strategies, wiki-retrieval-architecture (contextual retrieval, small-to-big patterns)
- agent-memory-wiki — 2,005 raw articles, 573 insights in knowledge.db, research base for memory architecture
- memory_server/ — standalone Python MCP server (Phases 29-32), SQLite + FTS5 + embedding + sidecar, 186 tests, 12 MCP tools
- knowledge-wiki (Option B plan) — All 6 phases complete (markers + embeddings + linker + conflict detection + reconciliation + small-to-big retrieval)
