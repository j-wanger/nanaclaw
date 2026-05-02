# Project: nanaclaw

> Last updated: 2026-05-01 by /dev-debrief

## Recommended Next Action

Phase 27 complete (6/6 tasks). All exit criteria met. Run `/dev-plan` for Phase 28 — consider: chunked conflict search optimization, entity resolution + knowledge graph, or live validation E2E testing.

## Active Phase

**[[phase-27-conflict-detection-claim-discovery|Phase 27: Conflict Detection + Claim Discovery]]** (status: active)

Exit criteria: 0/6 met
Progress: ~0% (0/6 tasks done)

## Active Phase Contract

Phase: 27 - Conflict Detection + Claim Discovery
Tasks: 6 (see tasks.md)
Transition: fresh-session
Abort: if blocked >3 attempts, ask user: skip or abort

## Recent Decisions

| Decision | Confidence | Date |
|----------|------------|------|
| [[phase-27-conflict-detection-claim-discovery-approach]] | medium | 2026-05-01 |
| [[phase-26-sentence-embedding-store-approach]] | medium | 2026-05-01 |
| [[phase-25-session-resume-entity-extraction-approach]] | medium | 2026-05-01 |

## Blockers and Open Questions

- ~~[planning] Qwen3 tool-calling format reliability unknown — experiments will determine approach (raised 2026-04-26)~~ resolved: Phase 6a experiments passed, OpenAI function_call format works
- ~~[planning] dispatch_worker MCP tool handler does not wire `tools` field to contract — workers silently run single-shot (raised 2026-04-26, Task 1 of Phase 6b)~~ resolved: Phase 6b Task 1
- ~~[planning] wiki-bridge: search.py location discovery — WIKI_TOOLS_DIR env var or convention? (raised 2026-04-26)~~ resolved: WIKI_TOOLS_DIR env var, propagates via process.env spread in host-mode
- ~~[planning] OneCLI CA cert availability in host-mode Bun process — proxy works but cert injection unknown (raised 2026-04-26)~~ resolved: OneCLI proxy works in host mode (agent received Claude API access)
- ~~[planning] SearXNG not yet installed — required for research loop E2E (raised 2026-04-26)~~ resolved: SearXNG installed via Docker on port 8888
- ~~[planning] Fragment symlinks point to Docker /app/... paths in host-mode — agent can't read skill/module instructions (raised 2026-04-27)~~ resolved: Phase 11 (5 fixes: symlink paths, bun path, idle worker check, env vars, fragment imports)
- ~~[planning] llama-cpp multi-instance hosting — `--parallel N` flag or secondary 8B model for concurrent research workers (raised 2026-04-27)~~ resolved: Phase 13 — server already has 4 slots, max_concurrent updated to 4
- ~~[implementation] Worker step-repetition: Qwen workers consistently fail to transition from search/extract to wiki_write within timeout (raised 2026-04-27, Phase 13 live test)~~ resolved: Phase 15 — removed LLM from search/extract, workers only do cognitive tasks (summarize, review)
- ~~[implementation] checkWorkerResults poll-loop pickup: result files not cleaned up after worker completion (raised 2026-04-27, Phase 13 live test)~~ resolved: Phase 15 — compact result injection, write_to post-processing handles file routing
- ~~[implementation] Review stage inert: findRawSource() in research-review.ts matches by source_url in episodic frontmatter, but writeEpisodicArticle() never writes source_url — review workers are silently skipped (raised 2026-04-28, Phase 15 reviewer)~~ resolved: Phase 16 Task 4 — source_url propagated through WriteTo interface

## Key Artifacts

| Path | Purpose | Last Modified |
|------|---------|---------------|
| container/agent-runner/src/mcp-tools/knowledge-vector-store.ts | Unified knowledge.db — claims + sentences, chunked search, article_slug index | 2026-05-01 |
| container/agent-runner/src/mcp-tools/knowledge-conflicts.ts | Cross-article conflict detection (findArticleConflicts, findQueryConflicts) | 2026-05-01 |
| container/agent-runner/src/mcp-tools/knowledge-discovery.ts | Claim discovery by similarity (discoverClaimsInArticle) | 2026-05-01 |
| container/agent-runner/src/mcp-tools/knowledge-classify.ts | Qwen worker classification (conflict pairs + claim validation) | 2026-05-01 |
| container/agent-runner/src/mcp-tools/knowledge-analysis-tools.ts | knowledge_conflicts + claim_discover MCP tools | 2026-05-01 |

## Session Journal (last 5)

- [2026-05-01] [[2026-05-01-phase-27-conflict-detection-claim-discovery-complete|Phase 27: Conflict Detection + Claim Discovery Complete]] — 6 tasks, 4 new modules, 2 MCP tools, +39 tests, 491 total
- [2026-05-01] [[2026-05-01-phase-26-unified-knowledge-vector-store-complete|Phase 26: Unified Knowledge Vector Store Complete]] — 6 tasks, unified store + sentence embedding, +34 tests, 452 total
- [2026-05-01] [[2026-05-01-phase-25-session-resume-entity-extraction-complete|Phase 25: Session Resume + Entity Extraction Complete]] — 6 tasks, init timeout + entity pipeline, +16 tests
- [2026-04-30] [[2026-04-30-phase-24-deep-work-session-reliability-complete|Phase 24: Deep Work Session Reliability Complete]] — 4 tasks, 3 poll-loop bugs fixed, +8 tests
- [2026-04-30] [[2026-04-30-phase-23-claim-backfill-e2e-in-progress|Phase 23: Claim Backfill E2E In Progress]] — 5/6 tasks, embedding server up

## Cross-References

- agentic-engineering-wiki — chunking-and-embedding-strategies, wiki-knowledge-graph-architectures, rag-evaluation-and-quality-metrics
- aml-wiki — entity modeling, adverse media screening NER patterns
- <wiki>/knowledge.db — unified vector store (claims + sentences, Phase 26)
- <wiki>/claims.jsonl + entities.jsonl — JSONL stores (extraction output)
- knowledge-conflicts.ts / knowledge-discovery.ts — Phase 27 analytical tools on knowledge.db
