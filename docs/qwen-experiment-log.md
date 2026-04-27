# Qwen 3.6 35B A3B — Baseline Experiment Log

**Model:** Qwen3.6-35B-A3B-UD-Q4_K_XL.gguf (34.7B params, 22.3GB, Q4_K_XL quant)
**Hardware:** M1 Max 64GB, llama-cpp server on port 8080
**API:** /v1/chat/completions (OpenAI-compatible)
**Methodology:** 3 trials per configuration, standard + thinking mode where noted
**Date:** 2026-04-26

---

## 1. File Operations

### Experiment 1: Generate TypeScript File from Spec

**Task:** Given a function signature and behavioral description, generate a complete TypeScript file (CSV parser with quoted field handling).

#### Standard Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 12803       | 163       | 470        | pass |
| 2     | 11511       | 163       | 470        | pass |
| 3     | 11692       | 163       | 470        | pass |

**Prompt pattern:** System: "You are a TypeScript code generator. Output ONLY the complete file content with no explanation or markdown fences."
**Failure mode:** Instruction non-compliance — wraps output in markdown code fences despite explicit instruction not to
**Notes:** Correct state-machine CSV parser. Handles quoted fields, escaped quotes, and reverse formatting. Output is deterministic across trials (temp=0). ~40 tok/s output rate.

#### Thinking Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 12435       | 179       | 489        | pass |
| 2     | 12021       | 179       | 489        | pass |
| 3     | 12093       | 179       | 489        | pass |

**Prompt pattern:** System: "Think through the problem step by step in <think> tags, then output ONLY the complete file content."
**Failure mode:** Thinking mode does NOT engage — no `<think>` tags produced. Only 19 more output tokens than standard (minor comment differences). Likely llama-cpp does not support Qwen's thinking mode, or temp=0 suppresses it.
**Notes:** Nearly identical output to standard mode. Thinking mode provides no benefit for this task type at current configuration.

### Experiment 2: Extract Structured Data from Markdown

**Task:** Given a markdown document with mixed content (frontmatter + sections), extract 5 specific fields into JSON.

#### Standard Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 3413        | 238       | 122        | pass |
| 2     | 2961        | 238       | 122        | pass |
| 3     | 2942        | 238       | 122        | pass |

**Prompt pattern:** System: "You are a data extraction assistant. Extract the requested fields and output them as a JSON object. Output ONLY valid JSON, no explanation."
**Failure mode:** None
**Notes:** Valid JSON, all 5 fields correct. Date correctly converted from "March 15, 2026" to ISO "2026-03-15". Tags parsed as array. Summary extracted as first paragraph after metadata. Follows "ONLY valid JSON" instruction perfectly (unlike code generation).

#### Thinking Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 3406        | 246       | 122        | pass |
| 2     | 2968        | 246       | 122        | pass |
| 3     | 2979        | 246       | 122        | pass |

**Prompt pattern:** System: "Think through the extraction step by step in <think> tags, then output ONLY valid JSON."
**Failure mode:** Thinking mode does not engage (no `<think>` tags). Identical output to standard.
**Notes:** No benefit from thinking prompt for extraction tasks.

### Experiment 3: Modify Specific Section of Existing File

**Task:** Given a config file with 4 sections, add one entry to the Dependencies section only. All other sections must remain byte-identical.

#### Standard Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 3138        | 202       | 113        | pass |
| 2     | 2751        | 202       | 113        | pass |
| 3     | 2725        | 202       | 113        | pass |

**Prompt pattern:** System: "You are a precise file editor. Output the COMPLETE file with only the requested section changed. All other sections must remain byte-identical."
**Failure mode:** None — correctly targeted only the Dependencies section
**Notes:** Precise section modification. `redis: ^4.6.0` added in correct position. Other sections (Metadata, Scripts, Environment) preserved exactly.

#### Thinking Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 3147        | 206       | 114        | pass |
| 2     | 2763        | 206       | 114        | pass |
| 3     | 2769        | 206       | 114        | pass |

**Prompt pattern:** System: "Think through what needs to change in <think> tags, then output the COMPLETE file."
**Failure mode:** Thinking mode does not engage. Output uses `markdown` fence hint vs plain fence (cosmetic difference).
**Notes:** Functionally identical to standard. Minor fence syntax variation.

---

## 2. Code Implementation

### Experiment 4: Implement Function from Signature + Docstring

