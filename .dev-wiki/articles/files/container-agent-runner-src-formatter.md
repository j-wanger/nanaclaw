---
title: "container/agent-runner/src/formatter.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/formatter.ts"
content_hash: "7e64032a12dfd7ff"
exports: [formatMessages, extractRouting, categorizeMessage, isClearCommand, stripInternalTags, RoutingContext]
imports: []
imported_by: ["container/agent-runner/src/poll-loop.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/formatter.ts

Message formatting utilities that convert MessageIn rows into prompt text for the AI provider. Handles routing context extraction, message categorization, /clear detection, and internal tag stripping.

## Exports

- `formatMessages(messages)` -- converts MessageIn rows to prompt text
- `extractRouting(message)` -- extracts routing context from a message
- `categorizeMessage(message)` -- categorizes a message by type
- `isClearCommand(message)` -- detects /clear command
- `stripInternalTags(text)` -- removes internal tags from text
- `RoutingContext` -- type for routing context data

## Dependencies

No internal or external dependencies (pure formatting logic).

## Dependents

[[container-agent-runner-src-poll-loop|poll-loop.ts]]

## Key Logic

- Pure functions for message transformation with no side effects.
- Strips internal tags that should not be visible to the AI provider.
- Extracts routing context to determine reply destinations.
