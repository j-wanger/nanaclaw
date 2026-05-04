---
title: "Codebase Snapshot — 2026-05-03"
category: status
created: 2026-05-03
updated: 2026-05-03
---

# Codebase Snapshot — 2026-05-03

## Metrics
- Host: 91 .ts files, Node.js + pnpm
- Container agent-runner: 34 .ts files, Bun
- Memory server: 10 .py files (~2,500 lines), Python + uv
- Host tests: ~366 (vitest)
- Container tests: ~491 (bun:test)
- Memory server tests: 157 (pytest)

## Recent Commits
- 0bb00f6 Phase 31 Task 6: mark Phase 30 exit criteria as met
- b10f9c3 Phase 31 Task 5: expose module-level mcp; full suite green
- adeb2dc Phase 31 Task 4: transcript-to-memories extractor
- 531ce09 Phase 31 Task 3: bidirectional contradiction tracking
- 8e4664e Phase 31 Task 2: wire sidecar into memory_search and memory_verify

## Memory Server (Phases 29-31)
- 9 MCP tools: memory_store, memory_search, memory_forget, memory_tag, memory_stats, memory_export, memory_import, memory_verify, memory_contradict
- SQLite + FTS5 + sqlite-vec (embedding cosine search)
- RRF fusion scoring, trust-based tie-breaking, cosine dedup
- Qwen sidecar verifier (fail-open, binary relevant/not-relevant)
- Bidirectional contradiction tracking (advisory)
- Transcript-to-memories extractor (trust=low, source=inferred boundary)
- Export/import round-trip (markdown ↔ SQLite)
