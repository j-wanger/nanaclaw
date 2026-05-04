---
title: "Decision: Memory MCP Server Architecture"
aliases: [memory-mcp-architecture, memory-server-design]
category: decisions
tags: [memory, mcp, architecture, sqlite, python]
created: 2026-05-02
updated: 2026-05-02
source: design-discussion
status: decided
confidence: high
---

# Decision: Memory MCP Server Architecture

## Context

Nana's current memory system is a flat MEMORY.md file with a frozen context fragment injected at session start (~1,500 tokens). No retrieval, no decay, no importance scoring, no semantic search. To take on the project orchestrator role (managing dev phases end-to-end across sessions), Nana needs engineered memory management.

Research base: 2,005 raw articles in agent-memory-wiki, 573 extracted insights. Key sources: Callsphere three-store pattern, Mem0 multi-agent memory, LongMemEval benchmarks, jcode analysis.

## Decision

Build memory as a standalone Python MCP server consumed by both Claude Code and Nanaclaw. SQLite storage with FTS5 + embedding hybrid search. Optional Qwen sidecar verification. Per-project + global stores.

## Key Choices

| Choice | Selected | Rejected | Rationale |
|--------|----------|----------|-----------|
| Delivery | MCP server (shared by Claude Code + Nanaclaw) | Baked into agent-runner | Clean separation, two consumers, one codebase |
| Storage | SQLite primary, markdown export/import | Markdown primary + SQLite index | Memory access patterns (frequent read/write, dedup) favor SQLite |
| Store separation | Separate memory.db (not knowledge.db) | Unified store | Different access patterns (mutable/recency vs stable/append-only) |
| Scoring | RRF fusion, no decay formula | Importance × recency × access_frequency | LongMemEval: no benefit from multi-factor scoring. Trust + explicit supersede instead |
| Verification | Optional Qwen sidecar (per jcode pattern) | Always-on or never | Best jcode feature without hard dependency |
| Trust model | Provenance-based (high/medium/low) | Numeric importance score | Provenance is more meaningful than arbitrary weights |
| Reinforcement | Per-session tracking | Access count | Cross-session confirmation > same-session repetition |
| Capture | Incremental (on decisions, corrections) | Session-end batch | Claude Code has no guaranteed session-end hook |
| Warm tier | Two-pass (ambient signals + first-message keywords) | One-pass at spawn | Solves the bootstrap problem before first user message |
| Prune | Discrete lifecycle (unreinforced low-trust archival) | Continuous time-based decay | Memories don't go stale by time; they go stale by being wrong |

## Implementation

4 phases (29-32), 24 tasks, ~12 hours estimated. Phase 29-30 deliver Claude Code value. Phase 31 adds quality (sidecar). Phase 32 connects Nanaclaw.

Full plan: `groups/dm-with-wang/memory-mcp-plan.md`
