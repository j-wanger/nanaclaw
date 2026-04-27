# Nanaclaw Memory Architecture: Full Design Answers

**Context:** These answers draw on three research sessions (agent memory landscape, Karpathy wiki implementations, and the five-gap analysis), examination of the knowledge-wiki repo (github.com/j-wanger/knowledge-wiki), the prior Nanaclaw architecture session covering MemU's v1 codebase (repository.ts, knowledge-repository.ts, context-builder.ts, salience.ts), and the upstream NanoClaw comparison. Hardware: M1 Max + 64GB unified RAM, Qwen 3.6 35B A3B Q6 via llama-cpp, Claude API.

---

## Summary of Architectural Defaults

| Decision | Answer | Evidence basis |
|----------|--------|----------------|
| Memory tiers | Operational (SQLite+FTS5, per-group) + Domain (knowledge-wiki, markdown+search index) | CoALA taxonomy, MIRIX, v1's dual-store |
| Always-on memory budget | ~1,500 tokens | Chroma Context Rot, Letta/Hermes defaults |
| Injection pattern | Frozen snapshot at spawn, never edited mid-session | Cache economics, Hermes #13631, OpenClaw #49700 |
| Compaction anchors | User preferences, decisions, open tasks, recent artifacts, original task framing | Anthropic guidance, Hermes pre-compaction flush |
| Wiki integration | Domain map at spawn (~500 tokens) + reactive search tool | GraphRAG community summaries, Self-RAG, HiRA |
| Retrieval scoring | Cosine similarity only, recency as tie-breaker | LongMemEval ablations, Mem0 architecture, MemU formula bugs |
| Worker context | 4 primitives (objective, output format, tool guidance, boundaries) + relevant wiki articles | Anthropic multi-agent research, D³MAS, MIRIX |
| Worker writeback | Pattern C: write artifact to wiki episodic/, return path + summary | Anthropic recommendation, token economics |
| Storage | Markdown source of truth + derived SQLite index | Knowledge-wiki pattern, Anthropic's file-based philosophy |
| Versioning | Git for markdown, sqlite3 backup for session DBs | Consistency with knowledge-wiki, diffability |
| Embedding model | fastembed nomic-embed-text on CPU for wiki only; FTS5 for operational memory | Scale-appropriate, no GPU contention |
| Cold start | 3-question seed + passive extraction + optional structured ingest | ChatGPT 96% passive rate, Microsoft HAX Pattern 10B |
| Latency budget | <500ms spawn, <2s reactive search | M1 Max local performance, SSD throughput |
| Episodic stores | Separate: session-level in memory module, research-level in wiki | Different lifecycles, different consumers |
| Cross-group sharing | is_global flags for operational memory, wiki registry for domain knowledge | v1 pattern, NanoClaw agent-group permissions |

---

## 1. Memory Architecture Pattern Selection

### Tiered memory architectures and tradeoffs

