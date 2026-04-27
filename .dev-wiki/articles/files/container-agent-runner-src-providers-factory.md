---
title: "container/agent-runner/src/providers/factory.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src-providers]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/providers/factory.ts"
content_hash: "39d2c109e1922207"
exports: [createProvider, ProviderName]
imports: ["container/agent-runner/src/providers/provider-registry.ts", "container/agent-runner/src/providers/types.ts"]
imported_by: ["container/agent-runner/src/index.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/providers/factory.ts

Provider factory that creates a provider instance by name from the provider registry.

## Exports

- `createProvider(name, options)` -- creates and returns a provider instance
- `ProviderName` -- type/enum for recognized provider names

## Dependencies

**Internal:**
- [[container-agent-runner-src-providers-provider-registry|provider-registry.ts]] -- `getProvider` for registry lookup
- [[container-agent-runner-src-providers-types|types.ts]] -- `AgentProvider`, `ProviderOptions`

## Dependents

[[container-agent-runner-src-index|index.ts]]

## Key Logic

- Looks up the provider constructor in the registry by name.
- Instantiates and returns the provider with the given options.
- Entry point uses this to create the provider specified in container.json.
