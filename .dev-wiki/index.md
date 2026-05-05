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
- [[phase-02-host-mode-runner|Phase 2: Host-Mode Agent Runner]] — completed
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
- [[phase-14-unified-research-skill|Phase 14: Unified Research Skill]] — completed (partial)
- [[phase-15-iterative-research-pipeline|Phase 15: Iterative Research Pipeline]] — completed
- [[phase-16-research-session-reliability|Phase 16: Research Session Reliability]] — completed
- [[phase-17-message-batching-extraction-resilience|Phase 17: Message Batching + Research Extraction Resilience]] — completed
- [[phase-18-wiki-project-management-integration|Phase 18: Knowledge Wiki + Project Management Agent Integration]] — completed
- [[phase-19-worker-batching-article-validation|Phase 19: Worker Result Batching + Article Validation Gates]] — completed
- [[phase-20-summarize-pipeline-reliability|Phase 20: Summarize Pipeline Reliability]] — completed
- [[phase-21-source-triage-claim-extraction|Phase 21: Source Triage + Claim Extraction]] — completed
- [[phase-22-vector-claim-store|Phase 22: Vector Claim Store]] — completed
- [[phase-23-claim-backfill-e2e|Phase 23: Claim Backfill E2E]] — completed (1 task skipped)
- [[phase-24-deep-work-session-reliability|Phase 24: Deep Work Session Reliability]] — completed
- [[phase-25-session-resume-entity-extraction|Phase 25: Session Resume Guard + Entity Extraction Pipeline]] — completed
- [[phase-26-unified-knowledge-vector-store|Phase 26: Unified Knowledge Vector Store]] — completed
- [[phase-27-conflict-detection-claim-discovery|Phase 27: Conflict Detection + Claim Discovery]] — completed
- [[phase-28-insight-extraction|Phase 28: Insight Extraction]] — completed
- [[phase-29-memory-mcp-core|Phase 29: Memory MCP Server — Core Storage + Tools]] — completed
- [[phase-30-memory-mcp-embeddings|Phase 30: Memory MCP Server — Embeddings + Claude Code]] — completed
- [[phase-31-memory-mcp-sidecar|Phase 31: Memory MCP Server — Sidecar + Trust Lifecycle]] — completed
- [[phase-32-memory-mcp-integration|Phase 32: Memory MCP Server — Nanaclaw + Consolidation]] — completed
- [[phase-33-claim-markers-contextual-embeddings|Phase 33: Claim Markers + Contextual Sentence Embeddings]] — completed
- [[phase-34-claim-linker|Phase 34: Claim Linker]] — completed
- [[phase-35-claim-conflict-detection|Phase 35: Claim Conflict Detection]] — completed
- [[phase-36-claim-reconciliation|Phase 36: Claim Reconciliation]] — completed
- [[phase-37-small-to-big-retrieval|Phase 37: Small-to-Big Retrieval]] — completed
- [[phase-38-review-remediation|Phase 38: Review Remediation]] — completed

## Decisions

- [[fresh-fork-over-v1-continuation|Fresh Fork over V1 Continuation]] — high confidence
- [[two-tier-heterogeneous-architecture|Two-Tier Heterogeneous Architecture]] — high confidence
- [[memory-architecture-decisions|Memory Architecture Decisions]] — high confidence
- [[memory-mcp-server-architecture|Memory MCP Server Architecture]] — high confidence
- [[phase-28-insight-extraction-approach|Phase 28: Insight Extraction]] — medium confidence
- [[phase-27-conflict-detection-claim-discovery-approach|Phase 27: Conflict Detection + Claim Discovery]] — medium confidence
- [[phase-26-sentence-embedding-store-approach|Phase 26: Unified Knowledge Vector Store]] — medium confidence
- [[phase-25-session-resume-entity-extraction-approach|Phase 25: Session Resume + Entity Extraction]] — medium confidence
- [[phase-36-claim-reconciliation-approach|Phase 36: Claim Reconciliation]] — medium confidence
- [[phase-35-claim-conflict-detection-approach|Phase 35: Claim Conflict Detection]] — medium confidence
- [[phase-34-claim-linker-approach|Phase 34: Claim Linker]] — medium confidence
- [[phase-38-review-remediation-approach|Phase 38: Review Remediation]] — medium confidence
- [[phase-37-small-to-big-retrieval-approach|Phase 37: Small-to-Big Retrieval]] — high confidence
- [[phase-33-claim-markers-contextual-embeddings-approach|Phase 33: Claim Markers + Contextual Embeddings]] — medium confidence
- [[phase-32-nanaclaw-consolidation-approach|Phase 32: Nanaclaw + Consolidation]] — medium confidence
- [[phase-24-deep-work-session-reliability-approach|Phase 24: Deep Work Session Reliability]] — medium confidence

