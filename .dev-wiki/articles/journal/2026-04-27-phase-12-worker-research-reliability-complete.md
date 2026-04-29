---
title: "Phase 12: Worker Research Reliability Complete"
aliases: []
category: journal
tags: [local-worker, prompt-tuning, research-loop, debugging]
parents: [phase-12-worker-research-reliability]
created: 2026-04-27
updated: 2026-04-27
source: debrief
---

# Phase 12: Worker Research Reliability Complete

## What Happened
- Planned and implemented Phase 12 (5 tasks, 1M + 4S) to fix research workers burning all iterations without producing wiki output
- Three-track fix: tool trace persistence, configurable max_iterations, iteration-aware research prompt
- Moved ToolTraceEntry type to contract.ts (was duplicated in agent-loop.ts), added toolTrace field to TaskState with 20-entry/500-char cap
- Bumped max_iterations default from hardcoded 6 to configurable 10, matching Phase 6a experiment recommendations
- Added RESEARCH_TOOL_ROUTING decision-tree constant to prompt-builder for research tasks
- Live test revealed prompt routing insufficient — Qwen ignores soft instructions once context accumulates past ~30K tokens
- User proposed fundamental architecture change: orchestrator-driven single-shot pipeline instead of autonomous agent loop
- Reviewed Hermes LLM Wiki pattern (raw/ layer with sha256, provenance markers) and wiki-bootstrap research agent (coverage tracking, parallel subagents)
- Agreed on Phase 13: multi-stage research pipeline with Nana as orchestrator, Qwen workers doing focused single-shot tasks

## Problems Solved
- Tool traces were computed but silently discarded — now persisted in result JSON for debugging
- max_iterations hardcoded to 6 despite experiments recommending 10 — now configurable via dispatch_worker schema
- SKILL.md contradiction (research-loop said ≤6, local-worker said 10) — reconciled

## Open Questions
- llama-cpp multi-instance hosting: how to run multiple concurrent Qwen instances, or a secondary 8B model for parallelism
- Whether Qwen 3.6 can reliably handle search+write-raw as a combined task (vs pure single-shot)

## Health Delta
- +6 container tests (contract: 2 toolTrace, 1 max_iterations validation; prompt-builder: 3 routing). Total: 366 host + 227 container.

## Artifacts Changed
- `container/agent-runner/src/mcp-tools/local-worker/contract.ts` (ToolTraceEntry type, toolTrace in TaskState, max_iterations in TaskContract)
- `container/agent-runner/src/mcp-tools/local-worker/agent-loop.ts` (import ToolTraceEntry from contract.ts)
- `container/agent-runner/src/mcp-tools/local-worker/dispatch.ts` (write capped toolTrace, use contract.max_iterations ?? 10)
- `container/agent-runner/src/mcp-tools/local-worker/prompt-builder.ts` (RESEARCH_TOOL_ROUTING constant)
- `container/agent-runner/src/mcp-tools/local-worker/tools.ts` (trace in formatTaskSummary + checkWorkerResults)
- `container/agent-runner/src/mcp-tools/local-worker/index.ts` (max_iterations in dispatch_worker schema)
- `container/skills/research-loop/SKILL.md` (removed ≤6 limit, added max_iterations to template)
- `container/skills/local-worker/SKILL.md` (documented max_iterations + tool trace)

## Soft Observations / Phase N+1 Candidates
- Qwen ignores soft prompt instructions once context exceeds ~20K tokens | Phase 13: replace autonomous agent loop with orchestrator-driven single-shot pipeline | live test: 15 tool calls, 8 iterations, timeout before wiki_write
- Hermes raw/ layer pattern is production-proven for source material management | Phase 13: adopt raw/ directory with frontmatter (source_url, sha256) | Hermes SKILL.md llm-wiki
- llama-cpp single-instance bottleneck blocks parallel research | Phase 13 or 14: multi-instance hosting or secondary 8B model | user raised during planning discussion

### Review Gate
Score: 8/10, verdict: accept. Two MEDIUM pre-existing findings (duplicated routing/semaphore singletons across dispatch.ts and agent-loop.ts; `not-contains` postcondition type missing from MCP inputSchema enum). No Phase 12 regressions.

## Activation Quality
Active knowledge: 4 entries, 3 referenced (~75% approximate hit rate, literal match). Healthy activation.

## Related
- [[phase-12-worker-research-reliability|Phase 12: Worker Research Reliability]] — parent phase
