---
title: "container/agent-runner/src/providers/provider-registry.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src-providers]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/providers/provider-registry.ts"
content_hash: "2c680c5fd4fad186"
exports: [registerProvider, getProvider]
imports: ["container/agent-runner/src/providers/types.ts"]
imported_by: ["container/agent-runner/src/providers/claude.ts", "container/agent-runner/src/providers/factory.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/providers/provider-registry.ts

Provider self-registration registry. Providers register themselves on import; the factory looks them up by name at creation time.

## Exports

- `registerProvider(name, constructor)` -- registers a provider constructor
- `getProvider(name)` -- retrieves a registered provider constructor

## Dependencies

**Internal:**
- [[container-agent-runner-src-providers-types|types.ts]] -- `AgentProvider` interface

## Dependents

[[container-agent-runner-src-providers-claude|claude.ts]], [[container-agent-runner-src-providers-factory|factory.ts]]

## Key Logic

- Simple map-based registry pattern.
- Providers self-register via side-effect imports (e.g., claude.ts calls registerProvider on load).
- Factory retrieves constructors by name string.