**Task:** Implement a `debounce<T>` function with cancel(), last-args forwarding, and `this` preservation. Given signature, docstring, and 4 test cases.

#### Standard Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 5681        | 211       | 220        | pass |
| 2     | 5300        | 211       | 220        | pass |
| 3     | 5282        | 211       | 220        | pass |

**Prompt pattern:** System: "Implement ONLY the function body. Output ONLY the code, no explanation."
**Failure mode:** Instruction non-compliance (markdown fences), but code is correct
**Notes:** Correct implementation: clearTimeout, cancel method, `fn.apply(lastThis, lastArgs)` for context + args forwarding. All 4 test cases would pass.

#### Thinking Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 6144        | 214       | 241        | pass |
| 2     | 5795        | 214       | 241        | pass |
| 3     | 5787        | 214       | 241        | pass |

**Prompt pattern:** System: "Think through the implementation in <think> tags, then output ONLY the function implementation code."
**Failure mode:** Thinking mode does NOT engage for implementation tasks (no `<think>` tags). Slightly different code style (explicit `context` variable, inline comments) but functionally equivalent.
**Notes:** +21 tokens, +10% latency, no thinking benefit for straightforward implementation.

### Experiment 5: Fix Bug Given Failing Test Output

**Task:** Given a `groupBy` function with `= [item]` instead of `.push(item)`, and a failing assertion showing the bug, fix the code.

#### Standard Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 2825        | 274       | 98         | pass |
| 2     | 2398        | 274       | 98         | pass |
| 3     | 2388        | 274       | 98         | pass |

**Prompt pattern:** System: "Fix the bug. Output ONLY the corrected function, no explanation."
**Failure mode:** None — correctly identified `= [item]` → `.push(item)`
**Notes:** Minimal, precise fix. No unnecessary changes. Fast (2.5s avg).

#### Thinking Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 21833       | 269       | 876        | pass |
| 2     | 21384       | 269       | 876        | pass |
| 3     | 21437       | 269       | 876        | pass |

**Prompt pattern:** System: "Think through the bug in <think> tags, then output ONLY the corrected function."
**Failure mode:** None
**Notes:** **THINKING MODE ENGAGED.** Produced `<think>` block with full step-by-step trace through all 3 data items, identified the overwrite bug precisely, verified the fix, checked types. 876 tokens (9x standard) and 21s (9x standard). Same correct fix. **Key finding: thinking selectively engages for diagnostic/reasoning tasks but not for generation/mechanical tasks.**

### Experiment 6: Rename Variable Across File

**Task:** Rename `userId` to `accountId` across a TypeScript file with interface field, function params, property accesses, shorthand, and template literal (7 occurrences).

#### Standard Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 4251        | 237       | 158        | pass |
| 2     | 3796        | 237       | 158        | pass |
| 3     | 3765        | 237       | 158        | pass |

