---
title: "src/container-config.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/container-config.ts"
content_hash: "f7ee5c799f52dc6b"
exports: [readContainerConfig, writeContainerConfig]
imports: ["src/config.ts", "src/log.ts"]
imported_by: ["src/container-runner.ts", "src/modules/self-mod/apply.ts"]
data_reads: ["groups/<folder>/container.json"]
data_writes: []
---

# src/container-config.ts

Read/write operations for per-agent-group `container.json` configuration files.

## Exports

- `readContainerConfig(groupFolder)` -- reads and parses container.json for a group
- `writeContainerConfig(groupFolder, config)` -- writes container.json for a group

## Dependencies

**Internal:**
- [[src-config|config.ts]] -- `GROUPS_DIR` for group folder paths
- [[src-log|log.ts]] -- structured logging

## Dependents

[[src-container-runner|container-runner.ts]], `src/modules/self-mod/apply.ts`
