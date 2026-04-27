---
title: "Phase 3c: Host-Side Model Routing + E2E Validation"
aliases: [model-routing, multi-model-dispatch, host-routing]
category: decisions
tags: [local-worker, dispatch, architecture, multi-model]
parents: [phase-03c-dispatch-iteration]
created: 2026-04-26
updated: 2026-04-26
source: plan
confidence: medium
---

## Context

Phase 3b delivered container-side dispatch (MCP tools, fire-and-forget, T0 verification, poll-loop pickup). All tested with mocks — never run against real llama-cpp. Phase 3b decision deferred host-side coordination to 3c.

User has M1 Max 64GB. Currently running Qwen 3.6 35B-A3B (22.3GB). Remaining ~34GB supports a second smaller model. Task complexity varies: research/extraction tasks don't need 35B; a 7B model handles them at 3-5x throughput with equivalent quality.

## Decision

Host-side model registry + container-side routing. Two-layer design:

**Host** (`src/modules/local-worker/`):
- Model registry: loads per-group `models.json` with model configs (url, max_concurrent, capabilities, task_types)
- Health monitor: periodic /health ping, logs stale endpoints
- Config injection: writes routing config into container.json at spawn time

**Container** (updates to `container/agent-runner/src/mcp-tools/local-worker/`):
- Routing table: task type → model endpoint from injected config
- Per-endpoint concurrency semaphore (max_concurrent from config, default 1)
- dispatch.ts uses routed URL instead of hardcoded LLAMA_CPP_URL

Chose this over pure host-side orchestration because: per-request DB round-trips add latency, container already owns dispatch logic (3b decision), routing is a lookup not coordination. Host owns config + health; container owns execution.

Single-model config is valid and tested first. Multi-model is a config change, not code change.

## Consequences

- Adding a second model requires only a models.json edit + `launchctl restart`
- Container dispatch picks endpoint by task type automatically
- Concurrency semaphore prevents overwhelming single-threaded llama-cpp
- Health monitoring catches stale/crashed model servers
- E2E validation confirms pipeline works against real llama-cpp before any prompt tuning
