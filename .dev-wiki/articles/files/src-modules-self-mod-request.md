---
title: "src/modules/self-mod/request.ts"
aliases: []
category: files
tags: [typescript]
parents: [src-modules-self-mod]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/modules/self-mod/request.ts"
content_hash: "0c9e99025b698883"
exports: [handleSelfModRequest]
imports: ["src/modules/approvals/primitive.ts", "src/log.ts"]
imported_by: ["src/modules/self-mod/index.ts"]
data_reads: []
data_writes: []
---

# src/modules/self-mod/request.ts

Self-modification request handling. Validates incoming install_packages and add_mcp_server requests and routes them through the approval system.

## Exports

- `handleSelfModRequest(request)` -- validates and routes a self-mod request

## Dependencies

**Internal:**
- [[src-modules-approvals-primitive|approvals/primitive.ts]] -- approval request primitive
- [[src-log|log.ts]] -- structured logging

## Dependents

[[src-modules-self-mod-index|self-mod/index.ts]]

## Key Logic

- Validates request parameters before submitting for approval.
- Routes install_packages and add_mcp_server through the approval primitive.
- Approval result determines whether apply.ts executes the modification.
