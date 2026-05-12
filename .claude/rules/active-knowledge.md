# Active Knowledge
## Phase: 47 - Autonomous Session Rotation (Complete)

### Session Rotation Pattern
from: [[phase-47-autonomous-session-rotation-approach]]
retrieved: 2026-05-09

- end_session MCP tool writes system action to outbound.db, host delivery handler processes it
- Container clears own session_state (single-writer invariant) before writing the action
- resume_prompt triggers immediate re-wake: host injects it as inbound message with processAfter +5s
- Without resume_prompt: session ends, waits for next user message (manual rotation)
- Follows proven system action pattern: same as schedule_task, install_packages, create_agent

### Key Files
from: implementation
retrieved: 2026-05-09

- container/agent-runner/src/mcp-tools/session-end.ts — end_session MCP tool
- src/modules/session-rotation/index.ts — host delivery action handler
- src/delivery.ts — getDeliveryAction() export added for test access
