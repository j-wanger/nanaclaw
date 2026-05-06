---
title: "Knowledge Pipeline Post-Phase 42 Design"
aliases: [post-pipeline-simplification, article-layer-redesign]
category: decisions
tags: [knowledge-pipeline, articles, embeddings, citations, architecture]
parents: [phase-42-pipeline-simplification]
created: 2026-05-05
updated: 2026-05-05
source: debrief
confidence: high
---

## Context

After Phase 42 deleted the Qwen-dependent summarization pipeline and all claim provenance tools, the question arose: what role do wiki articles play going forward? The old pipeline used Qwen workers to generate articles from raw sources via a multi-stage pipeline (summarize, review, extract claims, link claims). With sentence embeddings as the primary retrieval substrate, the article tier needed a new purpose.

## Decision

Articles become an optional curated view layer, written by Claude (not Qwen). Sentence embeddings remain the primary retrieval substrate. Three knowledge tools are kept: knowledge_search, knowledge_embed, knowledge_conflicts. All 8 claim tools stay deleted. wiki-consolidate stays deleted.

The key insight: claims were an intermediate representation compensating for Qwen's inability to do end-to-end synthesis. Claude does synthesis with citations directly, making the intermediate claim layer unnecessary overhead.

## Consequences

- Articles are human/Claude-authored summaries, not pipeline output. No automated article generation.
- Provenance preserved through inline citation convention (see [[inline-citation-convention]]) rather than structured claim metadata.
- STORM ~85% citation accuracy is the relevant reference for single-pass synthesis quality.
- DELEGATE-52 corruption concern (25% over 20 edits) applies to iterative revision, not single-pass. If iterative article revision is later added, verification tooling becomes operationally needed at that point.
- Principle: don't build intermediate representations to compensate for model weakness when a stronger model eliminates the need. Applies to other pipeline designs.
