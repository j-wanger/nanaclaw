# Dev Wiki Index

## Modules

- [[src|src/]] — Host process core
- [[src-db|src/db/]] — Central DB layer
- [[src-channels|src/channels/]] — Channel adapter infra
- [[src-modules-permissions|src/modules/permissions/]] — Access control
- [[src-modules-approvals|src/modules/approvals/]] — Approval primitives
- [[src-modules-scheduling|src/modules/scheduling/]] — Task scheduling
- [[container-agent-runner-src|container/agent-runner/src/]] — Container runner core
- [[container-agent-runner-src-mcp-tools|container/agent-runner/src/mcp-tools/]] — MCP tools

## Files — Host Core

- [[src-index|index.ts]] — Entry point
- [[src-router|router.ts]] — Inbound routing
- [[src-delivery|delivery.ts]] — Outbound delivery
- [[src-session-manager|session-manager.ts]] — Session lifecycle
- [[src-container-runner|container-runner.ts]] — Container spawning
- [[src-host-sweep|host-sweep.ts]] — Periodic sweep
- [[src-container-runtime|container-runtime.ts]] — Runtime selection
- [[src-config|config.ts]] — Constants
- [[src-log|log.ts]] — Logger (hub)
- [[src-types|types.ts]] — Type definitions (hub)
- [[src-command-gate|command-gate.ts]] — Admin command gate
- [[src-response-registry|response-registry.ts]] — Handler registry
- [[src-claude-md-compose|claude-md-compose.ts]] — CLAUDE.md compose
- [[src-group-init|group-init.ts]] — Group filesystem scaffold
- [[src-container-config|container-config.ts]] — Container config
- [[src-env|env.ts]] — .env loading
- [[src-webhook-server|webhook-server.ts]] — Webhook HTTP
- [[src-platform-id|platform-id.ts]] — Platform ID normalization
- [[src-group-folder|group-folder.ts]] — Group folder paths
- [[src-state-sqlite|state-sqlite.ts]] — SQLite state helpers
- [[src-timezone|timezone.ts]] — Timezone detection
- [[src-install-slug|install-slug.ts]] — Install slug generation

## Files — Host DB

- [[src-db-connection|connection.ts]] — DB connection management
- [[src-db-schema|schema.ts]] — Reference schema
- [[src-db-session-db|session-db.ts]] — Session DB operations
- [[src-db-sessions|sessions.ts]] — Session CRUD
- [[src-db-agent-groups|agent-groups.ts]] — Agent group CRUD
- [[src-db-messaging-groups|messaging-groups.ts]] — Messaging group CRUD
- [[src-db-dropped-messages|dropped-messages.ts]] — Dropped message audit

## Files — Host Channels

- [[src-channels-adapter|adapter.ts]] — Channel adapter interface
- [[src-channels-channel-registry|channel-registry.ts]] — Adapter registry
- [[src-channels-cli|cli.ts]] — CLI channel
- [[src-channels-chat-sdk-bridge|chat-sdk-bridge.ts]] — Chat SDK bridge
- [[src-channels-ask-question|ask-question.ts]] — Question normalization

## Files — Host Modules

- [[src-modules-permissions-access|access.ts]] — Access control
- [[src-modules-permissions-index|permissions/index.ts]] — Gate registration
- [[src-modules-permissions-channel-approval|channel-approval.ts]] — Channel approval
- [[src-modules-permissions-sender-approval|sender-approval.ts]] — Sender approval
- [[src-modules-approvals-primitive|primitive.ts]] — Approval primitives
- [[src-modules-approvals-onecli-approvals|onecli-approvals.ts]] — OneCLI bridge
- [[src-modules-approvals-response-handler|response-handler.ts]] — Response dispatch
- [[src-modules-scheduling-actions|actions.ts]] — Scheduling handlers
- [[src-modules-scheduling-db|scheduling/db.ts]] — Task persistence
- [[src-modules-scheduling-recurrence|recurrence.ts]] — Cron parsing
- [[src-modules-scheduling-index|scheduling/index.ts]] — Handler registration
- [[src-modules-agent-to-agent-agent-route|agent-route.ts]] — Inter-agent routing
- [[src-modules-agent-to-agent-create-agent|create-agent.ts]] — Dynamic agent creation
- [[src-modules-self-mod-apply|apply.ts]] — Self-mod apply
- [[src-modules-self-mod-request|request.ts]] — Self-mod request
- [[src-modules-typing-index|typing/index.ts]] — Typing indicators
- [[src-providers-provider-container-registry|provider-container-registry.ts]] — Provider config

