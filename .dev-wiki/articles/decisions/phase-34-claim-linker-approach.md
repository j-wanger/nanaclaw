---
title: "Phase 34: Claim Linker Approach"
aliases: []
category: decisions
tags: [knowledge-architecture, claim-provenance, NLI]
parents: [phase-34-claim-linker]
created: 2026-05-04
updated: 2026-05-04
source: plan
confidence: medium
---

## Context

Phase 3 of the 6-phase Option B architecture ("Wiki as Primary, Sentences as Index"). Claims were established in Phase 33 (markers, frontmatter schema, wiki-health checks, contextual embeddings). The linker needs to populate the empty `sentence_ids` and `source_docs` fields by finding supporting sentences in knowledge.db and running NLI verification via Qwen.

## Decision

**Two-pass pipeline per claim:**
1. **Retrieval pass**: Embed claim text → cosine search knowledge.db (type=sentence) → top-K candidates above threshold (default 0.7) → exclude same-article matches (evidence must come from independent sources, not the article's own restatement)
2. **Verification pass**: Batch all (claim, candidate) pairs per article into a single Qwen NLI call → entails/neutral/contradicts classification → map to numeric scores (ENTAILS=1.0, NEUTRAL=0.5, CONTRADICTS=0.0) → average as nli_score → filter to entailing pairs for sentence_ids

**YAML frontmatter update**: Targeted regex on raw frontmatter string for the claims: array. No YAML library dependency — the structure is well-defined and the regex approach avoids a new dependency in the Bun container.

**Reuses existing infrastructure**: claim-embeddings.ts (embedding), KnowledgeVectorStore (search with client-side post-filtering for same-article exclusion via over-fetch 2x top-K), executeAgentLoop + knowledge-classify.ts pattern (Qwen NLI adapted from agree/contradict/unrelated → entails/neutral/contradicts).

**Alternatives rejected:**
- Dedicated NLI model (DeBERTa-v3): adds model dependency, Qwen already handles classification reliably
- Similarity-only linking (no NLI): claim-spec requires nli_score for "verified" state
- js-yaml dependency: avoids adding dep to Bun container when targeted regex suffices for well-defined schema

## Consequences

- Claims transition from advisory-only to machine-linked, enabling future conflict detection (Phase 4)
- NLI quality bounded by Qwen's classification capability (TPR >96%, TNR <25% per working knowledge — adequate for support confirmation, not contradiction detection)
- Client-side same-article filtering requires over-fetching (2x top-K) from searchSimilar
- YAML regex approach is fragile if claim frontmatter schema changes — but schema is controlled by claim-spec.md
