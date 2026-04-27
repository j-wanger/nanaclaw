---
title: "src/modules/permissions/"
aliases: []
category: modules
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: module
path: "src/modules/permissions/"
files: [src-modules-permissions-access, src-modules-permissions-channel-approval, src-modules-permissions-db-agent-group-members, src-modules-permissions-db-pending-channel-approvals, src-modules-permissions-db-pending-sender-approvals, src-modules-permissions-db-user-dms, src-modules-permissions-db-user-roles, src-modules-permissions-db-users, src-modules-permissions-index, src-modules-permissions-sender-approval, src-modules-permissions-user-dm]
external_deps: []
internal_deps: [src-db, src-channels, src-modules-approvals]
dependents: [src]
content_hash: "21c965471f7ee3ce"
---

# src/modules/permissions/

Access control module handling user resolution, role-based access gating, sender and channel approval flows, and cold DM resolution.

## Files

[[src-modules-permissions-access]], [[src-modules-permissions-index]], [[src-modules-permissions-channel-approval]], [[src-modules-permissions-sender-approval]], [[src-modules-permissions-user-dm]], [[src-modules-permissions-db-users]], [[src-modules-permissions-db-user-roles]], [[src-modules-permissions-db-agent-group-members]], [[src-modules-permissions-db-user-dms]], [[src-modules-permissions-db-pending-channel-approvals]], [[src-modules-permissions-db-pending-sender-approvals]]

## Key Patterns

- Hook registration into router: `setSenderResolver`, `setAccessGate`, `setSenderScopeGate`, `setChannelRequestGate`
- 6 dedicated DB files under `db/` subdirectory for permission entities

## Dependencies

**Internal:** [[src-db]], [[src-channels]], [[src-modules-approvals]]

**External:** None

## Dependents

[[src]] (via router hooks)
