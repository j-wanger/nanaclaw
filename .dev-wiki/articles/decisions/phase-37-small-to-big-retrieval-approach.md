---
title: "Phase 37: Small-to-Big Retrieval Approach"
aliases: [expand_to_parent, parent chunk retrieval, sentence window]
category: decisions
tags: [knowledge-architecture, retrieval, embeddings]
parents: [phase-37-small-to-big-retrieval]
created: 2026-05-05
updated: 2026-05-05
source: plan
confidence: high
---

## Context

Phase 6 of the 6-phase Option B architecture ("Wiki as Primary, Sentences as Index"). Phases 33-36 established claim markers, contextual embeddings, linking, conflict detection, and reconciliation. `knowledge_search` returns individual sentences — precise for matching but lacks surrounding context for LLM consumption. Small-to-big retrieval was explicitly deferred from Phase 33 (`expand_to_parent`).

Initial design proposed section-level expansion from source articles. Approach review (5/10) identified a critical data reality: 98.3% of raw articles in knowledge.db have no sub-section headings (only 45/2654 articles have >1 distinct section value). Section expansion would return entire 34KB raw articles in most cases, blowing context budgets.

## Decision

**Sentence-window expansion via knowledge.db ID ordering:**

1. `knowledge_search` gains `expand` parameter — `"none"` (default) or `"window"`. Plus `window_size` (default 3 = 3 before + match + 3 after).

2. When `expand: "window"`, after vector search finds top-k sentences:
   - For each match, query knowledge.db for neighboring sentences by article_slug using ID ordering (N rows before/after via LIMIT, no contiguity assumption)
   - Merge overlapping windows from same-article matches into single blocks
   - Return `parent_text` (concatenated window sentences) alongside matched sentence
   - Keep highest similarity score per merged window

3. All expansion is SQL on existing knowledge.db — no source article disk reads, no new module dependencies.

4. Graceful degradation — if fewer than window_size neighbors exist (article boundary), return available neighbors.

**Alternatives rejected:**
- Section-level expansion from raw articles: 98.3% of articles have no sub-headings, would return entire articles
- Storing parent chunks in knowledge.db: doubles storage, stale when source changes, requires migration
- Source article disk reads: raw articles contain boilerplate/navigation noise; knowledge.db sentences are already cleaned by splitter

## Consequences

- Agents get bounded, predictable context (7 sentences default) for every retrieved match
- Works regardless of article heading structure — no dependency on document formatting
- Overlap merging reduces redundancy when multiple sentences from nearby positions match
- ID ordering as position proxy is reliable given sequential embed pipeline, degrades gracefully with gaps
- Future: section-level expansion could layer on top for curated wiki articles (which DO have proper headings) — separate phase