## Files — Container Core

- [[container-agent-runner-src-index|index.ts]] — Container entry
- [[container-agent-runner-src-poll-loop|poll-loop.ts]] — Main poll loop
- [[container-agent-runner-src-formatter|formatter.ts]] — Message formatting
- [[container-agent-runner-src-destinations|destinations.ts]] — Destination map
- [[container-agent-runner-src-config|config.ts]] — Container config

## Files — Container DB

- [[container-agent-runner-src-db-connection|connection.ts]] — Container DB connection
- [[container-agent-runner-src-db-messages-in|messages-in.ts]] — Read pending messages
- [[container-agent-runner-src-db-messages-out|messages-out.ts]] — Write outbound
- [[container-agent-runner-src-db-session-state|session-state.ts]] — State persistence
- [[container-agent-runner-src-db-session-routing|session-routing.ts]] — Reply routing

## Files — Container MCP Tools

- [[container-agent-runner-src-mcp-tools-core|core.ts]] — send/edit/react
- [[container-agent-runner-src-mcp-tools-scheduling|scheduling.ts]] — Task scheduling
- [[container-agent-runner-src-mcp-tools-agents|agents.ts]] — Agent management
- [[container-agent-runner-src-mcp-tools-interactive|interactive.ts]] — ask_user_question
- [[container-agent-runner-src-mcp-tools-self-mod|self-mod.ts]] — install/add MCP
- [[container-agent-runner-src-mcp-tools-deep-work|deep-work.ts]] — Deep work tools + auto-continuation check
- [[container-agent-runner-src-mcp-tools-server|server.ts]] — MCP server setup
- [[container-agent-runner-src-mcp-tools-types|types.ts]] — Tool types

## Files — Container Providers

- [[container-agent-runner-src-providers-claude|claude.ts]] — Claude SDK provider
- [[container-agent-runner-src-providers-factory|factory.ts]] — Provider factory
- [[container-agent-runner-src-providers-provider-registry|provider-registry.ts]] — Registration
- [[container-agent-runner-src-providers-types|types.ts]] — Provider interfaces

## Phases

- [[phase-00-fresh-fork-smoke-test|Phase 0: Fresh Fork + Smoke Test]] — completed
- [[phase-01a-memory-architecture-research|Phase 1a: Memory Architecture Research]] — completed
- [[phase-01b-memory-module|Phase 1b: Memory Module Implementation]] — completed
- [[phase-02-host-mode-runner|Phase 2: Host-Mode Agent Runner]] — **complete (pending smoke test)**
- [[phase-03a-qwen-experiments|Phase 3a: Qwen Worker Baseline Experiments]] — completed
- [[phase-03b-dispatch-module|Phase 3b: Dispatch Module Implementation]] — completed
- [[phase-03c-dispatch-iteration|Phase 3c: Dispatch Integration + Iteration]] — completed
- [[phase-04-voice-io|Phase 4: Voice I/O]] — completed
- [[phase-05-web-search-research|Phase 5: Web Search + Deep Research]] — completed
- [[phase-06a-worker-tool-calling|Phase 6a: Worker Tool-Calling Runtime]] — completed
- [[phase-06-autonomous-loops|Phase 6b: Research Loop + Episodic Integration]] — completed
- [[phase-07-hardening-wiki-bridge|Phase 7: Production Hardening + Wiki Bridge]] — completed
- [[phase-08-operational-deployment|Phase 8: Operational Deployment + E2E Validation]] — completed
- [[phase-09-prompt-reconciliation-hardening|Phase 9: Agent Prompt Reconciliation]] — completed
- [[phase-10-host-mode-integration-tests|Phase 10: Host-Mode Integration Tests]] — completed
- [[phase-11-host-mode-fragment-path-fix|Phase 11: Host-Mode Fragment Path Fix]] — completed
- [[phase-12-worker-research-reliability|Phase 12: Worker Research Reliability]] — completed
- [[phase-13-multi-stage-research-pipeline|Phase 13: Multi-Stage Research Pipeline]] — completed
- [[phase-14-unified-research-skill|Phase 14: Unified Research Skill]] — completed (partial, 2 tasks superseded by Phase 15)
- [[phase-15-iterative-research-pipeline|Phase 15: Iterative Research Pipeline]] — completed
- [[phase-16-research-session-reliability|Phase 16: Research Session Reliability]] — completed
- [[phase-17-message-batching-extraction-resilience|Phase 17: Message Batching + Research Extraction Resilience]] — completed
- [[phase-18-wiki-project-management-integration|Phase 18: Knowledge Wiki + Project Management Agent Integration]] — completed
- [[phase-19-worker-batching-article-validation|Phase 19: Worker Result Batching + Article Validation Gates]] — completed
- [[phase-20-summarize-pipeline-reliability|Phase 20: Summarize Pipeline Reliability]] — completed
- [[phase-21-source-triage-claim-extraction|Phase 21: Source Triage + Claim Extraction]] — completed
- [[phase-22-vector-claim-store|Phase 22: Vector Claim Store]] — completed
- [[phase-23-claim-backfill-e2e|Phase 23: Claim Backfill E2E]] — completed (1 task skipped)
- [[phase-24-deep-work-session-reliability|Phase 24: Deep Work Session Reliability]] — **complete (pending confirmation)**

