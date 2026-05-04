---
title: "Phase 31: Sidecar + Trust Lifecycle Approach"
aliases: [phase-31-approach, sidecar-verification-approach]
category: decisions
tags: [memory-server, sidecar, qwen, verification, extraction]
parents: [phase-31-memory-mcp-sidecar]
created: 2026-05-03
updated: 2026-05-03
source: plan
confidence: medium
---

## Context

Phase 30 implemented embedding search, RRF fusion, trust tie-breaking, cosine dedup, and export/import. Three of Phase 31's eight exit criteria are already met (auto-reinforce, trust tie-breaking, supersede). The remaining work is Qwen sidecar verification, contradiction tracking, and session-end memory extraction.

## Decision

Build sidecar.py as a thin HTTP client to llama-server's OpenAI-compatible endpoint. Add memory_verify tool and verify param on memory_search. Add mark_contradiction for bidirectional conflict tracking. Build extractor.py as a transcript-to-memories module using the same HTTP endpoint. All new modules degrade gracefully when Qwen is unavailable.

### Key choices

| Choice | Selected | Rationale |
|--------|----------|-----------|
| Sidecar transport | httpx to OpenAI-compatible /v1/chat/completions | llama-server already exposes this; httpx already a dependency |
| Verification model | Per-candidate relevance label (relevant/not-relevant) | Simple binary, cheap to run, easy to test |
| Extractor output | Proposed entries without auto-store | Caller (agent or hook) decides what to keep |
| Graceful degradation | Fail-open: return unverified results with warning flag | Unverified memories better than no memories; aligns with working knowledge (fail-open default) |
| Contradiction model | Bidirectional JSON array on existing column | Schema already has contradicts column; symmetric links for both entries |

## Consequences

- Sidecar is optional and zero-config if Qwen is not running — no UX impact on existing users
- Extractor module is standalone — Phase 32 wires it into Nanaclaw session hooks
- mark_contradiction is a foundation for future consolidation (Phase 32)
- Test surface grows by ~40-50 tests (sidecar mock, extractor mock, contradiction logic)
