---
title: "Iterative Research Pipeline"
aliases: [phase-15-decision, script-driven-research]
category: decisions
tags: [research, mcp-tools, searxng, workers, knowledge-wiki]
parents: [phase-15-iterative-research-pipeline]
created: 2026-04-28
updated: 2026-04-28
source: plan
confidence: high
---

## Context

Phases 12-14 attempted LLM-worker-driven research pipelines. Workers calling web_search + web_extract + wiki_write consistently failed: step-repetition (FM-1.3), timeout (35B model generates wiki_write content at 15 tok/s = 100-400s per call), and skill-level behavioral contracts couldn't prevent Opus from bypassing the pipeline and doing research directly. The entire search → extract → write-raw path is pure HTTP + file I/O — zero LLM needed.

## Decision

Split research into scriptable vs cognitive work:
- **Script (research_fetch MCP tool)**: SearXNG query → URL dedup via per-wiki raw/.url-index → parallel fetch+extract → write raw articles with Hermes frontmatter. Zero LLM, ~15-30s total.
- **Cognitive (single-shot workers)**: summarize (raw → episodic markdown) and review (score + pass/fail). No tool calling — `write_to` contract field routes outputs via code post-processing.
- **Orchestration (Nana/Opus)**: wiki-first knowledge query, iterative search query generation, coverage decisions, failed review intervention.

Alternatives rejected:
- Worker-driven search+extract: 3-8 min per worker, timeout failures, step-repetition — proven broken across 4 iterations
- Nana does everything directly: bypasses workers entirely, skips review, no quality gates
- Full MCP pipeline tool: removes orchestrator judgment from plan/review stages

## Consequences

- research_fetch is idempotent (dedup by URL) and fast (~15-30s)
- Workers only do cognitive work (summarize, review) — bounded, single-shot, reliable
- write_to post-processing eliminates LLM from mechanical file routing
- Consolidation deferred to /wiki-consolidate → /wiki-absorb (not this pipeline's job)
- Per-wiki raw/.url-index must be maintained — append on write, rebuild on corruption
