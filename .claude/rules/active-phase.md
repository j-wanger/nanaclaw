# Active Phase Context

Phase: 45 -- UX, Persona, and Curation Fixes
Objective: Fix 5 daily-use problems: robotic persona, silent curation, poor compaction recovery, confabulation, deflection on external references.
Status: Complete. 6/6 tasks done, 6/6 exit criteria met.
Scope: SOUL.md, container/skills/wiki-curator/, .claude/rules/session-continuity.md, claude.ts, wiki-manager/instructions.md, groups/dm-with-wang/CLAUDE.local.md
Key constraints: PostCompact hook exists in SDK (compact_summary field). session-state.md in container CWD .claude/rules/ (per-agent-group). Wiki curation is topic-driven, never source-driven.
Exit criteria: All met. Warm persona (lean baseline + per-group CLAUDE.local.md), wiki-curator skill, PostCompact hook, 7 memory entries, knowledge-wiki ref, v1 check.
Next: Commit and push, restart service. Plan Phase 46 or curate trading wiki with wiki-curator skill.
