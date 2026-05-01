---
title: "Phase 19: Worker Batching + Article Validation Complete"
category: journal
tags: [worker-dispatch, validation, wiki, research-pipeline]
created: 2026-04-29
phase: 19
---

# Phase 19: Worker Batching + Article Validation Complete

## Summary

6 tasks completed. Three production issues fixed: worker result drip-feed batched into single releases, deterministic validation gates added to raw and episodic article outputs with auto-repair, and backfill tool created for legacy episodic entries missing source_url.

## Changes

- **Batch accumulation tracker** — module-state singleton in tools.ts. `registerPendingBatch(count)` holds `checkWorkerResults` until all expected workers complete or 60s timeout. Wired into research_summarize and research_review. Non-batched workers release immediately (backward compat).
- **article-validation.ts** — shared `ValidationResult` type. `validateRawArticle` checks source_url, sha256, title, content length. `validateEpisodicArticle` checks source_url, title, tags, ## Summary, ## Key Points sections.
- **Raw validation gate** — hooked into research_fetch `fetchAndWrite`. Failures marked `extraction: invalid` in frontmatter.
- **Episodic validation gate + auto-repair** — hooked into dispatch.ts `postProcessResult`. Auto-repairs source_url and tags from the `write_to` contract. Unfixable issues marked `status: needs-review`. Validation issues surfaced in `checkWorkerResults` output.
- **wiki_backfill_source_urls** — one-shot MCP tool matching episodic entries to raw articles by slug prefix, writes source_url into episodic frontmatter.

## Health Delta

- Container tests: 311 → 335 (+24: batch 5, validation 12, backfill 7)
- Host tests: 366 (unchanged)
- Build: clean, typecheck: clean

## Escape Hatches

None used.
