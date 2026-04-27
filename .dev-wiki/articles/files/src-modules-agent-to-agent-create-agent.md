---
title: "src/modules/agent-to-agent/create-agent.ts"
aliases: []
category: files
tags: [typescript, agent-to-agent, dynamic]
parents: [src-modules-agent-to-agent]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/modules/agent-to-agent/create-agent.ts"
content_hash: "66108bb8d68c621a"
exports: [handleCreateAgent]
imports: ["src/db/agent-groups.ts", "src/group-init.ts", "src/log.ts"]
imported_by: ["src/modules/agent-to-agent/index.ts"]
data_reads: []
data_writes: []
---

# src/modules/agent-to-agent/create-agent.ts

Handles dynamic agent group creation when a running container requests a new agent to be spawned.

## Exports

- `handleCreateAgent(payload)` -- creates a new agent group from a container request

## Dependencies

**Internal:**
- [[src-db-agent-groups|agent-groups.ts]] -- persists the new agent group
- [[src-group-init|group-init.ts]] -- initializes the agent group folder and config
- [[src-log|log.ts]] -- structured logging

## Dependents

- [[src-modules-agent-to-agent-index|agent-to-agent/index.ts]] -- registers handler

## Key Logic

- Creates the agent group record in the central DB and initializes the on-disk folder via `group-init`.
- Enables agents to dynamically spawn child agents for delegation patterns.
