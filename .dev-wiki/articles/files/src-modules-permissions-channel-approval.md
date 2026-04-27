---
title: "src/modules/permissions/channel-approval.ts"
aliases: []
category: files
tags: [typescript, permissions, approval]
parents: [src-modules-permissions]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/modules/permissions/channel-approval.ts"
content_hash: "2243292b8d634258"
exports: [handleChannelRegistrationRequest]
imports: ["src/modules/approvals/primitive.ts", "src/db/messaging-groups.ts", "src/channels/channel-registry.ts", "src/log.ts"]
imported_by: ["src/modules/permissions/index.ts"]
data_reads: []
data_writes: []
---

# src/modules/permissions/channel-approval.ts

Handles approval workflow for new channel registrations. When a new messaging group is discovered on a channel, this module builds an approval card and routes it to the appropriate approver.

## Exports

- `handleChannelRegistrationRequest(event)` -- initiates approval flow for a new channel registration

## Dependencies

**Internal:**
- [[src-modules-approvals-primitive|approvals/primitive.ts]] -- `requestApproval`, `pickApprover`
- [[src-db-messaging-groups|messaging-groups.ts]] -- messaging group lookups
- [[src-channels-channel-registry|channel-registry.ts]] -- channel adapter lookups
- [[src-log|log.ts]] -- structured logging

## Dependents

- [[src-modules-permissions-index|permissions/index.ts]] -- wired into channel request gate

## Key Logic

- Builds an approval card with channel details for the approver to review.
- Delegates approver selection and delivery to the approvals primitive module.
- On approval, the messaging group is created; on denial, the request is dropped.
