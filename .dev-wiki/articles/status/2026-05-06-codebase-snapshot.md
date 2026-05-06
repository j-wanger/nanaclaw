---
title: "Codebase Snapshot 2026-05-06"
category: status
created: 2026-05-06
updated: 2026-05-06
source: debrief
---

# Codebase Snapshot — 2026-05-06

## File Metrics

| Area | Files | Notes |
|------|-------|-------|
| Host (src/) | ~127 .ts | Node.js, pnpm, better-sqlite3 |
| Container (container/agent-runner/src/) | ~109 .ts | Bun runtime, bun:sqlite |
| Memory Server (memory_server/) | ~26 .py | Python, uv, FastMCP |

## Test Status

- Host: 374 tests (vitest)
- Container: 446 tests (bun:test)
- Memory Server: 186 tests (pytest)
- No regressions — Phase 43 was documentation-only

## Recent Commits

```
7fb148c Phase 43: Remove stale pipeline references from skill instructions + codify inline citation convention
56aa6ce Phase 42: Remove Qwen-dependent summarization pipeline + claim provenance tools
e74eb70 Phase 41: Fix 3 memory migration bugs reported by Nana
8e0ff85 Phase 40: Auto-migrate MEMORY.md at spawn + claim_dedup guard
db67d78 Phase 39: Memory write convergence — MCP as primary write path
```

## Phase Status

43 phases defined, 23 completed (including Phase 43). Knowledge pipeline fully simplified — sentence embeddings primary, articles optional curated layer, 3 knowledge tools (search, embed, conflicts).

## Related

- [[2026-05-03-codebase-snapshot|Previous Snapshot (2026-05-03)]]
