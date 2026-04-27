---
title: "src/modules/permissions/access.ts"
aliases: []
category: files
tags: [typescript, permissions, access-control]
parents: [src-modules-permissions]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/modules/permissions/access.ts"
content_hash: "f96483b31350857e"
exports: [canAccessAgentGroup, AccessDecision]
imports: ["src/modules/permissions/db/agent-group-members.ts", "src/modules/permissions/db/user-roles.ts", "src/modules/permissions/db/users.ts"]
imported_by: ["src/modules/permissions/index.ts"]
data_reads: []
data_writes: []
---

# src/modules/permissions/access.ts

Core access control logic: determines whether a user can access an agent group based on role hierarchy.

## Exports

- `canAccessAgentGroup(userId, groupId)` -- evaluates access with priority: owner > global_admin > admin_of_group > member
- `AccessDecision` -- type describing the access result (allowed/denied + reason)

## Dependencies

**Internal:**
- `permissions/db/agent-group-members` -- group membership lookups
- `permissions/db/user-roles` -- role lookups
- `permissions/db/users` -- user identity lookups

## Dependents

- [[src-modules-permissions-index|permissions/index.ts]] -- wired into router access gate

## Key Logic

- Role hierarchy: owner > global_admin > admin_of_group > member.
- Returns an `AccessDecision` with allow/deny and the reason, enabling the caller to log or surface the denial reason.
- Owner of the agent group always has access regardless of other roles.
