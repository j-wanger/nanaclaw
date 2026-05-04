---
title: "Decision: Phase 32 — Nanaclaw + Consolidation Approach"
aliases: [phase-32-approach, memory-consolidation-approach, memory-migration-approach]
category: decisions
tags: [memory-server, mcp, nanaclaw, consolidation, migration, global-memory, pruning]
created: 2026-05-03
updated: 2026-05-03
source: plan
status: decided
confidence: medium
---

# Decision: Phase 32 — Nanaclaw + Consolidation Approach

## Context

Memory MCP server is feature-complete (Phases 29-31): 9 MCP tools, SQLite + FTS5 + embedding, Qwen sidecar verification, 157 tests. Phase 32 adds the final server capabilities (consolidation, global store, migration, pruning) and wires the server into Nanaclaw's agent group config.

## Approach: Python-First, Config-Only Integration

All new features are Python-side in `memory_server/`. Nanaclaw integration is config-only (add to `container.json` mcpServers) — no TypeScript host changes. Warm-tier injection uses agent-side `memory_search()` per existing `memory-workflow.md` instructions, not host-side compose-time subprocess.

## Key Choices

| Choice | Selected | Rejected | Rationale |
|--------|----------|----------|-----------|
| Global fan-out | `search_all()` queries both DBs, RRF merge, project > global tie-break | Separate process per store | Single-user system; same server, different DB path |
| Consolidation engine | Qwen sidecar (reuse SidecarConfig), fail-closed (skip cluster on Qwen failure) | Claude API / fail-open concatenation | Zero marginal cost; concatenation produces degraded output — better to skip and retry later |
| Consolidation clustering | Pairwise cosine > 0.80 on active embedded memories | Topic modeling / LDA | Cosine threshold is consistent with dedup (0.90) and simple to implement |
| Migration format | Parse `## [type] Title (date)` from MEMORY.md, map types to categories, preserve original type as tag (e.g. `source-type:user`) | Generic markdown parser | Known format, deterministic mapping; tags preserve pre-migration semantics |
| Migration trust | feedback→high (explicit corrections), user/project→medium, reference→medium | All medium | Feedback entries are user-explicit corrections (highest provenance signal) |
| Migration cutover | MEMORY.md becomes readonly backup after migration; agent uses memory_search for all retrieval | Delete MEMORY.md | Reversible — can re-import if needed |
| Prune criteria | trust=low AND strength=1 AND (age > 180d OR access_count < 2) | Time-based decay | Per architecture decision: memories go stale by being wrong, not by time. Prune catches unreinforced low-trust noise |
| Nanaclaw wiring | container.json mcpServers config with per-group MEMORY_PROJECT_DIR env | Host-side TypeScript changes | Agent already has memory_search via MCP + warm-tier instructions in fragments; env field on mcpServers entry scopes DB to the right group |
| Warm tier | Agent-side memory_search (per memory-workflow.md two-pass) | Host compose-time subprocess | Simpler, no new TypeScript code, no subprocess lifecycle management |
| Post-session extraction | Python CLI (`python -m memory_server.extract`) | Host-side exit hook | CLI is testable independently; host integration is future work |

## Risks

1. **Consolidation quality** (medium likelihood, medium impact): Qwen-generated merged text may lose nuance from originals. Mitigation: originals are superseded (not deleted), recoverable. Fail-closed: skip cluster on Qwen failure rather than producing degraded concatenation.
2. **Migration drift** (low likelihood, low impact): MEMORY.md format changes could break parser. Mitigation: format is simple and stable; parser handles unknown types gracefully.
3. **Global store contention** (low likelihood, low impact): Two DB connections per search_all query. Mitigation: SQLite handles this fine for single-user; connections are pooled.
4. **Per-group DB isolation** (medium likelihood, medium impact): mcpServers env must set MEMORY_PROJECT_DIR per-group or all groups share one DB. Mitigation: container.json mcpServers entry has env field for per-group overrides.

## Implementation

6 tasks (3M + 3S), Python-first order: global store → prune → migration → consolidation → Nanaclaw config → final integration.
