---
title: "Phase 1a: Memory Architecture Research"
aliases: [phase-1a, memory-research]
category: phases
tags: [memory, research, architecture]
parents: [phase-00-fresh-fork-smoke-test]
created: 2026-04-25
updated: 2026-04-25
source: plan
status: completed
scope: ["docs/memory-architecture.md"]
entry_criteria: "Phase 0 complete"
exit_criteria: "Memory architecture design document specifying store types, storage backends, retrieval patterns, integration points, and context injection strategy"
---

# Phase 1a: Memory Architecture Research

## Objective

Research agent memory landscape (MemU, Letta, Zep, Mem0, MIRIX, Anthropic) and Karpathy wiki implementations before committing to an implementation approach.

## Scope

- Agent memory systems 2024-2026
- Karpathy LLM wiki implementations
- Synthesis: episodic vs domain knowledge, retrieval patterns, context injection

## Exit Criteria

- [x] Design document covering: store types, storage backends, retrieval, integration points, context injection

## Notes

Research completed prior to dev-wiki bootstrap. Key findings: frozen snapshot injection, FTS5 over embeddings for operational memory, MEMORY.md as source of truth with derived SQLite index. Full document saved at docs/memory-architecture.md.
