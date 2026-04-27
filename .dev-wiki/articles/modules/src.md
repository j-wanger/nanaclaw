---
title: "src/"
aliases: []
category: modules
tags: [typescript]
parents: []
created: 2026-04-25
updated: 2026-04-25
source: scan
type: module
path: "src/"
files: [src-claude-md-compose, src-command-gate, src-config, src-container-config, src-container-runner, src-container-runtime, src-delivery, src-env, src-group-folder, src-group-init, src-host-sweep, src-index, src-install-slug, src-log, src-platform-id, src-response-registry, src-router, src-session-manager, src-state-sqlite, src-timezone, src-types, src-webhook-server]
external_deps: []
internal_deps: [src-db, src-channels, src-modules-permissions, src-modules-approvals, src-modules-scheduling, src-providers]
dependents: []
content_hash: "f0d28dffb04edd78"
---

# src/

Host process core providing the entry point, inbound routing, outbound delivery, session lifecycle management, container spawning, host sweep, and command gate.

## Files

[[src-index]], [[src-router]], [[src-delivery]], [[src-session-manager]], [[src-container-runner]], [[src-host-sweep]], [[src-command-gate]], [[src-config]], [[src-log]], [[src-types]], [[src-response-registry]], [[src-webhook-server]], [[src-platform-id]], [[src-install-slug]], [[src-timezone]], [[src-state-sqlite]], [[src-env]], [[src-claude-md-compose]], [[src-group-init]], [[src-group-folder]], [[src-container-config]], [[src-container-runtime]]

## Key Patterns

- Hub files: `log.ts` (11 importers), `config.ts` (8 importers), `types.ts` (7 importers)
- Top-level orchestrator: everything depends on exports from this module

## Dependencies

**Internal:** [[src-db]], [[src-channels]], [[src-modules-permissions]], [[src-modules-approvals]], [[src-modules-scheduling]]

**External:** None at module level (child modules carry external deps)

## Dependents

Top-level module; all other host-side modules depend on its exports.
