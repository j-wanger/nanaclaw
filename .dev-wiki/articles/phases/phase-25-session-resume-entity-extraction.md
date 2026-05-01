---
title: "Phase 25: Session Resume Guard + Entity Extraction Pipeline"
aliases: [session-resume-timeout, entity-extraction, negative-news-entities]
category: phases
tags: [poll-loop, session-resume, entity-extraction, knowledge-graph, aml]
parents: []
created: 2026-05-01
updated: 2026-05-01
source: plan
status: active
scope: ["container/agent-runner/src/poll-loop.ts", "container/agent-runner/src/mcp-tools/entity-store.ts", "container/agent-runner/src/mcp-tools/local-worker/dispatch.ts", "container/agent-runner/src/mcp-tools/local-worker/contract.ts", "container/agent-runner/src/mcp-tools/research-summarize.ts", "container/skills/research/**"]
entry_criteria: "Phase 24 complete (deep work session reliability)"
exit_criteria: "Session resume hang caught within 90s with fresh session, research_summarize supports entities_only, workers extract [ENTITY] tags, entity-store parses and appends to entities.jsonl, dispatch handles entity tier, build+tests pass"
---

# Phase 25: Session Resume Guard + Entity Extraction Pipeline

## Objective

Two tracks: (1) Fix session resume hang by adding init timeout to processQuery — catches cases where Claude SDK never yields events when resuming large sessions. (2) Build entity extraction pipeline for AML/negative-news wiki articles, reusing the existing worker dispatch infrastructure with a new entities_only mode.

## Scope

- `container/agent-runner/src/poll-loop.ts` — init timeout for processQuery
- `container/agent-runner/src/mcp-tools/entity-store.ts` (new) — entity parsing + storage
- `container/agent-runner/src/mcp-tools/local-worker/dispatch.ts` — entity tier post-processing
- `container/agent-runner/src/mcp-tools/local-worker/contract.ts` — WriteTo type update
- `container/agent-runner/src/mcp-tools/research-summarize.ts` — entities_only mode
- `container/skills/research/**` — docs update

## Exit Criteria

- [ ] Session resume hang caught within 90s, continuation cleared, fresh session starts
- [ ] research_summarize supports entities_only=true mode
- [ ] Workers extract structured entities with [ENTITY type=TYPE] tags
- [ ] entity-store.ts parses entity tags and appends to entities.jsonl
- [ ] dispatch.ts post-processing handles entity tier alongside claims
- [ ] Build + typecheck + all tests pass

## Notes

- Entity types: PERSON (name|gender|age|profession|role|jurisdiction), ORGANIZATION (name|type|jurisdiction|role), LOCATION (name|type|context), AMOUNT (value|currency|context), CASE (name|agency|date|outcome), DATE (value|context)
- Dedup key: type + lowercase(name) + source_url (exact match only)
- Precision filter in worker prompt: extract subjects of adverse findings, not incidental mentions
- Entity resolution and fuzzy matching explicitly deferred to future phases
- Wiki patterns: typed node modeling (address-and-employer-modeling), NER pipeline template (ai-powered-adverse-media-screening)
