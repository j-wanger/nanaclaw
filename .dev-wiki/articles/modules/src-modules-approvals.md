---
title: "src/modules/approvals/"
aliases: []
category: modules
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: module
path: "src/modules/approvals/"
files: [src-modules-approvals-index, src-modules-approvals-onecli-approvals, src-modules-approvals-primitive, src-modules-approvals-response-handler]
external_deps: ["@onecli-sh/sdk"]
internal_deps: [src-db, src-channels]
dependents: [src-modules-permissions, src-modules-self-mod]
content_hash: "b1599b3648371496"
---

# src/modules/approvals/

Approval primitives providing approver selection, approval delivery, and a OneCLI credential approval bridge.

## Files

[[src-modules-approvals-primitive]], [[src-modules-approvals-onecli-approvals]], [[src-modules-approvals-response-handler]], [[src-modules-approvals-index]]

## Key Patterns

- `primitive.ts` exposes `pickApprover` and `requestApproval` as the core API
- `onecli-approvals.ts` bridges to OneCLI for credential-based approval flows

## Dependencies

**Internal:** [[src-db]], [[src-channels]]

**External:** `@onecli-sh/sdk`

## Dependents

[[src-modules-permissions]], [[src-modules-self-mod]]
