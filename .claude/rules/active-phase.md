# Active Phase Context

Phase: 37 — Small-to-Big Retrieval
Objective: Add sentence-window expansion to knowledge_search — search at sentence level, return surrounding context from knowledge.db.
Status: Complete. 3/3 tasks done, 4/4 exit criteria met, 578/578 tests passing.
Scope: container/agent-runner/src/mcp-tools/knowledge-vector-store.ts, knowledge-tools.ts, *.test.ts
Key constraints: Window via knowledge.db ID ordering (no disk reads). Overlap merging for same-article matches. expand="none" default preserves backward compat.
Exit criteria: All met. expand param accepted, sentence window returns parent_text, overlap merging works, 578 tests passing.
Next: Option B 6-phase plan fully complete. Run /dev-plan for next work area.
