---
title: "Phase 34: Claim Linker Complete"
aliases: []
category: journal
tags: [knowledge-architecture, claim-provenance, NLI]
parents: [phase-34-claim-linker]
created: 2026-05-04
updated: 2026-05-04
source: debrief
---

# Phase 34: Claim Linker Complete

## What Happened
- Planned and implemented Phase 34 (Claim Linker) in a single session — 6 tasks (3S + 3M)
- Built `claim_link` MCP tool: two-pass pipeline (vector retrieval → Qwen NLI classification)
- New file `claim-linker.ts` (483 lines) with marker parser, NLI prompt/parser, YAML frontmatter updater, matching pipeline, and MCP tool registration
- 23 unit tests covering parsing, NLI, frontmatter update, pipeline E2E with mocks
- Fixed pre-existing test failure in sentence-embed-pipeline.test.ts (Phase 33 leftover: bracket prefix → natural language prefix)
- Reviewer (7/10 accept) flagged nli_score=0 conflation and sentence_ids not filtering by NLI — both fixed inline

## Decisions Made
- [[phase-34-claim-linker-approach|Phase 34: Claim Linker Approach]] — two-pass pipeline, Qwen NLI reuse, YAML regex, no js-yaml dep

## Problems Solved
- YAML frontmatter array-of-objects update without a YAML library — targeted regex/string parsing on `- id:` block boundaries
- nli_score semantic conflation (0 = "contradicts" vs "not scored") — fixed to use null when NLI hasn't run
- sentence_ids included non-entailing candidates — fixed to filter to only ENTAILS results after NLI

## Artifacts Changed
- `container/agent-runner/src/mcp-tools/claim-linker.ts` (new — core pipeline + MCP tool)
- `container/agent-runner/src/mcp-tools/claim-linker.test.ts` (new — 23 tests)
- `container/agent-runner/src/mcp-tools/index.ts` (barrel import)
- `container/agent-runner/src/mcp-tools/sentence-embed-pipeline.test.ts` (prefix format fix)

### Review Gate
Reviewer score: 7/10 (accept). Fixed 2 MEDIUM issues: nli_score null handling and sentence_ids NLI filtering. 534/534 tests passing.

### Activation Quality
Active knowledge: 3 entries, 3 referenced (~100% approximate hit rate, literal match). Claim spec lifecycle, classification pattern, and retrieval constraints all used during implementation.

## Related
- [[phase-34-claim-linker|Phase 34: Claim Linker]]
