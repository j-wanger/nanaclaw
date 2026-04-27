---
title: "src/group-init.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/group-init.ts"
content_hash: "103d6747dee7c4d9"
exports: [initGroupFilesystem]
imports: ["src/config.ts", "src/log.ts"]
imported_by: ["src/container-runner.ts"]
data_reads: []
data_writes: []
---

# src/group-init.ts

Per-agent-group filesystem scaffolding that creates the CLAUDE.md, skills directory, and agent-runner overlay on first use.

## Exports

- `initGroupFilesystem(groupFolder)` -- creates the directory structure and initial files for a new agent group

## Dependencies

**Internal:**
- [[src-config|config.ts]] -- `GROUPS_DIR` for base path
- [[src-log|log.ts]] -- structured logging

## Dependents

[[src-container-runner|container-runner.ts]]

## Key Logic

- Creates group directory with CLAUDE.md, skills folder, and agent-runner overlay files.
- Idempotent: skips creation if the group folder already exists and is populated.
