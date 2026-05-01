---
title: "Phase 22: Vector Claim Store Approach"
aliases: [vector-claim-approach, claim-embedding-approach]
category: decisions
tags: [knowledge-base, vector-embeddings, claim-store, dedup]
parents: [phase-22-vector-claim-store]
created: 2026-04-30
updated: 2026-04-30
source: plan
confidence: medium
---

## Context

Phase 21 built claim extraction into the summarize pipeline: workers produce [CLAIM] tags, postProcessResult appends to per-wiki claims.jsonl. But claims.jsonl is empty — no research sessions have run since Phase 21. The 3,000+ existing raw articles (2,870 AML + 932+ trading) have never had claims extracted. To build meaningful vector infrastructure, we need real claim data first.

## Decision

Two-stage phase: (1) Claim backfill from existing raw articles via `claims_only` mode on research_summarize, then (2) vector embedding + storage + dedup query infrastructure.

**Stage 1 — Claim Backfill:**
- Add `claims_only: boolean` param to existing `research_summarize` handler — reuses batch state file, dedup logic, source_url scanning, and worker dispatch infrastructure (reviewer feedback: avoids duplicating MCP tool surface area)
- When `claims_only: true`, dispatchForPaths sends claim-extraction-only boundaries (no ## Summary or ## Key Points required), and write_to tier set to null/skipped — claims appended to claims.jsonl via existing appendClaims but no episodic article produced
- Stateful offset tracking reuses existing summarize-state.json (with mode field to distinguish claims_only from full summarize)

**Stage 2 — Vector Store:**
- Dedicated embedding model: nomic-embed-text-v1.5 GGUF (~150MB, 768 dims, Apache 2.0). Chosen for size efficiency on M1 Max — 137M params vs BGE-M3's 567M. 768 dims is the sweet spot per wiki knowledge (384-768 dims optimal for production RAG). Matryoshka support allows dimension truncation if storage becomes a concern.
- Embedding server: second llama-server instance on configurable port. `NANOCLAW_EMBED_URL` env var (defaulting to `http://localhost:8081/embedding`) mirrors existing `LLAMA_CPP_URL` pattern. Semaphore guard via existing infrastructure.
- Embedding client (`claim-embeddings.ts`): HTTP client for llama-server `/embedding` endpoint. Batch embed claims.
- Per-wiki vector store (`claim-vector-store.ts`): SQLite via bun:sqlite. Table: claims (id INTEGER PRIMARY KEY, text, source_url, source_score REAL, wiki, created, embedding BLOB). Cosine similarity computed in JS.
- Embed pipeline: reads claims.jsonl, embeds each claim, upserts into claims.db. Incremental — tracks last-processed JSONL line offset in embed-state.json.
- MCP tools: `claim_search` (semantic query → top-k similar claims) and `claim_dedup` (find near-duplicate pairs above cosine similarity threshold, default 0.92).

**Key sizing:** ~3,000 raw articles × ~5 claims/article = ~15K claims. 15K × 768 dims × 4 bytes = ~46MB of float data. Brute-force cosine similarity scan is <100ms at this scale — no HNSW or ANN index needed.

**Rejected:** (A) vector store without real data (approach B selected by user), (B) re-summarizing all raw articles (wasteful — 2,386 already have episodic articles), (C) heuristic claim extraction without LLM (AIDA-compliant claims require judgment), (D) external vector DB (unnecessary at 15K scale, adds Bun compatibility risk), (E) new `research_extract_claims` MCP tool (reviewer: duplicates research_summarize infrastructure).

**Deferred:** conflict detection (needs polarity analysis beyond similarity), taxonomy-free clustering (DBSCAN/HDBSCAN), cross-wiki claim merging.

## Consequences

- claims.jsonl populated with real data from existing raw corpus — enables data-driven vector store development
- Dedicated embedding model adds a second llama-server process (~150MB GPU memory) but decouples from inference workload
- SQLite vector store is simple and Bun-compatible, but limits scale to ~100K claims before needing ANN indexing
- Claim backfill is a long-running operation (~3,000 articles × 2 parallel Qwen workers) — designed to survive session boundaries via state file
- nomic-embed-text-v1.5 selected for minimal resource footprint; swap to BGE-M3 or Qwen3-Embedding if multilingual or higher accuracy needed
