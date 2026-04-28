# Project: nanaclaw

> Last updated: 2026-04-28 by /dev-plan

## Recommended Next Action

Run Phase 15 Task 6 (live test) — restart nanoclaw, send research request via Telegram, verify iterative pipeline end-to-end.

## Active Phase

**[[phase-15-iterative-research-pipeline|Phase 15: Iterative Research Pipeline]]** (status: active)

Entry criteria: MET (Phase 14 partial — research skill exists ✓, old skills deleted ✓, model wired to Opus ✓)
Exit criteria: 0/6 met

Progress: ~85% (6/7 tasks done, 1 remaining: live test via Telegram)

## Active Phase Contract

Phase: 15 - Iterative Research Pipeline
Tasks: 7 (2L + 2M + 2S + 1M-live, see tasks.md)
Transition: new-session
Abort: if blocked >3 attempts, ask user: skip or abort

## Recent Decisions

| Decision | Confidence | Date |
|----------|------------|------|
| [[phase-15-iterative-research-pipeline]] | high | 2026-04-28 |
| [[phase-14-unified-research-skill]] | high | 2026-04-27 |
| [[phase-13-multi-stage-research-pipeline]] | medium | 2026-04-27 |

## Blockers and Open Questions

- ~~[planning] Qwen3 tool-calling format reliability unknown — experiments will determine approach (raised 2026-04-26)~~ resolved: Phase 6a experiments passed, OpenAI function_call format works
- ~~[planning] dispatch_worker MCP tool handler does not wire `tools` field to contract — workers silently run single-shot (raised 2026-04-26, Task 1 of Phase 6b)~~ resolved: Phase 6b Task 1
- ~~[planning] wiki-bridge: search.py location discovery — WIKI_TOOLS_DIR env var or convention? (raised 2026-04-26)~~ resolved: WIKI_TOOLS_DIR env var, propagates via process.env spread in host-mode
- ~~[planning] OneCLI CA cert availability in host-mode Bun process — proxy works but cert injection unknown (raised 2026-04-26)~~ resolved: OneCLI proxy works in host mode (agent received Claude API access)
- ~~[planning] SearXNG not yet installed — required for research loop E2E (raised 2026-04-26)~~ resolved: SearXNG installed via Docker on port 8888
- ~~[planning] Fragment symlinks point to Docker /app/... paths in host-mode — agent can't read skill/module instructions (raised 2026-04-27)~~ resolved: Phase 11 (5 fixes: symlink paths, bun path, idle worker check, env vars, fragment imports)
- ~~[planning] llama-cpp multi-instance hosting — `--parallel N` flag or secondary 8B model for concurrent research workers (raised 2026-04-27)~~ resolved: Phase 13 — server already has 4 slots, max_concurrent updated to 4
- [implementation] Worker step-repetition: Qwen workers consistently fail to transition from search/extract to wiki_write within timeout (raised 2026-04-27, Phase 13 live test)
- [implementation] checkWorkerResults poll-loop pickup: result files not cleaned up after worker completion (raised 2026-04-27, Phase 13 live test)

## Key Artifacts

| Path | Purpose | Last Modified |
|------|---------|---------------|
| container/agent-runner/src/mcp-tools/wiki-write.ts | wiki_write with raw tier, sha256, source_url | 2026-04-27 |
| container/skills/research-loop/SKILL.md | 5-stage orchestrated research pipeline | 2026-04-27 |
| container/skills/research-loop/search-extract-prompt.md | Stage 2 worker dispatch template (8K budget) | 2026-04-27 |
| container/skills/research-loop/summarize-prompt.md | Stage 3 summarize template (6K budget) | 2026-04-27 |
| container/skills/research-loop/review-prompt.md | Stage 4 scored review template (4K budget) | 2026-04-27 |
| groups/*/models.json | max_concurrent: 4 (parallel inference) | 2026-04-27 |

## Session Journal (last 5)

- [2026-04-27] [[2026-04-27-phase-13-multi-stage-research-pipeline-complete|Phase 13: Multi-Stage Research Pipeline Complete]] — 6 tasks, raw tier + prompt templates + 5-stage pipeline, live test: 6 raw articles with sha256
- [2026-04-27] [[2026-04-27-phase-12-worker-research-reliability-complete|Phase 12: Worker Research Reliability Complete]] — 5 tasks, toolTrace + max_iterations + prompt routing, live test revealed need for pipeline redesign
- [2026-04-27] [[2026-04-27-phase-11-host-mode-fragment-fix-complete|Phase 11: Fragment Path Fix Complete]] — 3 tasks + 2 live-discovered fixes, 5 commits, host-mode fully operational
- [2026-04-27] [[2026-04-27-phase-10-host-mode-integration-tests-complete|Phase 10: Integration Tests Complete]] — 4 tasks, 26 new tests (358 total), spawn pipeline + session DB + delivery coverage
- [2026-04-27] [[2026-04-27-phase-9-prompt-reconciliation-complete|Phase 9: Prompt Reconciliation Complete]] — 5 tasks, memory conflict resolved, SOUL.md wired, 10 new tests, reviewer 8/10

## Cross-References

- docs/memory-architecture.md — Phase 1a research (memory design, retrieval strategy)
- docs/qwen-experiment-log.md — Phase 3a findings (capabilities, failure modes, prompt patterns, context budget)
- docs/tool-call-experiment-log.md — Phase 6a findings (Qwen tool-calling format, 12 experiments, behavioral analysis)
- docs/worker-e2e-results.json — Phase 3c/8 E2E results (10/10 pass, calibration baseline)
- agentic-engineering-wiki — context engineering, harness design, workflow patterns (184+ articles)
- Hermes LLM Wiki skill — raw/ layer architecture, sha256 provenance, three-layer wiki pattern
- agentic-engineering-wiki/raw/articles/ — 6 SearXNG raw sources from Phase 13 live test
