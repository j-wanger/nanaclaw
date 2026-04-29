---
title: "Phase 16: Research Session Reliability"
aliases: []
category: phases
tags: [research, deep-work, context-management, communication]
parents: []
created: 2026-04-29
updated: 2026-04-29
source: plan
status: active
scope: ["container/agent-runner/src/mcp-tools/research-fetch.ts", "container/agent-runner/src/mcp-tools/research-summarize.ts", "container/agent-runner/src/mcp-tools/research-review.ts", "container/agent-runner/src/mcp-tools/local-worker/contract.ts", "container/agent-runner/src/mcp-tools/local-worker/dispatch.ts", "container/skills/research/*"]
entry_criteria: "Phase 15 complete, live test revealed session reliability issues"
exit_criteria: "research_fetch per-call output under 2KB for 20 results, review stage matches episodic→raw via source_url, research SKILL.md and instructions.md contain send_message progress guidance, deep work awareness in research skill, all existing tests pass"
---

# Phase 16: Research Session Reliability

## Objective

Fix reliability issues observed during 6-hour deep work research sessions: early termination, missing progress updates, excessive context compaction, and review stage matching bug.

## Scope

Files and modules affected:
- `container/agent-runner/src/mcp-tools/research-fetch.ts`
- `container/agent-runner/src/mcp-tools/research-summarize.ts`
- `container/agent-runner/src/mcp-tools/research-review.ts`
- `container/skills/research/*`
- `container/skills/deep-work/*`
- `container/agent-runner/src/poll-loop.ts`

## Exit Criteria

- [ ] research_fetch per-call output under 2KB for 20 results
- [ ] review stage matches episodic→raw via source_url in test
- [ ] research SKILL.md and instructions.md contain send_message progress guidance
- [ ] deep work + research sessions guided to run to deadline
- [ ] all existing tests pass (no regressions)

## Notes

Live test: 6-hour deep work session stopped at ~2 hours, 3 context compactions, no progress updates via channel, 965 worker dispatches all failed (expected — model server was down), review stage inert (findRawSource bug from Phase 15).
