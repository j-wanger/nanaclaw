# Active Phase Context

Phase: 46 -- Domain Retrieval Subagents + Curator Improvements
Objective: WS1: 4 curator improvements (landscape sampling, coverage verification, source quality, two-round execution). WS2: Ephemeral retrieval subagents via SDK Task with expert-routing skill.
Status: Complete. 6/6 tasks done.
Scope: container/skills/wiki-curator/*, container/experts/*, container/skills/expert-routing/*, groups/dm-with-wang/.claude-fragments/*, SOUL.md, container/agent-runner/src/providers/claude.ts
Key constraints: SDK Task already allowlisted in claude.ts. Subagents inherit parent MCP tools. No agent-runner code changes. Default direct search, opt-in delegation. Sonnet for retrieval. Min-sources relaxed to 1.
Exit criteria: Curator SKILL.md has 4 improvements; instructions/fragment updated; SDK Task pattern documented; expert-routing skill operational.
