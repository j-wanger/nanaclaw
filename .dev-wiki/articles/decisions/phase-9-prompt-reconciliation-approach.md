---
title: "Phase 9: Agent Prompt Reconciliation Approach"
aliases: [phase-9-approach, prompt-reconciliation, memory-conflict-fix]
category: decisions
tags: [prompts, memory, host-mode, composition, personality]
parents: [phase-09-prompt-reconciliation-hardening]
created: 2026-04-27
updated: 2026-04-27
source: plan
confidence: medium
---

## Context

Phase 8 validated the full message pipeline E2E. The agent is operational but its prompt stack has contradictions that degrade daily use:

1. **Memory authority conflict.** `container/CLAUDE.md` (upstream base) has a "Memory" section telling the agent to use `CLAUDE.local.md` as primary memory and create ad-hoc file systems for organizing information. The memory skill (`container/skills/memory/instructions.md`) tells the agent to use `memory/MEMORY.md` with structured 4-type entries (user/feedback/project/reference) and FTS5 indexing. Both load simultaneously. The skill's "Coexistence with CLAUDE.local.md" note is too weak to override the base's emphatic instructions.

2. **SOUL.md dead code.** Phase 0 created SOUL.md with agent personality, but it's not imported by the composition pipeline (`claude-md-compose.ts`). Personality is manually duplicated in each group's CLAUDE.local.md.

3. **Docker paths in host mode.** Base CLAUDE.md references `/workspace/agent/` (Docker mount point) and `conversations/` — incorrect in host mode where workspace is `NANOCLAW_AGENT_DIR`.

## Decision

**Fork-owned rewrite of `container/CLAUDE.md`** — the user confirmed the fork is treated as a new project (no upstream update-nanoclaw planned), so we own the base prompt fully.

### Track A: Rewrite container/CLAUDE.md
- Remove the Memory section entirely. Memory is handled exclusively by the memory skill fragment.
- Replace Workspace section with path-agnostic language ("your workspace" not `/workspace/agent/`).
- Add `@SOUL.md` import so personality is universal across all groups.
- Clarify CLAUDE.local.md's role: group-specific config and personality overrides only.
- Keep Communication section. Update conversation history reference to be path-agnostic.

### Track B: Strengthen memory skill instructions
- Remove the "Coexistence" hedging — the base no longer competes.
- Add conversation history search guidance (when to check conversations/ vs MEMORY.md).

### Track C: Composition pipeline
- Add SOUL.md as a fragment source in `claude-md-compose.ts` (symlink like skills).
- Clean up CLAUDE.local.md per group to contain only personality overrides.

### Track D: Verification
- Compose-check script: resolve all @imports, validate no contradictory memory instructions, check all referenced paths resolve, estimate token budget.
- E2E: agent stores memory in MEMORY.md not CLAUDE.local.md.

**Rejected alternatives:**
- *Override via fragment only (keep upstream base untouched)*: Rejected because the user confirmed fork ownership. Fragment overrides leave the contradictory base visible to the agent.
- *Remove CLAUDE.local.md entirely*: Rejected. CLAUDE.local.md is auto-loaded by Claude Code and useful for per-group personality overrides and freeform config.

## Consequences

- `container/CLAUDE.md` is fully fork-owned. Any upstream changes to this file are ignored.
- The memory skill becomes the single source of truth for memory instructions.
- SOUL.md changes propagate to all groups automatically at next spawn.
- CLAUDE.local.md scope narrows: personality overrides and group config only.
