# Working Knowledge
<!-- Cross-phase facts. Sorted by usage count descending. Pruned at 100 entries. -->

- MAST FM-1.3: worker step repetition is 15.7% of multi-agent failures — check tool traces for repeated identical calls before tuning prompts [uses: 2] activated: 2026-04-27 from: [[wiki:orchestrator-failure-modes]]
- Decision-tree prompt pattern (Pattern 2) is more reliable than natural-language instruction for small/local models — use IF/THEN routing over "try to" or "remember to" [uses: 2] activated: 2026-04-27 from: [[wiki:tool-use-prompting-patterns]]
- LLM pipelines fail open by default — no crash signal on bad output; prefer deterministic validators at boundary crossings over neural judges at the end [uses: 2] activated: 2026-04-27 from: [[wiki:fail-open-vs-fail-stop-in-llm-pipelines]]
- Qwen context sweet spot is 4K-8K tokens per worker; beyond ~20K tokens soft prompt instructions are ignored — use single-shot workers or programmatic tool filtering for complex pipelines [uses: 1] activated: 2026-04-27 from: [[decision:phase-6a-worker-tool-calling-approach]]
- Sequential pipeline stages need bounded responsibility (extract/write/review) with quality gates: 9-10 accept, 6-8 revise (one loop cap), 1-5 reject/escalate [uses: 1] activated: 2026-04-28 from: [[wiki:sequential-pipeline-patterns]]
- Context shaping is the orchestrator's most impactful job — what each worker sees determines success more than prompt instructions [uses: 1] activated: 2026-04-28 from: [[wiki:orchestrator-design-patterns]]
- Wiki generation: two-pass +15-25% accuracy at 2x cost; multi-stage (3-5 passes) 3-5x cost for 74-100% structural validity; model routing cuts cost 60-90% [uses: 1] activated: 2026-04-28 from: [[wiki:wiki-generation-pipelines]]
- raw/ is immutable source material with sha256 frontmatter for drift detection — provenance markers trace wiki claims to specific raw sources [uses: 1] activated: 2026-04-28 from: [[decision:phase-13-multi-stage-research-pipeline]]
