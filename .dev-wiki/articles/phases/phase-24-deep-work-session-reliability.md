---
title: "Phase 24: Deep Work Session Reliability"
aliases: [deep-work-reliability, silent-session-fix]
category: phases
tags: [poll-loop, deep-work, reliability, error-recovery]
parents: []
created: 2026-04-30
updated: 2026-04-30
source: plan
status: completed
scope: ["container/agent-runner/src/poll-loop.ts", "container/agent-runner/src/mcp-tools/deep-work.ts"]
entry_criteria: "Phase 23 complete (claim backfill E2E)"
exit_criteria: "Deep work auto-continuation survives transient API errors, idle polling re-enters deep work after while loop breaks, deadline expiry sends summary + cleans up, new tests pass, build + typecheck pass"
---

# Phase 24: Deep Work Session Reliability

## Objective

Fix three bugs causing the agent to go silent during deep work sessions: no deep work check in idle polling, single-error loop kill, and missing deadline expiry notification.

## Scope

- `container/agent-runner/src/poll-loop.ts` — idle branch deep work check, retry with backoff, deadline finalization
- `container/agent-runner/src/mcp-tools/deep-work.ts` — `finalizeExpiredDeepWork()`, `calculateBackoffDelay()`

## Exit Criteria

- [x] Deep work auto-continuation survives transient API errors (retry with backoff, 3 attempts)
- [x] Idle polling re-enters deep work after while loop breaks
- [x] Deadline expiry sends summary message to user and cleans up deep_work.json
- [x] New tests cover finalizeExpiredDeepWork and calculateBackoffDelay
- [x] Build + typecheck + all tests pass

## Notes

- Observed in production: 2-hour research session, 1,340 articles, context compacted at 133K tokens, agent went silent after responding to check-in at 70 min remaining
- Root cause: API error after compaction broke the while loop (catch/break), idle poller had no deep work check, deadline expiry was unhandled
- Wiki patterns applied: error-recovery-and-retry (3 retries, exponential backoff), fail-open-vs-fail-stop (deterministic validators at boundaries), orchestrator-failure-modes (termination unawareness, circuit breakers)
