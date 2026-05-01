---
title: "Phase 19: Worker Result Batching + Article Validation Approach"
aliases: [worker-batching-approach, article-validation-approach]
category: decisions
tags: [worker-dispatch, validation, wiki, research-pipeline]
parents: [phase-19-worker-batching-article-validation]
created: 2026-04-29
updated: 2026-04-29
source: plan
confidence: medium
---

## Context

Three production issues discovered: (1) checkWorkerResults drip-feeds results 2 at a time as semaphore-gated workers complete, causing ~15 separate agent messages per research session; (2) no mechanical validation on raw or episodic article outputs — malformed articles persist silently; (3) all 723 existing episodic entries lack source_url because the Phase 16 propagation fix hasn't been exercised in production yet.

## Decision

Three streams: (1) Module-state singleton batch tracker in tools.ts — registerPendingBatch(count) after dispatch, checkWorkerResults holds until count satisfied or 60s timeout, backward-compatible for non-batched calls. (2) Deterministic article-validation.ts with validateRawArticle + validateEpisodicArticle, hooked into research_fetch (mark invalid) and postProcessResult (auto-repair fixable issues from write_to contract, mark needs-review for unfixable). (3) wiki_backfill_source_urls MCP tool using slug common-prefix matching against raw articles.

Rejected: LLM-as-judge validation (too expensive, non-deterministic). Rejected: Levenshtein matching (requires new dependency). Rejected: re-dispatching failed workers (complex, might produce same bad output — escalate to agent instead).

## Consequences

- Worker results arrive as 1-2 batches instead of 15 drip-fed injections
- Malformed articles caught at write time with deterministic checks
- Auto-repair fills fixable gaps from the dispatch contract (source_url, tags)
- Backfill tool provides a one-shot repair path for legacy entries
- ValidationResult type shared across validators and consumers