## Decisions

- [[fresh-fork-over-v1-continuation|Fresh Fork over V1 Continuation]] — high confidence
- [[two-tier-heterogeneous-architecture|Two-Tier Heterogeneous Architecture]] — high confidence
- [[memory-architecture-decisions|Memory Architecture Decisions]] — high confidence
- [[phase-2-host-mode-approach|Phase 2 Host-Mode Approach]] — high confidence
- [[phase-1b-memory-approach|Phase 1b Memory Module Approach]] — high confidence
- [[phase-3a-experiment-approach|Phase 3a Experiment Approach]] — high confidence
- [[phase-3b-async-dispatch-approach|Phase 3b Async Container-Side Dispatch]] — high confidence
- [[phase-3c-host-routing-approach|Phase 3c Host-Side Model Routing]] — medium confidence
- [[phase-4-voice-io-approach|Phase 4: Voice I/O — Whisper Server + Edge TTS]] — medium confidence
- [[phase-5-web-search-approach|Phase 5: SearXNG + Readability + Dynamic Wiki Routing]] — medium confidence
- [[phase-6a-worker-tool-calling-approach|Phase 6a: Worker Tool-Calling via Multi-Turn Agent Loop]] — medium confidence
- [[phase-6b-research-loop-approach|Phase 6b: Worker-Driven Research Loops + Episodic Wiki]] — medium confidence
- [[phase-7-hardening-wiki-bridge-approach|Phase 7: Production Hardening + Wiki Bridge]] — medium confidence
- [[phase-8-operational-deployment-approach|Phase 8: Operational Deployment + E2E Validation]] — medium confidence
- [[phase-9-prompt-reconciliation-approach|Phase 9: Agent Prompt Reconciliation]] — medium confidence
- [[phase-10-host-mode-test-coverage-approach|Phase 10: Host-Mode Integration Tests]] — medium confidence
- [[phase-11-host-mode-fragment-path-fix|Phase 11: Host-Mode Fragment Path Fix]] — medium confidence
- [[phase-12-worker-research-reliability|Phase 12: Worker Research Reliability]] — medium confidence
- [[phase-13-multi-stage-research-pipeline|Phase 13: Multi-Stage Research Pipeline]] — medium confidence
- [[phase-14-unified-research-skill|Phase 14: Unified Research Skill]] — high confidence
- [[phase-15-iterative-research-pipeline|Phase 15: Iterative Research Pipeline]] — high confidence
- [[phase-16-research-session-reliability|Phase 16: Research Session Reliability]] — medium confidence
- [[phase-17-message-batching-extraction-resilience|Phase 17: Message Batching + Research Extraction Resilience]] — medium confidence
- [[phase-18-wiki-project-integration-approach|Phase 18: Wiki + Project Management Integration]] — medium confidence
- [[phase-19-worker-batching-validation-approach|Phase 19: Worker Result Batching + Article Validation]] — medium confidence
- [[phase-20-summarize-pipeline-approach|Phase 20: Summarize Pipeline Reliability]] — medium confidence
- [[phase-21-source-triage-claim-extraction-approach|Phase 21: Source Triage + Claim Extraction]] — medium confidence
- [[phase-22-vector-claim-store-approach|Phase 22: Vector Claim Store]] — medium confidence
- [[phase-23-claim-backfill-e2e-approach|Phase 23: Claim Backfill E2E]] — medium confidence
- [[phase-24-deep-work-session-reliability-approach|Phase 24: Deep Work Session Reliability]] — medium confidence

