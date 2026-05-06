---
title: "Phase 42: Pipeline Simplification"
aliases: [pipeline-simplification]
category: phases
tags: [pipeline, simplification, deletion, cleanup]
parents: []
created: 2026-05-05
updated: 2026-05-05
source: plan
status: completed
scope: ["container/agent-runner/src/mcp-tools/*.ts", "container/skills/**", "groups/dm-with-wang/.claude-fragments/*"]
entry_criteria: "Phase 41 complete, all prior pipeline tools confirmed superseded by sentence embedding pipeline"
exit_criteria: "Old pipeline tools deleted, barrel imports updated, skill docs updated, stale wiki data cleared, all tests pass"
---

# Phase 42: Pipeline Simplification

## Objective

Remove the old Qwen-dependent summarization pipeline and all claim provenance tools, leaving only the deterministic embedding pipeline (research_fetch → knowledge_embed → knowledge_search + knowledge_conflicts).

## Scope

Files and modules affected:
- `container/agent-runner/src/mcp-tools/` — delete ~15 source + ~8 test files, modify index.ts, knowledge-analysis-tools.ts, knowledge-classify.ts, dispatch.ts, contract.ts, sentence-embed-pipeline.ts
- `container/skills/research/` — update SKILL.md, instructions.md, delete prompt files
- `container/skills/wiki-manager/` — update knowledge-routing.md
- `groups/dm-with-wang/.claude-fragments/` — update skill-research.md, skill-wiki-manager.md
- `/Users/jwang/private-knowledge/*/` — clear stale data (episodic/, articles/, claims.jsonl, etc.)

## Exit Criteria

- [ ] Old pipeline tool source + test files deleted
- [ ] Barrel imports in index.ts updated
- [ ] knowledge-analysis-tools.ts: claim_discover removed, knowledge_conflicts kept
- [ ] knowledge-classify.ts: claim validation functions removed, conflict classification kept
- [ ] dispatch.ts: claim/insight/entity extraction stripped
- [ ] contract.ts: WriteTo.tier narrowed to episodic|review
- [ ] claim-store.ts + entity-store.ts deleted, types inlined
- [ ] Skill documentation + .claude-fragments updated
- [ ] Stale wiki data cleared across all wikis
- [ ] Container + host tests pass

## Notes

Driven by Nana (orchestrator), implemented via Claude Code worker. Approach reviewed at 7/10 — two issues caught and incorporated (dispatch.ts extraction branches, knowledge-classify.ts dependency on knowledge-discovery.ts). Plan reviewed at 7/10 — additional issues caught (contract.ts WriteTo narrowing, knowledge-classify.ts cleanup, exhaustive test file list).
