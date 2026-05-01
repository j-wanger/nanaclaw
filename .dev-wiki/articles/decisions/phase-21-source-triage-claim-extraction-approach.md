---
title: "Phase 21: Source Triage + Claim Extraction Approach"
aliases: [source-triage-approach, claim-extraction-approach]
category: decisions
tags: [knowledge-base, source-scoring, claim-extraction]
parents: [phase-21-source-triage-claim-extraction]
created: 2026-04-30
updated: 2026-04-30
source: plan
confidence: medium
---

## Context

Current pipeline treats all sources equally — a FATF mutual evaluation gets the same Qwen summarization as a blog post. No structured knowledge extraction beyond prose summaries. Research across production systems (FEVERFact, Claimify, Blake Crosley signal scoring) shows that source triage + atomic claim extraction dramatically improves downstream consolidation and dedup.

## Decision

Two streams in one phase: (1) Scripted source scoring (domain authority × 0.6 + content depth × 0.4) stored in raw frontmatter at fetch time. Per-wiki domain allowlist in source-authority.json. (2) Claim extraction via updated summarize worker boundaries — workers produce [CLAIM] tagged atomic assertions alongside existing ## Summary / ## Key Points. Claims extracted post-hoc in postProcessResult and appended to per-wiki claims.jsonl.

Key choices: claim guidance via boundaries array (not prompt-builder.ts hardcode) to keep Qwen prompts lean. JSONL for claims (append-only, grep-queryable, ready for vector import in Phase 22). Source score stored but tier routing deferred — score is metadata for downstream consumers.

Rejected: hardcoding claim extraction in prompt-builder.ts (increases all research worker prompts), vector store in this phase (needs embedding model infrastructure), publish-date freshness scoring (dates not reliably extracted from raw articles).

## Consequences

- Raw articles carry source_score for downstream quality-aware processing
- Structured claims accumulate in claims.jsonl — ready for vector embedding in Phase 22
- Summarize worker output grows slightly (## Claims section) but stays within Qwen's 4K-8K sweet spot
- Pre-Phase-21 raw articles have no source_score — consumers must handle gracefully (default 0)
