# Active Phase Context

Phase: 25 — Session Resume Guard + Entity Extraction Pipeline
Objective: Fix session resume hang (init timeout) + build entity extraction pipeline for AML wiki articles.
Scope: container/agent-runner/src/poll-loop.ts, container/agent-runner/src/mcp-tools/entity-store.ts, container/agent-runner/src/mcp-tools/local-worker/dispatch.ts, container/agent-runner/src/mcp-tools/local-worker/contract.ts, container/agent-runner/src/mcp-tools/research-summarize.ts, container/skills/research/**
Key constraints:
- Init timeout: 90s race on first event, abort+clear continuation on timeout
- Entity types: PERSON (name|gender|age|profession|role|jurisdiction), ORGANIZATION, LOCATION, AMOUNT, CASE, DATE
- Dedup key: type + lowercase(name) + source_url (exact match)
- Precision filter: subjects of adverse findings only, not incidental mentions
- Entity resolution/fuzzy matching explicitly out of scope
Exit: Both tracks implemented, tests pass, build clean.
Abort: if blocked >3 attempts, ask user: skip or abort
