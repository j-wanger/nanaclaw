---
title: "src/db/agent-groups.ts"
aliases: []
category: files
tags: [typescript, database, agent]
parents: [src-db]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/db/agent-groups.ts"
content_hash: "39c280f02181b322"
exports: [createAgentGroup, getAgentGroup, getAgentGroupByFolder, getAllAgentGroups, updateAgentGroup, deleteAgentGroup]
imports: ["src/db/connection.ts"]
imported_by: ["src/router.ts", "src/delivery.ts", "src/host-sweep.ts", "src/container-runner.ts"]
data_reads: []
data_writes: []
---

# src/db/agent-groups.ts

CRUD operations for agent groups in the central database.

## Exports

- `createAgentGroup(group)` -- insert a new agent group
- `getAgentGroup(id)` -- fetch by ID
- `getAgentGroupByFolder(folder)` -- fetch by folder path
- `getAllAgentGroups()` -- list all agent groups
- `updateAgentGroup(id, updates)` -- partial update
- `deleteAgentGroup(id)` -- remove an agent group

## Dependencies

**Internal:** [[src-db-connection|connection.ts]] -- `getDb`

## Dependents

- [[src-router|router.ts]] -- resolves agent group during routing
- [[src-delivery|delivery.ts]] -- reads agent group for delivery context
- [[src-host-sweep|host-sweep.ts]] -- reads agent groups during sweep
- [[src-container-runner|container-runner.ts]] -- reads agent group config for container setup

## Key Logic

- Agent groups map to on-disk folders containing agent configuration.
- `getAgentGroupByFolder` enables lookup by filesystem path, used during container initialization.