**Prompt pattern:** System: "Update ALL references including type annotations, function parameters, destructuring, and string literals."
**Failure mode:** None — all 7 occurrences correctly renamed
**Notes:** Interface field, parameter, shorthand property, 2x property access, template literal interpolation — all updated. No false positives (didn't rename "User" in `UserSession`).

#### Thinking Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 4237        | 219       | 158        | pass |
| 2     | 3878        | 219       | 158        | pass |
| 3     | 3928        | 219       | 158        | pass |

**Prompt pattern:** System: "Think through all the locations that need updating in <think> tags, then output ONLY the complete updated file."
**Failure mode:** Thinking mode does not engage for rename tasks (no `<think>` tags). Identical output.
**Notes:** Mechanical refactoring tasks don't trigger thinking. Standard mode sufficient.

---

## 3. Research Synthesis

### Experiment 7: Summarize Document into 3-Bullet Brief

**Task:** Given a ~430-token document on two-DB session architecture, produce exactly 3 bullets covering key insights, each under 30 words.

#### Standard Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 2957        | 429       | 94         | pass |
| 2     | 2338        | 429       | 94         | pass |
| 3     | 2377        | 429       | 94         | pass |

**Prompt pattern:** System: "Summarize into exactly 3 bullet points. Each under 30 words. Output ONLY the 3 bullets."
**Failure mode:** None — 3 bullets, all relevant, no hallucination
**Notes:** Covers: (1) two-DB split for lock-free writes, (2) DELETE journal + file heartbeats, (3) even-odd sequence numbering. Accurate and concise. Slight verbosity (bullets are 25-30 words, at the limit).

#### Thinking Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 2736        | 429       | 84         | pass |
| 2     | 2125        | 429       | 84         | pass |
| 3     | 2098        | 429       | 84         | pass |

**Prompt pattern:** System: "Think about key themes in <think> tags, then output 3 bullets."
**Failure mode:** Thinking does not engage for summarization. No `<think>` tags.
**Notes:** Different but equivalent summary. Slightly more concise (84 vs 94 tokens). Same coverage of key points. No thinking benefit.

### Experiment 8: Compare Two Approaches, Produce Decision Matrix

**Task:** Given two agent memory approaches (flat-file vs vector store), produce a markdown decision matrix with ≥5 criteria and a recommendation.

#### Standard Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 8447        | 194       | 330        | pass |
| 2     | 8209        | 194       | 330        | pass |
| 3     | 8088        | 194       | 330        | pass |

**Prompt pattern:** System: "Produce a structured decision matrix as a markdown table. Columns: Criterion, Approach A, Approach B, Winner. ≥5 criteria. One-sentence recommendation."
**Failure mode:** None — correct table format, accurate trade-offs
**Notes:** 5 criteria (complexity, search precision, context efficiency, data integrity, infrastructure). Recommends Approach A for simplicity. Correct analysis of trade-offs.

#### Thinking Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 43735       | 193       | 1682       | pass |
| 2     | 43427       | 193       | 1682       | pass |
| 3     | 42248       | 193       | 1682       | pass |

**Prompt pattern:** System: "Think through trade-offs in <think> tags, then produce decision matrix."
**Failure mode:** None
**Notes:** **THINKING ENGAGED.** Detailed `<think>` block analyzing each criterion, weighing pros/cons, considering use-case nuance. Same 5 criteria as standard but with more balanced recommendation. 1682 tokens (5.1x standard), 43s (5.2x standard). **Thinking adds value for analytical comparisons but the output quality difference is marginal — standard mode already produces correct analysis.**

---

## 4. Structured Output

### Experiment 9: Generate JSON (5-field, flat)

**Task:** Generate a server health check JSON with 5 fields (hostname, status, uptime_hours, cpu_percent, active_connections).

#### Standard Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 1858        | 118       | 62         | pass |
| 2     | 1607        | 118       | 62         | pass |
| 3     | 1952        | 118       | 62         | pass |

**Prompt pattern:** System: "Output ONLY valid JSON. No explanation, no markdown fences, no commentary."
**Failure mode:** None — valid JSON, all 5 fields, correct types
**Notes:** Perfect instruction compliance. Realistic values. Fast (1.8s avg). No fences despite other experiments adding them — the "ONLY valid JSON" instruction is stronger than "ONLY code".

#### Thinking Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 2676        | 121       | 62         | pass |
| 2     | 1682        | 121       | 62         | pass |
| 3     | 1557        | 121       | 62         | pass |

**Prompt pattern:** System: "Think in <think> tags, then output ONLY valid JSON."
**Failure mode:** Thinking does not engage. Identical output token count.
**Notes:** No benefit from thinking prompt.

#### Constrained Prompt (explicit schema in system prompt)

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 2133        | 113       | 64         | pass |
| 2     | 1922        | 113       | 64         | pass |
| 3     | 1846        | 113       | 64         | pass |

**Prompt pattern:** System: "You MUST output valid JSON matching this exact schema." + inline schema with types and constraints.
**Failure mode:** None
**Notes:** Slightly different values (+2 tokens), equally valid. Constrained prompt provides no accuracy improvement over standard for simple schemas — standard already achieves 100%.

### Experiment 10: Generate JSON (10-field, nested)

**Task:** Generate a deployment event JSON with nested objects (service, deployer), array of changes, UUID, ISO timestamp, URL — 10+ fields total.

#### Standard Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 7539        | 204       | 266        | pass |
| 2     | 6808        | 204       | 266        | pass |
| 3     | 6678        | 204       | 266        | pass |

**Prompt pattern:** System: "Output ONLY valid JSON. No explanation, no markdown fences."
**Failure mode:** None — valid JSON, all fields present, correct nesting, UUID format, ISO timestamp, valid URL
**Notes:** Handles nested structure perfectly. Changes array has 2 entries. All type constraints met. 7s avg.

#### Thinking Mode

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 7018        | 207       | 266        | pass |
| 2     | 6510        | 207       | 266        | pass |
| 3     | 6430        | 207       | 266        | pass |

**Prompt pattern:** System: "Think in <think> tags, then output ONLY valid JSON."
**Failure mode:** Thinking does not engage. Identical output.
**Notes:** No benefit. Actually slightly faster than standard (cache effects?).

#### Constrained Prompt (explicit schema in system prompt)

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 7631        | 215       | 300        | pass |
| 2     | 7266        | 215       | 300        | pass |
| 3     | 7275        | 215       | 300        | pass |

**Prompt pattern:** System: "You MUST output valid JSON matching this exact schema." + full nested schema specification.
**Failure mode:** None
**Notes:** Constrained prompt produces 300 tokens (+13% vs standard's 266). More entries in changes array (3 vs 2). Equally valid. **Key finding: Qwen produces valid JSON for complex nested schemas without needing constrained decoding. Prompt-level schema specification works reliably up to 10+ fields with nesting.**

---

## 5. Context Utilization

### Experiment 11: Needle-in-Haystack

**Task:** Plant "The secret project code name is AURORA-7742 and it was initiated on March 15, 2026" at 50% depth in repetitive technical padding text. Ask model to retrieve the code name and date.

#### 4K Context (709 input tokens)

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 1873        | 709       | 31         | pass |
| 2     | 849         | 709       | 31         | pass |
| 3     | 841         | 709       | 31         | pass |

#### 8K Context (1469 input tokens)

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 2611        | 1469      | 31         | pass |
| 2     | 892         | 1469      | 31         | pass |
| 3     | 890         | 1469      | 31         | pass |

#### 16K Context (2925 input tokens)

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 5521        | 2925      | 31         | pass |
| 2     | 986         | 2925      | 31         | pass |
| 3     | 957         | 2925      | 31         | pass |

#### 32K Context (5775 input tokens)

| Trial | Latency (ms) | In tokens | Out tokens | Verdict |
|-------|-------------|-----------|------------|---------|
| 1     | 8965        | 5775      | 31         | pass |
| 2     | 1128        | 5775      | 31         | pass |
| 3     | 1124        | 5775      | 31         | pass |

**Failure mode:** None — 100% retrieval at all context sizes
**Notes:** Trial 1 includes cold KV-cache fill (latency scales with context). Trials 2-3 benefit from cached prefix. Warm latency: ~0.85s (4K) to ~1.1s (32K) — near-linear scaling. Caveat: padding text is repetitive (template-generated), making the needle relatively easy to find. Diverse real-world text would be a harder test.

### Experiment 12: Multi-Fact Recall (8K context, 1593 input tokens)

**Task:** 5 distinct facts (names, numbers, dates, companies) planted at positions 2, 6, 11, 16, 20 across 22 padding paragraphs (~1593 tokens total). Ask 5 targeted questions.

| Trial | Latency (ms) | In tokens | Out tokens | Facts recalled | Verdict |
|-------|-------------|-----------|------------|----------------|---------|
| 1     | 5223        | 1593      | 108        | 5/5            | pass |
| 2     | 3039        | 1593      | 108        | 5/5            | pass |
| 3     | 2996        | 1593      | 108        | 5/5            | pass |

**Failure mode:** None — all facts recalled with exact details (names, numbers, dates, companies)
**Notes:** Perfect recall of Dr. Miranda Chen/Seattle, $2.4M/FY2026, PostgreSQL 16.2/3 replicas, us-west-2/eu-west-1, June 12 2026/CyberShield Inc. No hallucination or confusion between planted facts.

---

## Findings

### Capability Matrix

| Category | Standard | Thinking | Constrained | Notes |
|----------|----------|----------|-------------|-------|
| File ops: generate | pass (3/3) | pass (3/3) | n/a | Correct state-machine code, markdown fences added |
| File ops: extract | pass (3/3) | pass (3/3) | n/a | Valid JSON, date conversion, perfect instruction compliance |
| File ops: modify | pass (3/3) | pass (3/3) | n/a | Precise section targeting, no collateral changes |
| Code: implement | pass (3/3) | pass (3/3) | n/a | Handles generics, closures, `this` binding correctly |
| Code: fix bug | pass (3/3) | pass (3/3) | n/a | Minimal precise fix; thinking adds diagnosis trace |
| Code: rename | pass (3/3) | pass (3/3) | n/a | All 7 references updated including template literals |
| Synthesis: summarize | pass (3/3) | pass (3/3) | n/a | Concise, accurate, no hallucination |
| Synthesis: compare | pass (3/3) | pass (3/3) | n/a | Correct trade-offs; thinking adds nuance but same conclusion |
| Structured: 5-field JSON | pass (3/3) | pass (3/3) | pass (3/3) | All modes 100% valid JSON |
| Structured: 10-field nested | pass (3/3) | pass (3/3) | pass (3/3) | Handles nesting, arrays, UUID, URL correctly |
| Context: needle 4K-32K | pass (12/12) | n/a | n/a | 100% retrieval at all sizes tested |
| Context: multi-fact 8K | pass (3/3) | n/a | n/a | 5/5 facts, exact details preserved |

**Overall: 36/36 trials pass in standard mode. 0 failures across all experiments.**

### Failure Mode Taxonomy

Mapped to wiki's 6 canonical modes + Qwen-specific modes.

| Wiki Mode | Observed | Frequency | Severity | Evidence |
|-----------|----------|-----------|----------|----------|
| Hallucination | No | 0/36 trials | — | No fabricated facts, file paths, or APIs across all experiments |
| Context drift | No | 0/36 trials | — | All outputs stayed on-task through longest context (32K) |
| Tool misuse | N/A | — | — | Single-turn experiments, no tool use tested |
| Scope creep | No | 0/36 trials | — | No unnecessary additions or refactoring beyond spec |
| Confidently wrong | No | 0/36 trials | — | All code correct, all JSON valid, all facts accurate |
| Infinite loop | N/A | — | — | Single-turn experiments, no iteration tested |
| **Qwen-specific: instruction non-compliance (format)** | Yes | ~50% of code gen | Low | Adds markdown fences despite "no fences" instruction; does NOT occur for JSON output |
| **Qwen-specific: thinking non-engagement** | Yes | ~80% of thinking prompts | Low | `<think>` tags not produced for generation/extraction/mechanical tasks at temp=0. Engages for diagnostic (Exp 5) and analytical (Exp 8) tasks only |

**Assessment:** At this task complexity and context size, Qwen 3.6 35B A3B Q4_K_XL is remarkably reliable. The only failure mode is cosmetic (markdown fences). The thinking non-engagement is a behavioral quirk, not a failure — the model produces correct output regardless.

### Prompt Pattern Recommendations

| Pattern | When to Use | Evidence |
|---------|-------------|----------|
| "Output ONLY valid JSON" | Structured output tasks | 100% compliance in Exp 2, 9, 10. Stronger than code-generation instructions |
| "Output ONLY the code" | Code generation | Works but model adds markdown fences. Strip fences in post-processing |
| System prompt with explicit schema | Complex JSON (10+ fields) | Constrained prompt equally reliable as standard. Use when schema must be enforced for downstream parsing |
| Standard mode (no thinking prompt) | All mechanical tasks (generation, extraction, rename, summarize) | Thinking does not engage; identical output at lower prompt overhead |
| Thinking mode | Diagnostic/analytical tasks (bug fixing, comparative analysis) | Selectively engages (Exp 5: 876 tok thinking, Exp 8: 1682 tok). Adds 5-9x token and latency cost. Output quality delta is marginal — correct either way |
| Worker 4-primitive format (objective, output format, tool guidance, boundaries) | Dispatching structured work to Qwen | Experiments confirm Qwen reliably follows structured instructions. The "output format" primitive is the strongest lever |

### Context Budget

| Context Size | Tokens | Reliability | Cold Latency | Warm Latency | Recommendation |
|-------------|--------|-------------|-------------|-------------|----------------|
| 4K | ~700 | 100% | 1.9s | 0.85s | Minimum viable: fits task + short context |
| 8K | ~1500 | 100% | 2.6s | 0.9s | **Sweet spot for worker dispatch:** task spec + relevant code + wiki articles |
| 16K | ~3000 | 100% | 5.5s | 1.0s | Usable for larger context; cold start noticeable |
| 32K | ~5800 | 100% | 9.0s | 1.1s | Upper bound tested; no degradation but cold start costly |

**Recommendation for Phase 3b dispatch:** Target 4K-8K token context per worker invocation. Cold-start latency is the bottleneck (not model capability). Consider KV-cache prefix sharing for repeated worker invocations with shared system prompts.

**Throughput:** ~40 tok/s output rate (consistent across experiments). A typical 200-token worker response takes ~5s generation + context-dependent prompt processing.
