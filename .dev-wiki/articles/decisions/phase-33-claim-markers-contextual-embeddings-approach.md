---
title: "Phase 33: Claim Markers + Contextual Embeddings Approach"
aliases: []
category: decisions
tags: [knowledge-architecture, claim-provenance, embeddings]
parents: [phase-33-claim-markers-contextual-embeddings]
created: 2026-05-04
updated: 2026-05-04
source: plan
confidence: medium
---

## Context

First phase of the 6-phase Option B architecture ("Wiki as Primary, Sentences as Index"). Two independent workstreams that can run in parallel: claim markers (knowledge-wiki convention changes) and contextual sentence embeddings (Nanaclaw code changes). Combined into one dev-wiki phase because they have no dependency on each other and together form the foundation for the claim linker (Phase 3).

## Decision

**Workstream A: Claim markers in knowledge-wiki.** Add `claims:` frontmatter array and `[[clm_<id>]]` inline markers to wiki article conventions. Update the writer prompt to produce markers. Add wiki-health checks 14 (marker integrity) and 15 (claim coverage). Markers are optional in draft articles, expected in reviewed, required in verified. Claims start with empty `sentence_ids` — populated later by the Phase 3 claim linker.

**Workstream B: Contextual embeddings in Nanaclaw.** Upgrade the existing sentence embedding prefix from bracket format `[title | section]` to natural language `"Document: {title}. Section: {section}. "` for better embedding quality. Return `contextual_text` in `knowledge_search` results for provenance visibility. Defer `expand_to_parent` to Phase 6 (small-to-big retrieval) to avoid scope overlap.

**Alternative considered:** Qwen-generated contextual prefixes (50-100 token LLM summaries per sentence). Rejected for Phase 33 — deterministic prefix captures ~60-70% of the gain at zero compute cost. Can upgrade later if retrieval quality is insufficient.

## Consequences

- Knowledge-wiki articles gain a machine-parseable provenance convention before the linker exists
- Writer prompt changes may produce imperfect marker placement initially — lint catches orphaned markers
- Existing knowledge.db embeddings become stale after prefix format change — re-embedding required (one-time cost, ~83 min at 50K sentences via existing llama-server)
- Cross-repo work: knowledge-wiki changes must be copied to `~/.claude/skills/` after editing
