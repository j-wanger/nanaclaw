# Project: nanaclaw

> Last updated: 2026-04-26 by /dev-debrief

## Recommended Next Action

Phase 7 complete (5/5 tasks, reviewer 7/10). All original plan phases done. Run `/dev-plan` for next phase or next priority.

## Active Phase

**[[phase-07-hardening-wiki-bridge|Phase 7: Production Hardening + Wiki Bridge]]** (status: active)

Entry criteria: MET (Phase 6b complete ✓, knowledge-wiki repo available with search.py)
Exit criteria: 0/5 met

Progress: ~0% (planned, not started)

## Active Phase Contract

Phase: 7 - Production Hardening + Wiki Bridge
Tasks: 5 (3M + 2S, see tasks.md)
Transition: continue
Abort: if blocked >3 attempts, ask user: skip or abort

## Recent Decisions

| Decision | Confidence | Date |
|----------|------------|------|
| [[phase-7-hardening-wiki-bridge-approach]] | medium | 2026-04-26 |
| [[phase-6b-research-loop-approach]] | medium | 2026-04-26 |
| [[phase-6a-worker-tool-calling-approach]] | medium | 2026-04-26 |

## Blockers and Open Questions

- ~~[planning] Qwen3 tool-calling format reliability unknown — experiments will determine approach (raised 2026-04-26)~~ resolved: Phase 6a experiments passed, OpenAI function_call format works
- ~~[planning] dispatch_worker MCP tool handler does not wire `tools` field to contract — workers silently run single-shot (raised 2026-04-26, Task 1 of Phase 6b)~~ resolved: Phase 6b Task 1
- ~~[planning] wiki-bridge: search.py location discovery — WIKI_TOOLS_DIR env var or convention? (raised 2026-04-26)~~ resolved: WIKI_TOOLS_DIR env var, propagates via process.env spread in host-mode

## Key Artifacts

| Path | Purpose | Last Modified |
|------|---------|---------------|
| container/agent-runner/src/mcp-tools/local-worker/ | Dispatch module + agent loop + tool registry (14 source + 13 test) | 2026-04-26 |
| container/agent-runner/src/mcp-tools/web-search.ts | SearXNG web search MCP tool (1 source + 1 test) | 2026-04-26 |
| container/agent-runner/src/mcp-tools/web-extract.ts | Readability content extraction MCP tool (1 source + 1 test) | 2026-04-26 |
| container/agent-runner/src/mcp-tools/wiki-write.ts | Dynamic wiki routing + episodic tier MCP tool (1 source + 1 test) | 2026-04-26 |
| container/agent-runner/src/mcp-tools/wiki-search.ts | Wiki search MCP tool with search.py + keyword fallback (1 source + 1 test) | 2026-04-26 |
| src/modules/memory/ | Memory module + wiki bridge (7 source + 4 test files) | 2026-04-26 |
| scripts/smoke-test.ts | Automated spawn pipeline smoke test (4 steps) | 2026-04-26 |
| src/modules/voice/ | Voice module: STT + router hook (3 source + 2 test + 1 fixture) | 2026-04-26 |

## Session Journal (last 5)

- [2026-04-26] [[2026-04-26-phase-7-hardening-wiki-bridge-complete|Phase 7: Production Hardening + Wiki Bridge Complete]] — 5 tasks, wiki-bridge + wiki_search + smoke test, reviewer 7/10
- [2026-04-26] [[2026-04-26-phase-6b-research-loop-complete|Phase 6b: Research Loop + Episodic Integration Complete]] — 6 tasks, episodic wiki tier + research-loop skill + tools wiring fix, reviewer 8/10
- [2026-04-26] [[2026-04-26-phase-6a-worker-tool-calling-complete|Phase 6a: Worker Tool-Calling Runtime Complete]] — 9 tasks, 12 experiments (100%), agent loop + tool registry, reviewer 7/10
- [2026-04-26] [[2026-04-26-phase-5-web-search-complete|Phase 5: Web Search + Deep Research Complete]] — 5 tasks, 3 MCP tools + skill + pipeline test, reviewer 8/10
- [2026-04-26] [[2026-04-26-phase-4-voice-io-complete|Phase 4: Voice I/O Complete]] — 5 tasks, STT + TTS, whisper-server + edge-tts, reviewer 7/10

## Cross-References

- docs/memory-architecture.md — Phase 1a research (memory design, retrieval strategy)
- docs/qwen-experiment-log.md — Phase 3a findings (capabilities, failure modes, prompt patterns, context budget)
- docs/tool-call-experiment-log.md — Phase 6a findings (Qwen tool-calling format, 12 experiments, behavioral analysis)
- docs/worker-e2e-results.json — Phase 3c E2E results (10/10 pass, calibration baseline)
- agentic-engineering-wiki — context engineering, harness design, workflow patterns (184 articles)
- knowledge-wiki search.py — wiki_search integration point (BM25 + hybrid search)
