---
title: "container/agent-runner/src/poll-loop.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/poll-loop.ts"
content_hash: "eb95a7616206175c"
exports: [runPollLoop, PollLoopConfig]
imports: ["container/agent-runner/src/destinations.ts", "container/agent-runner/src/db/messages-in.ts", "container/agent-runner/src/db/messages-out.ts", "container/agent-runner/src/db/connection.ts", "container/agent-runner/src/db/session-state.ts", "container/agent-runner/src/formatter.ts", "container/agent-runner/src/providers/types.ts"]
imported_by: ["container/agent-runner/src/index.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/poll-loop.ts

Main poll loop that drives the container agent. Polls messages_in for pending messages, formats them into prompts, calls the provider, streams responses via push, writes to messages_out, and marks messages completed.

## Exports

- `runPollLoop(config)` -- starts the continuous poll loop
- `PollLoopConfig` -- configuration type for the poll loop

## Dependencies

**Internal:**
- [[container-agent-runner-src-destinations|destinations.ts]] -- destination resolution
- [[container-agent-runner-src-db-messages-in|messages-in.ts]] -- `getPendingMessages`, `markProcessing`, `markCompleted`
- [[container-agent-runner-src-db-messages-out|messages-out.ts]] -- `writeMessageOut` for outbound messages
- [[container-agent-runner-src-db-connection|connection.ts]] -- database connections
- [[container-agent-runner-src-db-session-state|session-state.ts]] -- continuation persistence
- [[container-agent-runner-src-formatter|formatter.ts]] -- `formatMessages` for prompt construction
- [[container-agent-runner-src-providers-types|providers/types.ts]] -- provider interface types

## Dependents

[[container-agent-runner-src-index|index.ts]]

## Key Logic

- Handles `/clear` command to reset session state.
- Accumulate gate: skips processing when trigger count is 0.
- Persists SDK session ID for continuation across poll iterations.
