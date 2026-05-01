---
title: "Phase 25: Session Resume Guard + Entity Extraction Pipeline"
aliases: [session-resume-timeout, entity-extraction, negative-news-entities]
category: decisions
tags: [poll-loop, session-resume, entity-extraction, knowledge-graph, aml]
parents: [phase-25-session-resume-entity-extraction]
created: 2026-05-01
updated: 2026-05-01
source: plan
confidence: medium
---

## Context

Two issues: (1) Claude SDK hangs when resuming 960+ turn sessions — poll loop blocks on `for await (event of query.events)` because the SDK never yields an init event. Runner process stays alive but never processes messages. (2) Need entity extraction from AML/negative-news wiki articles to build structured entity data (people, organizations, jurisdictions, amounts, cases) for downstream knowledge graph construction.

## Decision

**Track 1: Session Resume Init Timeout.** Add an init timeout to `processQuery()` in poll-loop.ts. Race the first `init` event against a 90-second deadline. If no init event arrives, abort the query, clear the stale continuation, and let the next poll cycle start fresh. The existing `isSessionInvalid` mechanism handles stale session errors — this adds coverage for the silent-hang case. No turn counter needed — the timeout catches all resume hang scenarios regardless of session size.

**Track 2: Entity Extraction Pipeline.** Reuse the existing `research_summarize` → worker → `dispatch.ts` post-processing pipeline with a new `entities_only` mode (parallel to `claims_only`). Workers extract structured entities as `[ENTITY type=<TYPE>] <structured fields>` tags. New `entity-store.ts` parses entity tags and appends to `entities.jsonl`. Entity types for AML domain: PERSON, ORGANIZATION, JURISDICTION, AMOUNT, CASE, DATE. Wire into dispatch.ts alongside claims handling. Expose via existing `research_summarize` tool with `entities_only=true` parameter.

**Alternative considered (Track 2):** Separate `entity_extract` MCP tool instead of extending `research_summarize`. Rejected — the infrastructure is identical (batch raw articles, dispatch workers, post-process results). A new mode parameter on the existing tool avoids code duplication and lets the agent mix-and-match in a single session.

## Consequences

- Track 1: Resume hangs are caught within 90 seconds instead of hanging indefinitely. Fresh session starts automatically — user loses context but regains responsiveness.
- Track 2: Entity extraction reuses the proven summarize pipeline. entities.jsonl is a flat JSONL store (no graph DB yet). Fuzzy entity resolution and knowledge graph construction deferred to future phases.
- Track 2: Worker prompt quality determines extraction accuracy — bad prompt = bad entities. Initial prompt is for AML/financial-crime domain; other domains need different prompts.
