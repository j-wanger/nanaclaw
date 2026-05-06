# Active Phase Context

Phase: 43 -- Knowledge Pipeline Instruction Cleanup
Objective: Remove stale references to deleted claim tools and Qwen-dependent pipeline from all skill instruction files. Codify inline citation convention.
Scope: container/skills/wiki-manager/*, ~/.claude/skills/knowledge-wiki/*
Key constraints: No code changes — documentation/instruction updates only. 6 tasks, all size S.
Exit criteria: Zero grep matches for deleted tool names (claim_*, research_summarize, research_review, wiki-consolidate) across all skill instruction files. Inline citation convention documented.
Abort: if blocked >3 attempts on any task, ask user: skip or abort.
