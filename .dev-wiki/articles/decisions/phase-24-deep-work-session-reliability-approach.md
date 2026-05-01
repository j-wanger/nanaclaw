---
title: "Phase 24: Deep Work Session Reliability"
aliases: [deep-work-reliability, silent-session-fix]
category: decisions
tags: [poll-loop, deep-work, reliability, error-recovery]
parents: [phase-24-deep-work-session-reliability]
created: 2026-04-30
updated: 2026-04-30
source: plan
confidence: medium
---

## Context

Agent goes silent during deep work sessions after transient API errors or context compaction. Three bugs identified in `poll-loop.ts`:
1. Idle polling branch (line 81-114) never checks for active deep work — only checks worker results
2. Single error in deep work while loop (line 307-309) does `break`, permanently killing auto-continuation
3. When deadline expires, `checkDeepWorkContinuation()` returns null but no summary is sent and `deep_work.json` is orphaned

Observed in production: 2-hour research session with 1,340 articles, context compacted at 133K tokens, agent responded to check-in at 70 min remaining, then went silent until deadline passed.

## Decision

Three targeted fixes, keeping the existing while loop for fast turnaround and adding idle polling as a safety net:

**Fix 1: Idle deep work re-entry.** Add `checkDeepWorkContinuation()` to idle polling branch after the worker results check. When deep work is active, `lastRouting` is set, enter provider query. Safety net: if the while loop breaks for any reason, idle poller re-enters within 1 poll cycle.

**Fix 2: Retry with backoff.** Replace `catch { break }` in the deep work while loop with a consecutive error counter. On error: increment, backoff (3s × 2^failures, cap 30s), retry. After 3 consecutive failures: break, send notification to user. Reset on success. Idle check (fix 1) resumes on next cycle.

**Fix 3: Deadline expiry finalization.** New `finalizeExpiredDeepWork()` in `deep-work.ts`. Called when `checkDeepWorkContinuation()` returns null but state file exists. Reads state, formats summary (goal, completed/total steps, elapsed time), deletes file, returns summary text. Called in both idle branch and after the while loop. Summary written to `messages_out`.

**Alternative considered:** Remove the while loop entirely and rely solely on idle polling for deep work continuation. Rejected: adds 1s latency between every deep work turn, and the while loop is the happy-path driver — idle check is the safety net.

## Consequences

- Deep work auto-continuation survives transient API errors (up to 3 consecutive)
- If the while loop breaks, idle polling re-enters within 1 second
- Users always get a deadline-expired notification with a summary
- No orphaned `deep_work.json` files after deadline expiry
- Retry logic could burn API tokens on persistent errors — mitigated by 3-retry cap
- No concurrency risk: JS single-threaded, idle and while loop are mutually exclusive
