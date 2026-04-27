---
title: "src/db/schema.ts"
aliases: []
category: files
tags: [typescript, database, schema]
parents: [src-db]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/db/schema.ts"
content_hash: "e50251efea836b1e"
exports: [SCHEMA, INBOUND_SCHEMA, OUTBOUND_SCHEMA]
imports: []
imported_by: ["src/db/session-db.ts"]
data_reads: []
data_writes: []
---

# src/db/schema.ts

Reference copy of the current v2 database schema. Defines table structures for both the central database and per-session databases.

## Exports

- `SCHEMA` -- central DB table definitions (agent_groups, messaging_groups, messaging_group_agents, users, user_roles, agent_group_members, user_dms, sessions, pending_questions, pending_sender_approvals)
- `INBOUND_SCHEMA` -- session inbound DB table definitions
- `OUTBOUND_SCHEMA` -- session outbound DB table definitions

## Dependencies

None.

## Dependents

- [[src-db-session-db|session-db.ts]] -- uses `INBOUND_SCHEMA` and `OUTBOUND_SCHEMA` for session DB initialization

## Key Logic

- Central DB schema covers identity (users, roles), grouping (agent_groups, messaging_groups), sessions, and pending approval workflows.
- Session DBs are split into inbound (messages_in) and outbound (messages_out, delivered) for per-session message isolation.
