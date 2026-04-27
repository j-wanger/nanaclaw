# Project: nanaclaw

> Last updated: 2026-04-27 by /dev-debrief

## Recommended Next Action

Phase 10 complete (4/4 tasks, 26 new tests). Push to git, restart nanaclaw, validate live worker dispatch. Next planning: episodic wiki consolidation or multi-agent coordination.

## Active Phase

**[[phase-10-host-mode-integration-tests|Phase 10: Host-Mode Integration Tests]]** (status: completed)

Entry criteria: MET (Phase 9 complete ✓, system operational as daily driver ✓)
Exit criteria: 5/5 met

Progress: 100% (4/4 tasks, 26 new tests, reviewer accept)

## Active Phase Contract

Phase: 10 - Host-Mode Integration Tests
Tasks: 4 (3S + 1M, see tasks.md)
Transition: continue
Abort: if blocked >3 attempts, ask user: skip or abort

## Recent Decisions

| Decision | Confidence | Date |
|----------|------------|------|
| [[phase-10-host-mode-test-coverage-approach]] | medium | 2026-04-27 |
| [[phase-9-prompt-reconciliation-approach]] | medium | 2026-04-27 |
| [[phase-8-operational-deployment-approach]] | medium | 2026-04-26 |

## Blockers and Open Questions

- ~~[planning] Qwen3 tool-calling format reliability unknown — experiments will determine approach (raised 2026-04-26)~~ resolved: Phase 6a experiments passed, OpenAI function_call format works
- ~~[planning] dispatch_worker MCP tool handler does not wire `tools` field to contract — workers silently run single-shot (raised 2026-04-26, Task 1 of Phase 6b)~~ resolved: Phase 6b Task 1
- ~~[planning] wiki-bridge: search.py location discovery — WIKI_TOOLS_DIR env var or convention? (raised 2026-04-26)~~ resolved: WIKI_TOOLS_DIR env var, propagates via process.env spread in host-mode
- ~~[planning] OneCLI CA cert availability in host-mode Bun process — proxy works but cert injection unknown (raised 2026-04-26)~~ resolved: OneCLI proxy works in host mode (agent received Claude API access)
- ~~[planning] SearXNG not yet installed — required for research loop E2E (raised 2026-04-26)~~ resolved: SearXNG installed via Docker on port 8888

## Key Artifacts

| Path | Purpose | Last Modified |
|------|---------|---------------|
| src/spawn-pipeline.test.ts | Spawn pipeline integration tests (14 tests) | 2026-04-27 |
| src/session-roundtrip.test.ts | Session DB round-trip tests (9 tests) | 2026-04-27 |
| src/delivery.test.ts | Delivery race + system action dispatch tests (6 tests) | 2026-04-27 |
| src/claude-md-compose.test.ts | 10 compose coherence tests | 2026-04-27 |
| container/CLAUDE.md | Fork-owned base agent prompt (path-agnostic) | 2026-04-27 |
| src/container-runner.ts | Host-mode spawn: resolveBunPath, syncSkillSymlinks | 2026-04-27 |
| SOUL.md | Agent personality (wired via composition pipeline) | 2026-04-25 |

## Session Journal (last 5)

- [2026-04-27] [[2026-04-27-phase-10-host-mode-integration-tests-complete|Phase 10: Integration Tests Complete]] — 4 tasks, 26 new tests (358 total), spawn pipeline + session DB + delivery coverage
- [2026-04-27] [[2026-04-27-phase-9-prompt-reconciliation-complete|Phase 9: Prompt Reconciliation Complete]] — 5 tasks, memory conflict resolved, SOUL.md wired, 10 new tests, reviewer 8/10
- [2026-04-27] [[2026-04-27-phase-8-operational-deployment-complete|Phase 8: Operational Deployment Complete]] — 6 tasks, 5 host-mode bugs fixed, full pipeline validated, reviewer 6/10→fixed
- [2026-04-26] [[2026-04-26-phase-7-hardening-wiki-bridge-complete|Phase 7: Production Hardening + Wiki Bridge Complete]] — 5 tasks, wiki-bridge + wiki_search + smoke test, reviewer 7/10
- [2026-04-26] [[2026-04-26-phase-6b-research-loop-complete|Phase 6b: Research Loop + Episodic Integration Complete]] — 6 tasks, episodic wiki tier + research-loop skill + tools wiring fix, reviewer 8/10

## Cross-References

- docs/memory-architecture.md — Phase 1a research (memory design, retrieval strategy)
- docs/qwen-experiment-log.md — Phase 3a findings (capabilities, failure modes, prompt patterns, context budget)
- docs/tool-call-experiment-log.md — Phase 6a findings (Qwen tool-calling format, 12 experiments, behavioral analysis)
- docs/worker-e2e-results.json — Phase 3c/8 E2E results (10/10 pass, calibration baseline)
- agentic-engineering-wiki — context engineering, harness design, workflow patterns (184 articles)
- knowledge-wiki search.py — wiki_search integration point (BM25 + hybrid search)
