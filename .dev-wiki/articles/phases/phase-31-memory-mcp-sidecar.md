---
title: "Phase 31: Memory MCP Server — Sidecar + Trust Lifecycle"
aliases: [memory-mcp-sidecar, memory-verify, memory-trust, memory-reinforcement]
category: phases
tags: [memory-server, mcp, qwen, sidecar, trust, reinforcement, extraction]
parents: []
created: 2026-05-02
updated: 2026-05-03
source: plan
status: completed
scope: ["memory_server/sidecar.py", "memory_server/extractor.py", "memory_server/storage.py", "memory_server/server.py", "memory_server/tests/"]
entry_criteria: "Phase 30 complete (embeddings + Claude Code integration working)"
exit_criteria: "memory_verify filters irrelevant candidates via Qwen, near-duplicate auto-reinforcement works at cosine > 0.90, trust-based tie-breaking in search, session-end extractor produces reasonable entries from transcript"
---

# Phase 31: Memory MCP Server — Sidecar + Trust Lifecycle

## Objective

Add Qwen sidecar verification (memory_verify tool, verify=true in memory_search), trust-level tie-breaking, reinforcement provenance tracking, near-duplicate auto-reinforcement via embedding similarity, and session-end memory extraction.

## Scope

- New: memory_server/sidecar.py, memory_server/extractor.py
- Modify: memory_server/storage.py (reinforce, supersede, contradiction tracking, trust tie-breaking), memory_server/server.py (memory_verify tool, verify param)
- Config: sidecar endpoint, timeout, max_candidates

## Key Design Decisions

- Sidecar is optional — graceful degradation when Qwen unavailable (returns unverified top-K with warning)
- Trust levels (high/medium/low) based on provenance, not importance scores
- Reinforcement tracks per-session provenance: a fact confirmed across 3 sessions > one accessed 3 times in same session
- Session-end extraction is incremental, not batch — triggered at task completion, decisions, corrections
- Near-duplicate cosine > 0.90 auto-reinforces; 0.85-0.90 warns and lets caller decide

## Exit Criteria

- [x] memory_verify sends candidates to Qwen and returns relevant/not-relevant per entry
- [x] memory_search(verify=true) filters to verified candidates only
- [x] Qwen offline: verify=true falls back gracefully with warning
- [x] memory_store auto-reinforces at cosine > 0.90, warns at 0.85-0.90
- [x] Search results tie-break by trust → strength → recency
- [x] Supersede marks old inactive + links to replacement
- [x] mark_contradiction records bidirectional link
- [x] extractor.py produces reasonable entries from test transcript
