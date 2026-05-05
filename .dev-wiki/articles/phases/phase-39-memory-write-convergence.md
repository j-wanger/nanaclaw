---
title: "Phase 39: Memory Write Convergence"
aliases: [memory write path, MCP primary]
category: phases
tags: [memory-architecture, documentation]
parents: []
created: 2026-05-05
updated: 2026-05-05
source: plan
status: active
scope: ["container/skills/memory/SKILL.md", "container/skills/memory/instructions.md"]
entry_criteria: "Phase 38 complete, context builder dual-read implemented"
exit_criteria: "Memory skill directs agents to memory_store MCP as primary write path; MEMORY.md documented as legacy read source; all tests passing"
---

# Phase 39: Memory Write Convergence

## Objective

Update the memory skill to direct agents to use memory_store (MCP) as the primary write path, treating MEMORY.md as a legacy read source. The context builder already reads from both stores (Phase 38).

## Scope

- `container/skills/memory/SKILL.md`
- `container/skills/memory/instructions.md`

## Exit Criteria

- [ ] Memory skill documents memory_store as primary write tool
- [ ] MEMORY.md documented as legacy (still read at spawn, agents stop writing to it)
- [ ] Cold start updated to use memory_store

## Notes

Documentation-only phase. No code changes. The dual-read context builder (Phase 38) already handles both sources.
