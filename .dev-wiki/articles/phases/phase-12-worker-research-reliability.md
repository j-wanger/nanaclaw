---
title: "Phase 12: Worker Research Reliability"
aliases: [phase-12, worker-research-reliability]
category: phases
tags: [local-worker, prompt-tuning, research-loop, debugging]
parents: [phase-11-host-mode-fragment-path-fix]
created: 2026-04-27
updated: 2026-04-27
source: plan
status: completed
scope: ["container/agent-runner/src/mcp-tools/local-worker/dispatch.ts", "container/agent-runner/src/mcp-tools/local-worker/prompt-builder.ts", "container/agent-runner/src/mcp-tools/local-worker/contract.ts", "container/agent-runner/src/mcp-tools/local-worker/tools.ts", "container/agent-runner/src/mcp-tools/local-worker/index.ts", "container/skills/local-worker/SKILL.md", "container/skills/research-loop/SKILL.md"]
entry_criteria: "Phase 11 complete, research loop workers producing no wiki output"
exit_criteria: "Tool traces in result JSON, max_iterations configurable via dispatch_worker, research prompt includes iteration budget guidance, SKILL.md consistent, all tests pass"
---

# Phase 12: Worker Research Reliability

## Objective

Fix research loop workers that burn all iterations without producing wiki output. Three-track fix: observability (tool trace persistence), prompt tuning (iteration-aware guidance), and iteration budget (configurable max_iterations).

## Scope

- `container/agent-runner/src/mcp-tools/local-worker/contract.ts` — TaskState toolTrace field, max_iterations contract field
- `container/agent-runner/src/mcp-tools/local-worker/dispatch.ts` — write tool trace, use contract max_iterations
- `container/agent-runner/src/mcp-tools/local-worker/prompt-builder.ts` — iteration-aware system prompt
- `container/agent-runner/src/mcp-tools/local-worker/tools.ts` — formatTaskSummary with trace
- `container/agent-runner/src/mcp-tools/local-worker/index.ts` — dispatch_worker schema
- `container/skills/local-worker/SKILL.md` — iteration guidance
- `container/skills/research-loop/SKILL.md` — iteration limit reconciliation

## Exit Criteria

- [x] Tool traces persisted in result JSON (TaskState includes toolTrace)
- [x] max_iterations configurable via dispatch_worker MCP tool (optional, default 10)
- [x] Research worker system prompt includes iteration budget guidance
- [x] SKILL.md files consistent on iteration limits
- [x] All tests pass, build clean
