---
title: "Phase 0: Fresh Fork + Smoke Test"
aliases: [phase-0, smoke-test]
category: phases
tags: [setup, verification]
parents: []
created: 2026-04-25
updated: 2026-04-25
source: plan
status: active
scope: ["SOUL.md", "AGENTS.md", "CLAUDE.md", ".gitignore", "scripts/*"]
entry_criteria: "Upstream NanoClaw repo accessible"
exit_criteria: "Fork builds, tests pass, CLI smoke test succeeds, SOUL.md + AGENTS.md exist"
---

# Phase 0: Fresh Fork + Smoke Test

## Objective

Establish a clean fork of upstream NanoClaw v2.0.13, verify it builds and runs end-to-end, and create project-level identity files (SOUL.md, AGENTS.md).

## Scope

- Build verification: `pnpm install`, `pnpm run build`, `pnpm test`
- Project identity: SOUL.md (agent personality), AGENTS.md (dev conventions)
- Fork conventions: CLAUDE.md updates
- Smoke test: CLI channel end-to-end message

## Exit Criteria

- [x] Fork created and cloned
- [x] Dev-wiki initialized and scanned
- [ ] `pnpm install` completes without errors
- [ ] `pnpm run build` produces no TypeScript errors
- [ ] `pnpm test` passes (document pre-existing failures)
- [ ] CLI smoke test: send "hello", receive non-empty response within 60s
- [ ] SOUL.md exists at project root, <50 lines
- [ ] AGENTS.md exists at project root

## Notes

Fork is j-wanger/nanaclaw. Upstream is qwibitai/nanoclaw v2.0.13 (1131 commits). Two runtimes: Node host (pnpm) + Bun container. Dev-wiki already has 8 module + 72 file articles from /dev-scan.
