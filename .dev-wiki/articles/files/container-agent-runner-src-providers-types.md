---
title: "container/agent-runner/src/providers/types.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src-providers]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/providers/types.ts"
content_hash: "14ea9ed136cd31a9"
exports: [AgentProvider, AgentQuery, ProviderEvent, ProviderOptions, QueryInput, McpServerConfig]
imports: []
imported_by: ["container/agent-runner/src/poll-loop.ts", "container/agent-runner/src/providers/claude.ts", "container/agent-runner/src/providers/factory.ts", "container/agent-runner/src/providers/provider-registry.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/providers/types.ts

Provider interface definitions used across the container agent-runner. Hub module imported by approximately 10 container files.

## Exports

- `AgentProvider` -- interface for AI provider implementations
- `AgentQuery` -- type for a query to the provider
- `ProviderEvent` -- type for events emitted by the provider during streaming
- `ProviderOptions` -- type for provider configuration options
- `QueryInput` -- type for formatted query input
- `McpServerConfig` -- type for MCP server configuration

## Dependencies

No dependencies (pure type definitions).

## Dependents

[[container-agent-runner-src-poll-loop|poll-loop.ts]], [[container-agent-runner-src-providers-claude|claude.ts]], [[container-agent-runner-src-providers-factory|factory.ts]], [[container-agent-runner-src-providers-provider-registry|provider-registry.ts]]

## Key Logic

- `AgentProvider` is the core interface: providers must implement `query()` for running agent queries.
- `ProviderEvent` enables push-based streaming of partial results.
- `McpServerConfig` is shared with mcp-tools/types.ts for MCP server configuration.
