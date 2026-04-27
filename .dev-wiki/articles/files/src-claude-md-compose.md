---
title: "src/claude-md-compose.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/claude-md-compose.ts"
content_hash: "bed06a0882b6d90f"
exports: [composeGroupClaudeMd, migrateGroupsToClaudeLocal]
imports: ["src/config.ts", "src/log.ts"]
imported_by: ["src/index.ts", "src/container-runner.ts"]
data_reads: []
data_writes: []
---

# src/claude-md-compose.ts

Composes `CLAUDE.md` files from a base template plus module-contributed fragments for each agent group. Also handles migration of existing groups to the `.claude/` local config format.

## Exports

- `composeGroupClaudeMd(groupFolder)` -- assembles a complete CLAUDE.md from base + module fragments
- `migrateGroupsToClaudeLocal()` -- migrates all groups to use .claude/ local config structure

## Dependencies

**Internal:**
- [[src-config|config.ts]] -- `GROUPS_DIR` for group folder paths
- [[src-log|log.ts]] -- structured logging

## Dependents

[[src-index|index.ts]], [[src-container-runner|container-runner.ts]]

## Key Logic

- Reads base CLAUDE.md template, then appends module-specific fragments to build the final per-group configuration.
- Migration function iterates all groups and restructures their config layout.