## Journal (recent)

- [2026-04-30] [[2026-04-30-phase-24-deep-work-session-reliability-complete|Phase 24 Complete]]
- [2026-04-30] [[2026-04-30-phase-23-claim-backfill-e2e-in-progress|Phase 23 In Progress]]
- [2026-04-30] [[2026-04-30-phase-22-vector-claim-store-complete|Phase 22 Complete]]

## Journal

- [2026-04-29] [[2026-04-29-phase-17-message-batching-extraction-resilience-complete|Phase 17: Message Batching + Extraction Resilience Complete]] — 6 tasks, accumulation window + Jina fallback + SearXNG, reviewer 9/10
- [2026-04-28] [[2026-04-28-phase-15-iterative-research-pipeline-complete|Phase 15: Iterative Research Pipeline Complete]] — 8 tasks, research_fetch + url-index + write_to + iterative skill, reviewer 7/10
- [2026-04-27] [[2026-04-27-phase-12-worker-research-reliability-complete|Phase 12: Worker Research Reliability Complete]] — 5 tasks, toolTrace + max_iterations + prompt routing, pipeline redesign needed
- [2026-04-27] [[2026-04-27-phase-11-host-mode-fragment-fix-complete|Phase 11: Fragment Path Fix Complete]] — 5 fixes, host-mode fully operational
- [2026-04-27] [[2026-04-27-phase-10-host-mode-integration-tests-complete|Phase 10: Integration Tests Complete]] — 4 tasks, 26 new tests, spawn pipeline + session DB + delivery
- [2026-04-27] [[2026-04-27-phase-9-prompt-reconciliation-complete|Phase 9: Prompt Reconciliation Complete]] — 5 tasks, memory conflict resolved, SOUL.md wired, reviewer 8/10

- [2026-04-27] [[2026-04-27-phase-8-operational-deployment-complete|Phase 8: Operational Deployment Complete]] — 6 tasks, 5 host-mode bugs fixed, full pipeline validated, reviewer 6/10→fixed
- [2026-04-26] [[2026-04-26-phase-6b-research-loop-complete|Phase 6b: Research Loop + Episodic Integration Complete]] — 6 tasks, episodic wiki tier + research-loop skill, reviewer 8/10
- [2026-04-26] [[2026-04-26-phase-5-web-search-complete|Phase 5: Web Search + Deep Research Complete]] — 5 tasks, 3 MCP tools + skill + pipeline test, reviewer 8/10
- [2026-04-26] [[2026-04-26-phase-2-implementation-complete|Phase 2 Implementation Complete]] — Tasks 3-8, host-mode + deep work, reviewer 9/10
- [2026-04-26] [[2026-04-26-phase-2-planning-and-scaffold|Phase 2 Planning and Scaffold]] — planned phase, revised approach, 2/8 tasks done
- [2026-04-25] [[2026-04-25-phase-1b-memory-implementation|Phase 1b Memory Module Implementation]] — planned + implemented memory module, 6 tasks, 36 new tests
- [2026-04-25] [[2026-04-25-phase-0-bootstrap-complete|Phase 0 Bootstrap Complete]] — fork + scan + plan + all tasks done + smoke test passed
- [2026-04-26] [[2026-04-26-phase-3b-dispatch-module-complete|Phase 3b: Dispatch Module Complete]] — 7 tasks, 73 tests, async dispatch + poll-loop auto-pickup, reviewer 8/10
- [2026-04-26] [[2026-04-26-phase-4-voice-io-complete|Phase 4: Voice I/O Complete]] — 5 tasks, STT + TTS, reviewer 7/10
- [2026-04-26] [[2026-04-26-phase-3c-dispatch-integration-complete|Phase 3c: Dispatch Integration Complete]] — 7 tasks, 10/10 E2E, routing + semaphore, reviewer 8/10
- [2026-04-26] [[2026-04-26-phase-3a-qwen-experiments-complete|Phase 3a: Qwen Experiments Complete]] — 12 experiments, 36/36 pass, thinking selective, 4K-8K context sweet spot
- [2026-04-26] [[2026-04-26-phase-7-hardening-wiki-bridge-complete|Phase 7: Production Hardening + Wiki Bridge Complete]] — 5 tasks, wiki-bridge + wiki_search + smoke test, reviewer 7/10