The field has converged on a taxonomy derived from the CoALA framework (Cognitive Architectures for Language Agents), with four canonical tiers: working memory (active context window), episodic memory (what happened), semantic memory (what's true), and procedural memory (how to do things).

**Letta/MemGPT:** Three tiers — core memory (always in system prompt, ~2,000 chars per block, editable via tools), recall memory (full message log, vector-searchable), archival memory (long-term vector store). OS-paging metaphor. Tradeoff: elegant but couples agent runtime to memory system.

**Zep/Graphiti:** Bi-temporal knowledge graph with BGE-m3 embeddings + BM25 + graph traversal + cross-encoder reranking. Best temporal correctness and audit trails. Requires Neo4j/FalkorDB + LLM calls on every ingestion. 94.8% DMR but single-session recall dropped 17.7%.

**Mem0:** Two-phase extract/update pipeline. LLM extracts atomic facts, classifies as ADD/UPDATE/DELETE/NOOP. Plain dense vector search. 26% improvement over ChatGPT comes from extraction quality, not retrieval scoring.

**MIRIX (arXiv 2507.07957):** Six tiers including Knowledge Vault for verbatim facts. 85.38% on LOCOMO vs Mem0's 62.47%.

**MemU v1:** Two tiers — episodic (SQLite + FTS5, content-hash dedup, access counting, salience) and knowledge (confidence levels, derived_from provenance, contradicted_by conflict tracking).

**Anthropic:** Deliberately file-based. Memory Tool gives view/create/str_replace/insert/delete/rename on /memories directory with client-side storage. Philosophy: transparent, inspectable, auditable.

### Operational memory vs domain knowledge

**Separate stores.** Boundary: "would this fact be true for a different user?"

- Yes → domain knowledge → knowledge-wiki (markdown articles, git-versioned, shared across agent groups)
- No → operational memory → memory module (MEMORY.md + SQLite, per-group, private to user)

### Retrieval by tier

- **Operational memory (500-2,000 entries):** FTS5 keyword search sufficient. Short factual entries with distinctive keywords.
- **Knowledge-wiki articles (hundreds to low thousands):** Hybrid BM25 + cosine similarity via Phase 2 search index.
- **Episodic session logs:** Filesystem listing + FTS5 for recent; embedding search via wiki index for older entries.

---

## 2. Context Injection Strategy

### Budget

**~1,500 tokens always-on. Hard ceiling 7,000 including domain knowledge.**

Evidence: Chroma Context Rot (July 2025) showed performance degrades non-uniformly with input length on all 18 models tested. Production convergence: Letta ~1K tokens, Hermes ~1,300, Mem0 ~1,800 average.

### Static vs dynamic

**Static (frozen snapshot at spawn).** Dynamic approach is empirically unjustified and cache-hostile. Single mid-session edit invalidates entire prompt cache. Hermes #13631 documents Honcho's mid-conversation rewrites invalidating KV cache. OpenClaw #49700 reports ~10% cache hit rate with dynamic system prompt.

### Compaction survival

Universal anchors: user preferences/corrections, architectural decisions, open tasks/blockers, recently touched artifacts, unresolved errors, original task framing. Memory module produces compaction-safe anchor (~500 tokens, pre-ranked by context builder).

---

## 3. Knowledge-Wiki Integration

### Discovery

Via multi-wiki registry (`~/.claude/wikis.json` or `~/.knowledge-wiki/registry.json`). Per-agent-group config specifies `wiki_access` list.

### Retrieval flow

**Hybrid: domain map at spawn (proactive) + reactive search mid-session.**

At spawn: read each wiki's index.md → extract hierarchy roots → compress to ~300-500 tokens. Mid-session: agent calls wiki-search tool for specific queries. Domain map primes agent to recognize knowledge gaps.

### Episodic stores

**Separate.** Session-level episodic (memory module, SQLite, per-group, weeks-to-months lifecycle) vs research-level episodic (knowledge-wiki, markdown, fed to consolidation pipeline, retained indefinitely).

---

## 4. Local Worker Context

### What workers need

**Minimal.** Objective, output format, tool/source guidance, clear task boundaries. NOT user preferences, conversation history, or full memory. Orchestrator fetches relevant wiki articles before dispatch, includes in contract.

### Worker writeback

**Pattern C:** Workers write to knowledge-wiki episodic/, return path + summary to orchestrator. Workers do NOT update operational memory. Orchestrator is gatekeeper for operational memory.

---

## 5. Salience and Retrieval

### MemU's formula

**Do not port.** `similarity × log(access_count + 1) × recency_decay` — log(1)=0 bug zeros out never-accessed memories, no ablation study validates multi-factor scoring, Mem0's wins come from extraction not scoring, LongMemEval found no benefit from scoring formulas.

**Replacement:** Cosine similarity + fact-augmented keys + time-aware filtering + recency tie-breaking.

---

## 6. Persistence and Storage

### Hybrid approach

Markdown source of truth for human-readable/git-versionable data. SQLite as derived index for programmatic access. Principle: if a human might read/edit/diff it → markdown. If purely machine state → SQLite.

---

## 7. Karpathy Wiki Pattern

### Implementation landscape

8+ implementations examined. Knowledge-wiki (j-wanger) is most sophisticated: 11 skills, Analyst→Writer→Reviewer pipeline, source-credibility verifier, multi-wiki registry. Common failure: index.md breaks at 150-500 articles (Phase 2 search index solves this).

---

## 8. Practical Constraints

- **Embedding model:** fastembed nomic-embed-text on CPU for wiki only. No embeddings for operational memory.
- **Cold start:** 3-question seed + passive extraction. No heavy onboarding.
- **Latency:** <500ms spawn (MEMORY.md read + FTS5 + composition), <2s reactive wiki search.
