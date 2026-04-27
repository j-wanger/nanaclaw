---
title: "src/container-runtime.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/container-runtime.ts"
content_hash: "181ab3d7acb1e0d1"
exports: [ensureContainerRuntimeRunning, cleanupOrphans, CONTAINER_RUNTIME_BIN, hostGatewayArgs, readonlyMountArgs, stopContainer]
imports: ["src/config.ts", "src/log.ts"]
imported_by: ["src/index.ts", "src/container-runner.ts"]
data_reads: []
data_writes: []
---

# src/container-runtime.ts

Runtime selection layer supporting Docker and Apple containers, with orphan cleanup and container stop/kill operations.

## Exports

- `ensureContainerRuntimeRunning()` -- verifies the container runtime is available and running
- `cleanupOrphans()` -- removes orphaned containers from previous runs
- `CONTAINER_RUNTIME_BIN` -- resolved path to the container runtime binary
- `hostGatewayArgs()` -- Docker args for host gateway networking
- `readonlyMountArgs()` -- Docker args for read-only volume mounts
- `stopContainer(id)` -- stops a container by ID

## Dependencies

**Internal:**
- [[src-config|config.ts]] -- runtime configuration constants
- [[src-log|log.ts]] -- structured logging

## Dependents

[[src-index|index.ts]], [[src-container-runner|container-runner.ts]]

## Key Logic

- Detects available container runtime (Docker vs Apple containers) and sets `CONTAINER_RUNTIME_BIN` accordingly.
- Orphan cleanup queries for containers with the install label and removes stale ones.
