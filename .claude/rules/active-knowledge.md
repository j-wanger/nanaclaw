# Active Knowledge
## Phase: 7 - Production Hardening + Wiki Bridge

### Wiki Retrieval Scaling
from: [[wiki:wiki-retrieval-architecture]]
retrieved: 2026-04-26

- <200 articles: index-first (LLM reads index.md, routes). Breaks at ~80-100 articles empirically.
- 200-500 articles: hybrid BM25 + vector search + RRF fusion. Local embedding model required.
- Keyword scoring is the third fallback tier when no search index exists at all.
- User's wikis: aml-wiki 279 articles (past index-first), agentic-engineering 184, database 50.

### Context Budget Discipline
from: [[wiki:context-rot-and-production-responses]]
retrieved: 2026-04-26

- Fill past ~40% context = "dumb zone" — attention fragments, reliability decays
- Production response: frozen snapshot at spawn + just-in-time retrieval mid-session
- Memory fragment (~1500 tokens) + wiki domain map (~500/wiki) must stay within budget

### Existing Memory Fragment Pattern
from: [[decision:phase-1b-memory-approach]]
retrieved: 2026-04-26

- MEMORY.md source of truth, derived FTS5 index, frozen at spawn
- Writes .claude-fragments/memory-context.md (separate from CLAUDE.md)
- generateMemoryFragment called in both buildMounts and wakeHostRunner paths
- Wiki-bridge follows same pattern: separate fragment, same callsite, try/catch wrap
