---
title: "src/group-folder.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/group-folder.ts"
content_hash: "6b4c3890632c9e87"
exports: [groupFolder, ensureGroupFolder]
imports: ["src/config.ts"]
imported_by: []
data_reads: []
data_writes: []
---

# src/group-folder.ts

Group folder path resolution and creation utilities.

## Exports

- `groupFolder(groupSlug)` -- resolves the filesystem path for a group by slug
- `ensureGroupFolder(groupSlug)` -- resolves path and creates directory if missing

## Dependencies

**Internal:**
- [[src-config|config.ts]] -- `GROUPS_DIR` for base path

## Dependents

[[src-group-init|group-init.ts]], `setup/` scripts.