## Journal (recent 10)

- [2026-05-05] [[2026-05-05-phase-38-review-remediation-complete|Phase 38: Review Remediation Complete]] — 7 tasks, search routing + dedup + taxonomy + dual-read, reviewer 6/10→fixed
- [2026-05-05] [[2026-05-05-phase-37-small-to-big-retrieval-complete|Phase 37: Small-to-Big Retrieval Complete]] — 3 tasks, sentence-window expansion + overlap merge, 12 new tests (578 total)
- [2026-05-04] [[2026-05-04-phase-35-claim-conflict-detection-complete|Phase 35: Claim Conflict Detection Complete]] — 6 tasks, claim_conflicts MCP tool + 3 vectors, 22 new tests, reviewer 8/10
- [2026-05-04] [[2026-05-04-phase-34-claim-linker-complete|Phase 34: Claim Linker Complete]] — 6 tasks, claim_link MCP tool + NLI pipeline, 23 tests, reviewer 7/10→fixed
- [2026-05-04] [[2026-05-04-phase-33-claim-markers-contextual-embeddings-complete|Phase 33: Claim Markers + Contextual Sentence Embeddings Complete]] — 7 tasks, claim provenance convention + contextual prefix upgrade
- [2026-05-03] [[2026-05-03-phase-32-memory-mcp-nanaclaw-consolidation-complete|Phase 32: Memory MCP Server — Nanaclaw + Consolidation Complete]] — 6 tasks, consolidation + migration + prune + global fan-out + MCP wiring, 186 tests, reviewer 8/10
- [2026-05-03] [[2026-05-03-phase-31-memory-mcp-sidecar-complete|Phase 31: Memory MCP Server — Sidecar + Trust Lifecycle Complete]] — 6 tasks, sidecar verifier + contradiction tracking + extractor, 157 tests, reviewer 9/10
- [2026-05-03] [[2026-05-03-phase-30-memory-mcp-embeddings-complete|Phase 30: Memory MCP Server — Embeddings + Claude Code Complete]] — 6 tasks, embedding search + RRF fusion + export/import + Claude Code rules, 130 tests, reviewer 7/10→fixed
- [2026-05-03] [[2026-05-03-phase-29-memory-mcp-core-complete|Phase 29: Memory MCP Server Complete]] — 6 tasks, Python MCP server, 62 tests, reviewer 8/10
- [2026-05-01] [[2026-05-01-phase-27-conflict-detection-claim-discovery-complete|Phase 27: Conflict Detection + Claim Discovery Complete]]
- [2026-05-01] [[2026-05-01-phase-26-unified-knowledge-vector-store-complete|Phase 26: Unified Knowledge Vector Store Complete]]
- [2026-05-01] [[2026-05-01-phase-25-session-resume-entity-extraction-complete|Phase 25: Session Resume + Entity Extraction Complete]]
- [2026-04-30] [[2026-04-30-phase-24-deep-work-session-reliability-complete|Phase 24: Deep Work Session Reliability Complete]]
- [2026-04-30] [[2026-04-30-phase-23-claim-backfill-e2e-in-progress|Phase 23: Claim Backfill E2E In Progress]]
- [2026-04-30] [[2026-04-30-phase-22-vector-claim-store-complete|Phase 22: Vector Claim Store Complete]]
- [2026-04-30] [[2026-04-30-phases-18-21-knowledge-pipeline-overhaul|Phases 18-21: Knowledge Pipeline Overhaul]]
- [2026-04-29] [[2026-04-29-phase-17-message-batching-extraction-resilience-complete|Phase 17: Message Batching + Extraction Resilience Complete]]
