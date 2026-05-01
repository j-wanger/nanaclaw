---
title: "Phases 18-21: Knowledge Pipeline Overhaul"
category: journal
tags: [wiki, mcp-tools, validation, source-scoring, claim-extraction, research-pipeline]
created: 2026-04-30
phase: 18-21
---

# Phases 18-21: Knowledge Pipeline Overhaul

## Summary

Four phases completed in one session. Built the foundation for a multi-tier knowledge base: wiki management tools for agents, article validation with auto-repair, stateful summarization pipeline, source quality scoring, and atomic claim extraction.

## Phase 18: Wiki + Project Management Integration (6 tasks)
- wiki_read, wiki_stats, project_init MCP tools
- wiki-manager + project-manager container skills
- +22 container tests

## Phase 19: Article Validation Gates (6 tasks)
- validateRawArticle + validateEpisodicArticle with auto-repair
- wiki_backfill_source_urls (fixed 1,029 legacy entries: 97 AML + 932 trading)
- Batch tracker for worker results (later removed in Phase 20)
- +24 container tests

## Phase 20: Summarize Pipeline Reliability (5 tasks)
- Removed broken batch tracker (singleton overwrite + heartbeat stall)
- Stateful research_summarize with raw_dir + source_url dedup
- Stale task file cleanup in checkWorkerResults
- Root cause analysis: Nana stalled at batch 41/46 with ~545 remaining

## Phase 21: Source Triage + Claim Extraction (6 tasks)
- computeSourceScore: authority*0.6 + depth*0.4 with per-wiki domain allowlists
- source_score written to raw article frontmatter
- Summarize workers extract [CLAIM] atomic assertions via boundaries
- Claims extracted post-hoc → per-wiki claims.jsonl
- +21 container tests

## Health Delta
- Container tests: 311 → 367 (+56 across 4 phases)
- Host tests: 366 (unchanged)
- New files: source-score.ts, claim-store.ts, wiki-utils.ts, wiki-read.ts, wiki-stats.ts, project-init.ts, article-validation.ts, wiki-backfill.ts, research-summarize.test.ts
- New skills: wiki-manager, project-manager

## Key Investigations
- Worker result drip-feed: 15 "Noted./Acknowledged." messages per batch → fixed by compact output format
- Batch tracker stall: singleton overwrite + heartbeat death → fixed by removing tracker entirely
- Episodic source_url gap: 0/723 entries had source_url (timing issue) → backfilled 100%
- Knowledge base design research: FEVERFact claims, Blake Crosley signal scoring, GraphRAG, multi-tier architecture

## Escape Hatches
- DISCOVERY: registerPendingBatch removed from research_review too (Phase 20) — compact output handles both paths

## Soft Observations
- Nana dispatched 2,345 AML summarize workers with ~992 failures (~42% failure rate). Failures likely due to Qwen context limits on long articles — source_score triage could route long high-authority articles to Claude instead
- The 8,922 stale task files in worker-tasks/ suggest the cleanup should be more aggressive or run on a schedule
- Knowledge wiki design captured to agentic-engineering-wiki inbox — multi-tier architecture with source triage, claim extraction, vector dedup
