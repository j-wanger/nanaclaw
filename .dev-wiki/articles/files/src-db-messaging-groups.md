---
title: "src/db/messaging-groups.ts"
aliases: []
category: files
tags: [typescript, database, messaging]
parents: [src-db]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/db/messaging-groups.ts"
content_hash: "74360115f387e221"
exports: [createMessagingGroup, getMessagingGroup, getMessagingGroupByPlatform, getAllMessagingGroups, getMessagingGroupsByChannel, getMessagingGroupWithAgentCount, updateMessagingGroup, deleteMessagingGroup, createMessagingGroupAgent, getMessagingGroupAgents, getMessagingGroupAgent, getMessagingGroupAgentByPair, updateMessagingGroupAgent, deleteMessagingGroupAgent]
imports: ["src/db/connection.ts"]
imported_by: ["src/router.ts", "src/delivery.ts", "src/session-manager.ts"]
data_reads: []
data_writes: []
---

# src/db/messaging-groups.ts

CRUD operations for messaging groups and their agent wiring in the central database. Messaging groups represent channel-side conversation contexts (e.g., a Slack channel, a Telegram chat).

## Exports

**Messaging groups:** `createMessagingGroup`, `getMessagingGroup`, `getMessagingGroupByPlatform`, `getAllMessagingGroups`, `getMessagingGroupsByChannel`, `getMessagingGroupWithAgentCount`, `updateMessagingGroup`, `deleteMessagingGroup`

**Agent wiring:** `createMessagingGroupAgent`, `getMessagingGroupAgents`, `getMessagingGroupAgent`, `getMessagingGroupAgentByPair`, `updateMessagingGroupAgent`, `deleteMessagingGroupAgent`

## Dependencies

**Internal:** [[src-db-connection|connection.ts]] -- `getDb`

## Dependents

- [[src-router|router.ts]], [[src-delivery|delivery.ts]], [[src-session-manager|session-manager.ts]]

## Key Logic

- Messaging groups link a platform channel to one or more agent groups via the `messaging_group_agents` join table.
- `getMessagingGroupByPlatform` resolves which group a channel event belongs to.
- Agent wiring controls which agents participate in which messaging groups.
