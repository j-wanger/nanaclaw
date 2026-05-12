# Project: nanaclaw

> Last updated: 2026-05-09 by /dev-plan

## Recommended Next Action

Phase 47 complete. Commit changes, restart service (`launchctl kickstart -k gui/$(id -u)/com.nanoclaw`), inform Nana about the new `end_session` MCP tool. Then run `/dev-plan` for Phase 48.

## Active Phase

**[[phase-47-autonomous-session-rotation|Phase 47: Autonomous Session Rotation]]** (status: complete, 100%)

Entry criteria: MET (session handover format designed by Nana, system action pattern proven)
Exit criteria: 5/5 met.
Progress: 100% (3/3 tasks done)

## Active Phase Contract

Phase: 47 - Autonomous Session Rotation
Tasks: 3 (2M + 1S, see tasks.md)
Transition: continue
Abort: if blocked >3 attempts, ask user: skip or abort

## Recent Decisions

| Decision | Confidence | Date |
|----------|------------|------|
| [[phase-47-autonomous-session-rotation-approach]] | high | 2026-05-09 |
| SDK Task for retrieval (ephemeral/stateless) over create_agent (persistent) | high | 2026-05-09 |
| One parameterized retriever template over per-wiki files | high | 2026-05-09 |
| Relax min-sources from 3 to 1 with explicit note for niche topics | medium | 2026-05-09 |

## Blockers and Open Questions

- ~~[planning] Retrieval subagent: SDK Task tool vs create_agent? (raised 2026-05-09)~~ resolved: SDK Task — retrieval is one-shot, no need for persistence
- ~~[planning] Retrieval subagent prompt design: per-wiki files or shared template? (raised 2026-05-09)~~ resolved: one parameterized template with per-wiki config injected at runtime
- ~~[planning] Curator minimum-sources guard: relax or flag? (raised 2026-05-09)~~ resolved: relax from 3 to 1 with explicit note in article

## Session Journal (last 5)

- [2026-05-09] [[2026-05-09-phase-47-autonomous-session-rotation-complete|Phase 47: Autonomous Session Rotation Complete]] — 3 tasks, end_session MCP tool + host delivery handler, resume_prompt re-wake, 382+383 tests
- [2026-05-08] [[2026-05-08-phase-45-ux-persona-curation-complete|Phase 45: UX, Persona, and Curation Fixes Complete]] — 6 tasks, SOUL.md lean baseline, per-group persona via CLAUDE.local.md, wiki-curator skill, PostCompact hook, 7 memory entries
- [2026-05-07] [[2026-05-07-phase-44-curated-article-embedding-complete|Phase 44: Curated Article Embedding Complete]] — 6 tasks, curated type in knowledge store, article index at spawn, 449+377 tests pass
- [2026-05-06] [[2026-05-06-phase-43-instruction-cleanup-complete|Phase 43: Instruction Cleanup Complete]] — 6 tasks, skill instruction updates, citation convention codified
- [2026-05-05] [[2026-05-05-knowledge-pipeline-redesign|Knowledge Pipeline Redesign Discussion]] — 2 decisions (pipeline design, citation convention), 5 discovered tasks for next phase

## Key Artifacts

| Path | Purpose | Last Modified |
|------|---------|---------------|
| memory_server/ | Standalone Python MCP server — 12 MCP tools, 186 tests | 2026-05-03 |
| container/agent-runner/src/mcp-tools/knowledge-tools.ts | knowledge_search + knowledge_embed + small-to-big expansion MCP tools | 2026-05-05 |
| container/agent-runner/src/mcp-tools/knowledge-vector-store.ts | Unified knowledge store — search, insert, getWindow, getByArticleSlug | 2026-05-05 |
| container/agent-runner/src/mcp-tools/research-fetch.ts | research_fetch — SearXNG → raw articles with Jina fallback | 2026-05-05 |
| container/skills/wiki-manager/ | Wiki management skill — updated instructions, routing, citation convention | 2026-05-08 |
| container/skills/wiki-curator/ | Wiki curation skill — taxonomy-first workflow, progress reporting, state tracking | 2026-05-08 |
| .claude/rules/session-continuity.md | Session state update triggers + compaction recovery instructions | 2026-05-08 |
| groups/dm-with-wang/CLAUDE.local.md | Full 毒舌小妹 persona for Telegram DM agent group | 2026-05-08 |
| container/agent-runner/src/providers/claude.ts | PostCompact hook writes session-state.md | 2026-05-08 |
| container/agent-runner/src/mcp-tools/session-end.ts | end_session MCP tool — agent self-terminates session | 2026-05-09 |
| src/modules/session-rotation/index.ts | Host delivery handler — kills container, injects resume_prompt | 2026-05-09 |
| src/delivery.ts | getDeliveryAction() export for test access to action registry | 2026-05-09 |

## Cross-References

- agentic-engineering-wiki — chunking-and-embedding-strategies, wiki-retrieval-architecture (contextual retrieval, small-to-big patterns)
- agent-memory-wiki — 2,005 raw articles, research base for memory architecture
- memory_server/ — standalone Python MCP server (Phases 29-32), SQLite + FTS5 + embedding + sidecar, 186 tests, 12 MCP tools
- Knowledge pipeline — deterministic: research_fetch → knowledge_embed → knowledge_search + knowledge_conflicts
- [[knowledge-pipeline-post-phase-42-design]] — articles as optional curated layer, sentence embeddings primary
- [[inline-citation-convention]] — frontmatter sources + inline [slug] markers for provenance
- ~/.claude/skills/knowledge-wiki/ — article conventions + content model updated Phase 43
- container/skills/wiki-curator/ — taxonomy-first curation workflow skill (Phase 45)
- [[per-group-persona-via-claude-local]] — SOUL.md shared baseline + per-group CLAUDE.local.md for full persona
- [[phase-47-autonomous-session-rotation-approach]] — end_session MCP tool + delivery handler for agent-initiated session rotation
