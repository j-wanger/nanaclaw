# Project: nanaclaw

> Last updated: 2026-04-29 by /dev-debrief

## Recommended Next Action

Phase 16 complete (6/6 tasks, all exit criteria met). Run `/dev-plan` to plan Phase 17. Consider: scheduled research automation, conversation quality, or new capability. Also: Nana is working on batch-summarizing ~5,800 orphaned raw articles — check progress.

## Active Phase

**[[phase-16-research-session-reliability|Phase 16: Research Session Reliability]]** (status: active)

Exit criteria: 0/5 met
Progress: ~0% (0/6 tasks done)

## Active Phase Contract

Phase: 16 - Research Session Reliability
Tasks: 6 (see tasks.md)
Transition: continue
Abort: if blocked >3 attempts, ask user: skip or abort

## Recent Decisions

| Decision | Confidence | Date |
|----------|------------|------|
| [[phase-16-research-session-reliability]] | medium | 2026-04-29 |
| [[phase-15-iterative-research-pipeline]] | high | 2026-04-28 |
| [[phase-14-unified-research-skill]] | high | 2026-04-27 |

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
| container/agent-runner/src/mcp-tools/research-fetch.ts | Scriptable search+extract, compact output | 2026-04-29 |
| container/agent-runner/src/mcp-tools/research-summarize.ts | Single-shot summarize with source_url propagation | 2026-04-29 |
| container/agent-runner/src/mcp-tools/research-review.ts | Single-shot review, compact output | 2026-04-29 |
| container/agent-runner/src/mcp-tools/local-worker/dispatch.ts | write_to post-processing with source_url | 2026-04-29 |
| container/skills/research/SKILL.md | Iterative pipeline + progress updates + deep work awareness | 2026-04-29 |
| src/channels/telegram-2.ts | Second Telegram bot adapter (Bob) | 2026-04-29 |
| groups/dm-with-bob/ | Bob agent group (critical thinker personality) | 2026-04-29 |
| groups/*/models.json | max_concurrent: 2 (parallel inference) | 2026-04-29 |

## Session Journal (last 5)

- [2026-04-29] [[2026-04-29-phase-16-research-session-reliability-complete|Phase 16: Research Session Reliability Complete]] — 6 tasks, compact outputs + source_url fix + skill communication, Bob agent + llama-server setup
- [2026-04-28] [[2026-04-28-phase-15-iterative-research-pipeline-complete|Phase 15: Iterative Research Pipeline Complete]] — 8 tasks, research_fetch + url-index + write_to + iterative skill, reviewer 7/10 (review stage matching bug)
- [2026-04-27] [[2026-04-27-phase-13-multi-stage-research-pipeline-complete|Phase 13: Multi-Stage Research Pipeline Complete]] — 6 tasks, raw tier + prompt templates + 5-stage pipeline, live test: 6 raw articles with sha256
- [2026-04-27] [[2026-04-27-phase-12-worker-research-reliability-complete|Phase 12: Worker Research Reliability Complete]] — 5 tasks, toolTrace + max_iterations + prompt routing, live test revealed need for pipeline redesign
- [2026-04-27] [[2026-04-27-phase-11-host-mode-fragment-fix-complete|Phase 11: Fragment Path Fix Complete]] — 3 tasks + 2 live-discovered fixes, 5 commits, host-mode fully operational

## Cross-References

- docs/memory-architecture.md — Phase 1a research (memory design, retrieval strategy)
- docs/qwen-experiment-log.md — Phase 3a findings (capabilities, failure modes, prompt patterns, context budget)
- docs/tool-call-experiment-log.md — Phase 6a findings (Qwen tool-calling format, 12 experiments, behavioral analysis)
- docs/worker-e2e-results.json — Phase 3c/8 E2E results (10/10 pass, calibration baseline)
- agentic-engineering-wiki — context engineering, harness design, workflow patterns (184+ articles)
- Hermes LLM Wiki skill — raw/ layer architecture, sha256 provenance, three-layer wiki pattern
- trading-wiki (3,017 raw), aml-wiki (2,870 raw, 97 episodic, 279 articles) — live research output
