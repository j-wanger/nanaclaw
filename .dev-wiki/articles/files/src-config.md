---
title: "src/config.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/config.ts"
content_hash: "9e04f8cd79211dd2"
exports: [DATA_DIR, GROUPS_DIR, CONTAINER_IMAGE, CONTAINER_IMAGE_BASE, CONTAINER_INSTALL_LABEL, ONECLI_URL, ONECLI_API_KEY, TIMEZONE]
imports: ["src/env.ts"]
imported_by: ["src/index.ts", "src/session-manager.ts", "src/container-runner.ts", "src/container-runtime.ts", "src/container-config.ts", "src/claude-md-compose.ts", "src/group-init.ts", "src/group-folder.ts"]
data_reads: ["process.env via env.ts"]
data_writes: []
---

# src/config.ts

Central constants hub providing environment-derived configuration values used across the host process.

## Exports

- `DATA_DIR` -- root data directory path
- `GROUPS_DIR` -- agent groups directory path
- `CONTAINER_IMAGE` -- full container image reference
- `CONTAINER_IMAGE_BASE` -- base container image name
- `CONTAINER_INSTALL_LABEL` -- Docker label for install identification
- `ONECLI_URL` -- OneCLI service URL
- `ONECLI_API_KEY` -- OneCLI API key
- `TIMEZONE` -- configured timezone

## Dependencies

**Internal:**
- [[src-env|env.ts]] -- `.env` file loading (side effect import)

## Dependents

[[src-index|index.ts]], [[src-session-manager|session-manager.ts]], [[src-container-runner|container-runner.ts]], [[src-container-runtime|container-runtime.ts]], [[src-container-config|container-config.ts]], [[src-claude-md-compose|claude-md-compose.ts]], [[src-group-init|group-init.ts]], [[src-group-folder|group-folder.ts]]
