---
title: "Phase 10: Host-Mode Integration Tests"
aliases: [phase-10, host-mode-tests, integration-tests]
category: phases
tags: [testing, host-mode, regression, spawn-pipeline]
parents: [phase-08-operational-deployment, phase-09-prompt-reconciliation-hardening]
created: 2026-04-27
updated: 2026-04-27
source: plan
status: completed
scope: ["src/spawn-pipeline.test.ts", "src/session-roundtrip.test.ts", "src/delivery.test.ts", "groups/*/container.json", "groups/*/models.json"]
entry_criteria: "Phase 9 complete, system operational as daily driver"
exit_criteria: "Spawn pipeline vitest coverage, session DB round-trip vitest coverage, delivery action dispatch vitest coverage, all tests pass, config coherence for both groups"
---

# Phase 10: Host-Mode Integration Tests

## Objective

Add vitest coverage for the three critical host-mode data paths (spawn pipeline, session DB round-trip, delivery action dispatch) so the fork ships with automated regression confidence.

## Scope

- `src/spawn-pipeline.test.ts` — promoted from scripts/smoke-test.ts
- `src/session-roundtrip.test.ts` — two-DB IO surface
- `src/delivery.test.ts` — outbound action parsing + dispatch
- `groups/*/container.json`, `groups/*/models.json` — config coherence

## Exit Criteria

- [x] Spawn pipeline has vitest coverage (promoted from standalone script)
- [x] Session DB round-trip has vitest coverage (inbound write → outbound write → cross-read)
- [x] Delivery action dispatch has vitest coverage (outbound action parsing + mocked dispatch)
- [x] All tests pass (existing + new)
- [x] Both agent groups have valid, coherent configuration

## Notes

- Refinement phase: 3S + 1M tasks
- Tests use raw SQL (not session-manager helpers) to avoid migration side effects
- Delivery tests mock the adapter layer
- No E2E requiring running service, API credentials, or real bun spawn
