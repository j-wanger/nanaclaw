---
title: "src/modules/permissions/index.ts"
aliases: []
category: files
tags: [typescript, permissions, module-init]
parents: [src-modules-permissions]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/modules/permissions/index.ts"
content_hash: "eedb70eccfd59b61"
exports: []
imports: ["src/router.ts", "src/modules/permissions/access.ts", "src/modules/permissions/channel-approval.ts", "src/modules/permissions/sender-approval.ts", "src/modules/permissions/db/users.ts", "src/modules/permissions/db/user-roles.ts", "src/modules/permissions/db/user-dms.ts", "src/log.ts"]
imported_by: ["src/modules/index.ts"]
data_reads: []
data_writes: []
---

# src/modules/permissions/index.ts

Module entry point that registers permission hooks into the router pipeline. Side-effect module that wires up all permission gates at import time.

## Exports

None (side-effect registration only).

## Dependencies

**Internal:**
- [[src-router|router.ts]] -- `setSenderResolver`, `setAccessGate`, `setSenderScopeGate`, `setChannelRequestGate`
- [[src-modules-permissions-access|access.ts]] -- `canAccessAgentGroup`
- [[src-modules-permissions-channel-approval|channel-approval.ts]] -- channel registration approval
- [[src-modules-permissions-sender-approval|sender-approval.ts]] -- unknown sender approval
- `permissions/db/users`, `permissions/db/user-roles`, `permissions/db/user-dms` -- data layer
- [[src-log|log.ts]] -- structured logging

## Dependents

- [[src-modules-index|modules/index.ts]] -- imports for side-effect registration

## Key Logic

- Injects four gate functions into the router: sender resolver, access gate, sender scope gate, and channel request gate.
- Gate injection pattern decouples the permissions module from the core router.
