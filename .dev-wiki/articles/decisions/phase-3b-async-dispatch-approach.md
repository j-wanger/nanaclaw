---
title: "Phase 3b: Async Container-Side Dispatch"
aliases: [async-dispatch, container-side-dispatch, fire-and-forget-dispatch]
category: decisions
tags: [local-worker, dispatch, architecture]
parents: [phase-03b-dispatch-module]
created: 2026-04-26
updated: 2026-04-26
source: plan
confidence: high
---

## Context

Phase 3b needs a dispatch module for Claude → Qwen worker tasks. Two placement options: host-side module (message-based async via session DBs) or container-side MCP tool (direct from agent runner). User requires Claude to remain responsive during worker execution — dispatch must be non-blocking.

## Decision

Container-side MCP tools with async fire-and-forget pattern. `dispatch_worker` writes task file, kicks off detached Promise for llama-cpp fetch, returns immediately. Background execution writes results to file. Poll loop auto-picks up completed/failed results and injects into Claude's next turn (same pattern as deep-work continuation).

Chose over host-side module because: no DB round-trips, Claude calls directly, simpler to test, matches deep-work precedent. Host-side coordination (concurrency queue, priority) deferred to Phase 3c.

## Consequences

- Claude can dispatch workers and continue working / responding to user
- Multiple concurrent dispatches queue at llama-cpp server level (no app-level coordination)
- All dispatch logic in container/agent-runner — testable with bun:test
- Phase 3c must add host-side coordination for production use (concurrency limits, scheduling)
