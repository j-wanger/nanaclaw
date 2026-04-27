# Project: nanaclaw

> Last updated: 2026-04-27 by /dev-debrief

## Recommended Next Action

Phase 11 complete (3 planned tasks + 2 live-discovered fixes). Run `/dev-plan` for Phase 12. Candidates below.

## Active Phase

**[[phase-11-host-mode-fragment-path-fix|Phase 11: Host-Mode Fragment Path Fix]]** (status: completed)

Entry criteria: MET (Phase 10 complete ✓, live testing revealed broken symlinks ✓)
Exit criteria: 5/5 met

Progress: 100% (3 tasks + 2 additional fixes, 5 commits)

## Active Phase Contract

Phase: 11 - Host-Mode Fragment Path Fix
Tasks: 3 (1M + 2S, see tasks.md)
Transition: continue
Abort: if blocked >3 attempts, ask user: skip or abort

## Recent Decisions

| Decision | Confidence | Date |
|----------|------------|------|
| [[phase-11-host-mode-fragment-path-fix]] | medium | 2026-04-27 |
| [[phase-10-host-mode-test-coverage-approach]] | medium | 2026-04-27 |
| [[phase-9-prompt-reconciliation-approach]] | medium | 2026-04-27 |

## Blockers and Open Questions

- ~~[planning] Qwen3 tool-calling format reliability unknown — experiments will determine approach (raised 2026-04-26)~~ resolved: Phase 6a experiments passed, OpenAI function_call format works
- ~~[planning] dispatch_worker MCP tool handler does not wire `tools` field to contract — workers silently run single-shot (raised 2026-04-26, Task 1 of Phase 6b)~~ resolved: Phase 6b Task 1
- ~~[planning] wiki-bridge: search.py location discovery — WIKI_TOOLS_DIR env var or convention? (raised 2026-04-26)~~ resolved: WIKI_TOOLS_DIR env var, propagates via process.env spread in host-mode
- ~~[planning] OneCLI CA cert availability in host-mode Bun process — proxy works but cert injection unknown (raised 2026-04-26)~~ resolved: OneCLI proxy works in host mode (agent received Claude API access)
- ~~[planning] SearXNG not yet installed — required for research loop E2E (raised 2026-04-26)~~ resolved: SearXNG installed via Docker on port 8888
- ~~[planning] Fragment symlinks point to Docker /app/... paths in host-mode — agent can't read skill/module instructions (raised 2026-04-27)~~ resolved: Phase 11 (5 fixes: symlink paths, bun path, idle worker check, env vars, fragment imports)

## Key Artifacts

| Path | Purpose | Last Modified |
|------|---------|---------------|
| src/claude-md-compose.ts | Composition pipeline — host-mode paths, fragment imports | 2026-04-27 |
| src/claude-md-compose.test.ts | 18 compose tests (host-mode resolution, readability, coherence) | 2026-04-27 |
| src/container-runner.ts | Host-mode spawn: bun path, env injection, symlinks | 2026-04-27 |
| container/agent-runner/src/index.ts | MCP server bun path resolution | 2026-04-27 |
| container/agent-runner/src/poll-loop.ts | Idle worker result check | 2026-04-27 |
| src/spawn-pipeline.test.ts | Spawn pipeline integration tests (14 tests) | 2026-04-27 |
| src/session-roundtrip.test.ts | Session DB round-trip tests (9 tests) | 2026-04-27 |

## Session Journal (last 5)

- [2026-04-27] [[2026-04-27-phase-11-host-mode-fragment-fix-complete|Phase 11: Fragment Path Fix Complete]] — 3 tasks + 2 live-discovered fixes, 5 commits, host-mode fully operational
- [2026-04-27] [[2026-04-27-phase-10-host-mode-integration-tests-complete|Phase 10: Integration Tests Complete]] — 4 tasks, 26 new tests (358 total), spawn pipeline + session DB + delivery coverage
- [2026-04-27] [[2026-04-27-phase-9-prompt-reconciliation-complete|Phase 9: Prompt Reconciliation Complete]] — 5 tasks, memory conflict resolved, SOUL.md wired, 10 new tests, reviewer 8/10
- [2026-04-27] [[2026-04-27-phase-8-operational-deployment-complete|Phase 8: Operational Deployment Complete]] — 6 tasks, 5 host-mode bugs fixed, full pipeline validated, reviewer 6/10→fixed
- [2026-04-26] [[2026-04-26-phase-7-hardening-wiki-bridge-complete|Phase 7: Production Hardening + Wiki Bridge Complete]] — 5 tasks, wiki-bridge + wiki_search + smoke test, reviewer 7/10

## Cross-References

- docs/memory-architecture.md — Phase 1a research (memory design, retrieval strategy)
- docs/qwen-experiment-log.md — Phase 3a findings (capabilities, failure modes, prompt patterns, context budget)
- docs/tool-call-experiment-log.md — Phase 6a findings (Qwen tool-calling format, 12 experiments, behavioral analysis)
- docs/worker-e2e-results.json — Phase 3c/8 E2E results (10/10 pass, calibration baseline)
- agentic-engineering-wiki — context engineering, harness design, workflow patterns (184 articles)
- knowledge-wiki search.py — wiki_search integration point (BM25 + hybrid search)
