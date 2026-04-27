---
title: "src/modules/approvals/onecli-approvals.ts"
aliases: []
category: files
tags: [typescript, approvals, onecli, integration]
parents: [src-modules-approvals]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/modules/approvals/onecli-approvals.ts"
content_hash: "88c24e40506fb390"
exports: [initOnecliApprovals]
imports: ["@onecli-sh/sdk", "src/modules/approvals/primitive.ts", "src/delivery.ts", "src/log.ts"]
imported_by: ["src/modules/approvals/index.ts"]
data_reads: []
data_writes: []
---

# src/modules/approvals/onecli-approvals.ts

Bridge between the OneCLI SDK credentialed-action system and the internal approval primitives. Configures OneCLI's manual approval callback to route through the app's approval workflow.

## Exports

- `initOnecliApprovals()` -- configures the OneCLI SDK manual approval callback

## Dependencies

**External:** `@onecli-sh/sdk` -- OneCLI SDK for credentialed actions
**Internal:**
- [[src-modules-approvals-primitive|primitive.ts]] -- `requestApproval`
- [[src-delivery|delivery.ts]] -- message delivery
- [[src-log|log.ts]] -- structured logging

## Dependents

- [[src-modules-approvals-index|approvals/index.ts]] -- calls `initOnecliApprovals` at module init

## Key Logic

- Hooks into OneCLI SDK's manual approval flow so credentialed actions (e.g., tool use requiring human confirmation) go through the same approval card system.
- Bridges external SDK callbacks into the internal approval primitive.
