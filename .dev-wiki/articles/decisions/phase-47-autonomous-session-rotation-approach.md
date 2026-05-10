---
title: "Phase 47: Autonomous Session Rotation Approach"
aliases: [end_session, session rotation, self-terminate]
category: decisions
tags: [session-management, compaction, autonomy]
parents: [phase-47-autonomous-session-rotation]
created: 2026-05-09
updated: 2026-05-09
source: plan
confidence: medium
---

## Context

Nana cannot self-rotate sessions when context fills up during autonomous work (deep work, curation). Automatic compaction is lossy, unpredictable, and breaks flow. The correct solution is deliberate session boundaries with handover state, but Nana has no way to end her own session and trigger a re-wake.

## Decision

**New end_session MCP tool + delivery action handler with resume_prompt:**

Container side:
- New MCP tool `end_session` in `session-end.ts` with params: `reason` (string), `resume_prompt` (optional string)
- Writes `{ action: 'end_session', reason, resume_prompt }` to outbound.db as system message
- Agent writes handover state to `.session-handover-state.md` BEFORE calling end_session

Host side:
- New delivery action handler registered via `registerDeliveryAction('end_session', handler)`
- Handler: (1) kills container via `killContainer(sessionId)`, (2) clears continuation in session_state, (3) if `resume_prompt` provided, writes it as a new inbound message to trigger immediate re-wake
- The host sweep's pending-message detection wakes the fresh container

Key behavior:
- Without resume_prompt: session ends, waits for next user message (manual rotation)
- With resume_prompt: session ends and immediately re-wakes with fresh context (autonomous rotation)
- Handover state persists in agent workspace (groups/<folder>/), read at session start via existing session-handover rules

**Follows the proven system action pattern:** same as schedule_task, install_packages, create_agent. MCP tool writes to outbound.db, host delivery handler processes it.

**Alternatives rejected:**
- Container-side process.exit(): fragile, system action might not flush to DB before exit
- PostCompact as substitute: compaction is lossy and unpredictable, doesn't solve the root cause
- Disable auto-compaction entirely: too risky without a self-rotation mechanism in place first

## Consequences

- Nana can autonomously rotate sessions during long work (curation, deep work)
- Handover state carries context across session boundaries (already designed by Nana)
- Auto-compaction becomes a safety net, not the primary context management strategy
- resume_prompt enables fully autonomous multi-session workflows without user intervention
