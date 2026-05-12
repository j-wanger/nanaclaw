---
title: "Phase 47: Autonomous Session Rotation Complete"
aliases: [phase-47-complete, end-session-tool]
category: journal
tags: [session-management, mcp-tools, delivery-actions]
parents: [phase-47-autonomous-session-rotation]
created: 2026-05-09
---

## Summary

Phase 47 delivered the `end_session` MCP tool and host delivery handler, enabling agents to self-terminate sessions and optionally re-wake with fresh context via `resume_prompt`. Three tasks completed: container-side MCP tool, host delivery action handler, and build verification.

## Tasks Completed

1. **end_session MCP tool** (container-side) — `session-end.ts`: clears all `session_state` rows, writes system action message to `outbound.db` with `action='end_session'`, `reason`, and optional `resume_prompt`. Registered in MCP tools barrel.
2. **Host delivery handler** — `src/modules/session-rotation/index.ts`: registered via `registerDeliveryAction('end_session', handler)`. Handler kills container via `killContainer(sessionId, reason)`, then if `resume_prompt` provided, writes it as inbound message with `processAfter` set to ISO datetime +5s. Registered in modules barrel.
3. **Build verification** — 382 host tests + 383 container MCP tools tests passing. Both typechecks clean.

## Key Artifacts

| Path | Purpose |
|------|---------|
| container/agent-runner/src/mcp-tools/session-end.ts | end_session MCP tool — self-terminate + handover |
| container/agent-runner/src/mcp-tools/session-end.test.ts | Container-side tests |
| src/modules/session-rotation/index.ts | Host delivery action handler |
| src/modules/session-rotation/index.test.ts | Host-side tests |
| src/delivery.ts | Added getDeliveryAction() export for test access |

## Decisions

- [[phase-47-autonomous-session-rotation-approach]] — confidence raised to high. end_session MCP tool + delivery handler with resume_prompt re-wake. Container clears own session_state (single-writer invariant).

## Architectural Impact

- New system action pattern: `end_session` joins `schedule_task`, `install_packages`, `create_agent` as delivery-handled actions
- `getDeliveryAction()` exported from `src/delivery.ts` for test access to action registry
- Session rotation is now agent-initiated rather than operator-dependent

## Observations

- Nana's 10GB context was likely the JSONL transcript, not token count — 255 conversation archives at ~1.2MB each in workspace. Long curation sessions with hundreds of tool calls accumulate massive transcripts.

## Test Health

- Host: 382 tests (was ~377)
- Container mcp-tools: 383 tests
- Both typechecks: clean
