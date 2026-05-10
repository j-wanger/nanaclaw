# Active Phase Context

Phase: 47 -- Autonomous Session Rotation
Objective: Add end_session MCP tool so agent can self-terminate, clear continuation, and re-wake with fresh context via resume_prompt.
Status: Active. 0/3 tasks done.
Scope: container/agent-runner/src/mcp-tools/session-end.ts, src/modules/session-rotation/index.ts
Key constraints: Container clears own session_state (single-writer invariant). Host never writes outbound.db. processAfter uses ISO datetime string. killContainer takes (sessionId, reason).
Exit criteria: end_session callable, continuation cleared, container killed, resume_prompt re-wakes, tests passing.
Next: Task 1 -- end_session MCP tool.
