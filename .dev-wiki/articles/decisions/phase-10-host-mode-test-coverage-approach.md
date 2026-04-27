---
title: "Phase 10: Host-Mode Integration Tests Approach"
aliases: [phase-10-approach, host-mode-tests, integration-tests]
category: decisions
tags: [testing, host-mode, regression, spawn-pipeline]
parents: [phase-10-host-mode-integration-tests]
created: 2026-04-27
updated: 2026-04-27
source: plan
confidence: medium
---

## Context

Phases 0-9 delivered the full feature set and validated it manually (Phase 8 E2E, Phase 9 prompt reconciliation). The fork has 332 passing tests across 33 test files, but the critical host-mode data paths — spawn pipeline integration, session DB round-trip, and delivery polling — are only covered by a standalone smoke-test script outside the vitest suite. Before shipping (git push + live restart), automated coverage for these paths gives regression confidence.

## Decision

**Promote and extend the existing smoke-test into vitest, add session DB round-trip and delivery tests.** Lean refinement phase (3S + 1M tasks).

### Track A: Promote smoke-test to vitest
Convert `scripts/smoke-test.ts` into `src/spawn-pipeline.test.ts`. It already exercises composeGroupClaudeMd → generateMemoryFragment → generateWikiContext → buildHostRunnerEnv with temp fixtures. Moving it into vitest means it runs on every `pnpm vitest run`.

### Track B: Session DB round-trip test
Create temp inbound.db + outbound.db, write a message via host session-manager helpers, verify it's readable from the agent-runner side. Write an outbound message, verify delivery can read it. Covers the two-DB IO surface.

### Track C: Delivery action dispatch test
Verify outbound messages with system actions (schedule_message, approval responses) are correctly parsed and dispatched by the delivery module's action handlers.

### Track D: Build verification + config coherence
Full build, all tests, verify both agent groups have valid container.json (provider:host), models.json with reachable endpoints.

**Rejected alternatives:**
- *Full E2E tests with running service:* Rejected — requires API credentials at test time, disproportionate infra for a personal project.
- *Router integration tests:* Rejected — router depends on full DB + adapter stack; smoke-test coverage is sufficient for now.
- *Container-runner spawn tests:* Rejected — spawning real bun processes needs API credentials.

## Consequences

- Spawn pipeline regression is caught by `pnpm vitest run` (currently only by manual `npx tsx scripts/smoke-test.ts`)
- Session DB IO surface has explicit coverage — changes to inbound/outbound schema or pragma changes will fail tests
- The standalone smoke-test.ts can be removed or left as a manual diagnostic tool
- Config coherence check is a one-time task, not an ongoing test
