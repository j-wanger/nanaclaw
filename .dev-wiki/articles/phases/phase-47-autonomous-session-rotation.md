---
title: "Phase 47: Autonomous Session Rotation"
aliases: [end_session, session rotation]
category: phases
tags: [session-management, compaction, autonomy]
parents: []
created: 2026-05-09
updated: 2026-05-09
source: plan
status: active
scope: ["container/agent-runner/src/mcp-tools/session-end.ts", "container/agent-runner/src/mcp-tools/index.ts", "src/modules/session-rotation/index.ts", "src/modules/index.ts"]
entry_criteria: "Phase 45 complete, session handover format designed by Nana"
exit_criteria: "end_session MCP tool callable; container clears continuation; host kills container; resume_prompt triggers re-wake; tests passing"
---

# Phase 47: Autonomous Session Rotation

## Objective

Add end_session MCP tool so agent can self-terminate session when context is full, clear continuation for fresh context window, and optionally trigger immediate re-wake via resume_prompt for autonomous multi-session workflows.

## Scope

- `container/agent-runner/src/mcp-tools/session-end.ts` (new)
- `src/modules/session-rotation/index.ts` (new)
- Barrel imports in both index.ts files

## Exit Criteria

- [ ] end_session MCP tool registered and callable
- [ ] Container clears all session_state rows before writing system action
- [ ] Host delivery handler kills container via killContainer
- [ ] resume_prompt writes inbound message with 5s processAfter delay for re-wake
- [ ] All tests passing
