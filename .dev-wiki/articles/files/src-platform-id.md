---
title: "src/platform-id.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/platform-id.ts"
content_hash: "a9d4c0dc6457d4dd"
exports: [normalizePlatformId, extractHandle]
imports: []
imported_by: []
data_reads: []
data_writes: []
---

# src/platform-id.ts

Platform ID normalization utilities for consistent user identification across channels.

## Exports

- `normalizePlatformId(raw)` -- normalizes a raw platform identifier to canonical form
- `extractHandle(platformId)` -- extracts the user handle from a platform ID

## Dependencies

**Internal:** None (standalone utility).

**External:** None.

## Dependents

`src/modules/permissions/` (imported by permissions module).
