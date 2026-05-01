# Project: nanaclaw

> Last updated: 2026-05-01 by /dev-debrief

## Recommended Next Action

Phase 25 complete (6/6 tasks). All exit criteria met. Run `/dev-plan` for Phase 26 — consider entity extraction live validation on AML wiki, entity resolution/fuzzy matching, or negative news processing pipeline.

## Active Phase

**[[phase-25-session-resume-entity-extraction|Phase 25: Session Resume Guard + Entity Extraction Pipeline]]** (status: active)

Exit criteria: 6/6 met
Progress: ~100% (6/6 tasks done)

## Active Phase Contract

Phase: 25 - Session Resume Guard + Entity Extraction Pipeline
Tasks: 6 (see tasks.md)
Transition: fresh-session
Abort: if blocked >3 attempts, ask user: skip or abort

## Recent Decisions

| Decision | Confidence | Date |
|----------|------------|------|
| [[phase-25-session-resume-entity-extraction-approach]] | medium | 2026-05-01 |
| [[phase-24-deep-work-session-reliability-approach]] | medium | 2026-04-30 |
| [[phase-23-claim-backfill-e2e-approach]] | medium | 2026-04-30 |

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
| container/agent-runner/src/poll-loop.ts | Main poll loop — init timeout, deep work retry, idle re-entry | 2026-05-01 |
| container/agent-runner/src/mcp-tools/entity-store.ts | Entity extraction parser + JSONL storage with dedup | 2026-05-01 |
| container/agent-runner/src/mcp-tools/entity-store.test.ts | 14 tests for entity extraction + storage | 2026-05-01 |
| container/agent-runner/src/mcp-tools/local-worker/dispatch.ts | Worker result post-processing — episodic/claims/entities tiers | 2026-05-01 |
| container/agent-runner/src/mcp-tools/research-summarize.ts | Stateful batching — episodic/claims_only/entities_only modes | 2026-05-01 |

## Session Journal (last 5)

- [2026-05-01] [[2026-05-01-phase-25-session-resume-entity-extraction-complete|Phase 25: Session Resume + Entity Extraction Complete]] — 6 tasks, init timeout + entity pipeline, +16 tests, 418 total
- [2026-04-30] [[2026-04-30-phase-24-deep-work-session-reliability-complete|Phase 24: Deep Work Session Reliability Complete]] — 4 tasks, 3 poll-loop bugs fixed, +8 tests, reviewer 9/10
- [2026-04-30] [[2026-04-30-phase-23-claim-backfill-e2e-in-progress|Phase 23: Claim Backfill E2E In Progress]] — 5/6 tasks, 2 E2E bugs fixed, embedding server up, backfill running
- [2026-04-30] [[2026-04-30-phase-22-vector-claim-store-complete|Phase 22: Vector Claim Store Complete]] — 6 tasks, 4 new modules, 3 MCP tools, reviewer 8/10→fixed
- [2026-04-30] [[2026-04-30-phases-18-21-knowledge-pipeline-overhaul|Phases 18-21: Knowledge Pipeline Overhaul]] — 23 tasks across 4 phases

## Cross-References

- docs/memory-architecture.md — Phase 1a research (memory design, retrieval strategy)
- agentic-engineering-wiki — context engineering, harness design, workflow patterns (184+ articles)
- aml-wiki — entity modeling: address-and-employer-modeling, adverse-media-screening-with-ner, aml-data-architecture
- trading-wiki (3,017 raw), aml-wiki (2,870 raw) — live research output
- <wiki>/claims.jsonl — per-wiki atomic claim store
- <wiki>/entities.jsonl — per-wiki structured entity store (Phase 25)
