---
title: "src/modules/agent-to-agent/agent-route.ts"
aliases: []
category: files
tags: [typescript, agent-to-agent, routing]
parents: [src-modules-agent-to-agent]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/modules/agent-to-agent/agent-route.ts"
content_hash: "0fe6b329bb2bc490"
exports: [handleAgentRoute]
imports: ["src/db/agent-groups.ts", "src/session-manager.ts", "src/container-runner.ts", "src/log.ts"]
imported_by: ["src/modules/agent-to-agent/index.ts"]
data_reads: []
data_writes: []
---

# src/modules/agent-to-agent/agent-route.ts

Routes messages between agents when delivery targets the special `agent` channel type. Enables inter-agent communication without going through an external channel.

## Exports

- `handleAgentRoute(payload)` -- routes a message from one agent to another

## Dependencies

**Internal:**
- [[src-db-agent-groups|agent-groups.ts]] -- resolves target agent group
- [[src-session-manager|session-manager.ts]] -- writes message to target session
- [[src-container-runner|container-runner.ts]] -- wakes target container
- [[src-log|log.ts]] -- structured logging

## Dependents

- [[src-modules-agent-to-agent-index|agent-to-agent/index.ts]] -- registers handler

## Key Logic

- Resolves the target agent group, finds or creates a session, writes the message to the target's inbound DB, and wakes the container.
- Reuses the same session-manager and container-runner infrastructure as external channel delivery.
