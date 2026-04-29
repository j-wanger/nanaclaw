---
title: "Phase 13: Multi-Stage Research Pipeline"
aliases: [phase-13-approach, research-pipeline-redesign, orchestrated-research]
category: decisions
tags: [local-worker, research-loop, wiki-design, multi-agent]
parents: [phase-13-multi-stage-research-pipeline]
created: 2026-04-27
updated: 2026-04-27
source: plan
confidence: medium
---

## Context

Phase 12 live testing confirmed that Qwen cannot autonomously manage a full research pipeline (search → extract → synthesize → wiki_write) in a single agent loop. The worker made 15 tool calls across 8 iterations but timed out before calling wiki_write — the MAST FM-1.3 step-repetition pattern. Prompt-based routing was insufficient: Qwen ignores soft instructions once context exceeds ~20K tokens.

The user proposed a fundamentally different architecture: Nana (Claude) as orchestrator, Qwen workers doing focused single-stage tasks. Reference implementations: Hermes LLM Wiki (raw/ layer with sha256 provenance, three-layer wiki) and wiki-bootstrap research agent (orchestrator-driven coverage tracking).

Additionally, the single-instance llama-cpp server bottlenecks parallel research — workers queue sequentially.

## Decision

**Four-track: parallel inference capacity → raw material layer → pipeline skill rewrite → stage prompt templates.**

### Track 1: Parallel Inference Capacity
Investigate llama-cpp `--parallel N` flag for concurrent slot handling on single GPU. If insufficient, configure a secondary 8B model instance for lighter tasks (summarize, review). Update models.json routing.

### Track 2: Raw Material Layer (wiki_write tier: raw)
Extend wiki_write MCP tool with `tier: raw` that writes to `<wiki>/raw/articles/` with Hermes-style frontmatter (source_url, ingested, sha256 of content body). Raw files are immutable source material.

### Track 3: Research Pipeline Skill Rewrite
Replace autonomous agent-loop research with orchestrated multi-stage pipeline:
- Stage 1 (Plan): Nana drafts research plan with specific queries and angles
- Stage 2 (Search+Write-Raw): Qwen workers with [web_search, web_extract, wiki_write] tools, one topic per worker, each saves raw .md
- Stage 3 (Summarize): Qwen workers convert raw → wiki-format article (single-shot or with [wiki_search] for cross-linking)
- Stage 4 (Review): Qwen workers compare summary vs original, flag gaps (single-shot structured output)
- Stage 5 (Consolidate): Nana reviews, absorbs into wiki, triggers next round if coverage insufficient

### Track 4: Stage Prompt Templates
Companion files per stage following the sequential-pipeline pattern from the wiki: search-extract-prompt.md, summarize-prompt.md, review-prompt.md.

**Rejected alternatives:**
- *Pure single-shot for all stages:* Too many round-trips. Phase 12 live test showed Qwen handles 15 tool calls — the issue was pipeline management, not tool-calling capability.
- *Keep autonomous agent loop with stronger prompts:* Proven to fail. Context accumulation drowns instructions.
- *New orchestration module in container code:* Unnecessary — SKILL.md instructions + existing dispatch_worker are sufficient. Nana is the orchestrator.

## Consequences

- Research pipeline becomes reliable (each worker has focused scope, fresh context)
- Raw materials persist for reuse and provenance tracking
- Parallel workers enabled by multi-instance llama-cpp
- Quality gates at each stage (review workers catch summarization errors)
- Nana controls coverage and decides when research is sufficient
