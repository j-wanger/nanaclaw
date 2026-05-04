---
title: "Phase 28: Insight Extraction Approach"
aliases: [insight-extraction-approach, insight-type-design]
category: decisions
tags: [knowledge-pipeline, insight-extraction, type-system]
parents: [phase-28-insight-extraction]
created: 2026-05-02
updated: 2026-05-02
source: plan
confidence: medium
---

## Context

Phase 27 built conflict detection and claim discovery on a unified knowledge.db with type='claim' and type='sentence'. Claims are factual assertions. However, many wiki domains (board game design, agentic engineering) are primarily composed of heuristics, patterns, and recommendations — not verifiable facts. These need a distinct extraction mode.

The claim/insight distinction is load-bearing for conflict detection: contradictory claims signal a real factual problem; contradictory insights are just different expert opinions and should be handled differently (flagged as opinion divergence, not contradiction).

## Decision

**Add type='insight' as a parallel knowledge type.** Follow the exact same pipeline pattern as claims:

1. **Extraction:** New `[INSIGHT]` tag regex + worker prompt focused on heuristics, patterns, recommendations, and best practices. Stored in `insights.jsonl` (parallel to `claims.jsonl`).

2. **Embedding:** Sentence embed pipeline loads `insights.jsonl` alongside `claims.jsonl`. Type priority: claim > insight > sentence (a sentence matching both is classified as claim — facts take precedence).

3. **Search:** `knowledge_search` accepts `type='insight'` filter alongside existing claim/sentence.

4. **Conflict detection:** `knowledge_conflicts` gains an optional `type_filter` parameter. Default behavior filters to claims+sentences only (excluding insight-vs-insight pairs from contradiction analysis).

**insights_only mode** in `research_summarize`: mirrors `claims_only` and `entities_only`. Worker prompt asks for actionable heuristics and design patterns as `[INSIGHT]` tags.

**Alternative considered:** Broadening the claim extraction prompt to capture insights too, keeping everything as type='claim'. Rejected: the claim/insight distinction is needed for conflict detection semantics across domains where both types coexist (aml-wiki has regulatory facts + practitioner heuristics).

## Consequences

- Three knowledge types: claim, insight, sentence — all in unified knowledge.db
- Insight extraction reuses 100% of the claim pipeline infrastructure
- Conflict detection can selectively include/exclude insights
- No schema migration needed — type column is TEXT, existing index works
