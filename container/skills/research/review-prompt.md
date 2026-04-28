# Review: Score One Episodic Article Against Its Raw Source

Single-shot worker. Input is the raw source + its episodic summary. Output is JSON verdict. `write_to` updates the episodic article's status.

## Worker Contract

```
dispatch_worker({
  type: "structured-output",
  objective: "Compare this SUMMARY against its SOURCE. Check if every claim in the summary appears in the source. Do NOT use your own knowledge — only the source text provided.",
  outputFormat: "json",
  context: "--- SOURCE ---\n<raw article body>\n\n--- SUMMARY ---\n<episodic article body>",
  context_budget_tokens: 4000,
  timeout_ms: 180000,
  boundaries: [
    "ONLY compare summary against the source text above",
    "Do NOT fact-check against your own knowledge or training data",
    "A claim is correct if it appears in SOURCE, even if you have not seen it before",
    "Score 1-10 based on faithfulness to SOURCE only",
    "passed=true if score >= 6"
  ],
  postconditions: [
    { "type": "json-valid", "params": {} },
    { "type": "contains", "params": { "substring": "passed" } }
  ],
  write_to: {
    wiki: "<target_wiki>",
    tier: "review",
    target_path: "<path to the episodic article>"
  }
})
```

## Expected Output

```json
{
  "score": 7,
  "passed": true,
  "issues": ["Minor: X detail from source omitted in summary"]
}
```

## Scoring Rubric

The reviewer scores FAITHFULNESS TO SOURCE, not factual accuracy:

- 9-10: Every summary claim is in the source, nothing important omitted
- 6-8: Most claims are in the source, minor omissions
- 1-5: Summary contains claims not found in the source, or major omissions

**A claim about a 2026 event is CORRECT if the source mentions it. The reviewer's training cutoff is irrelevant.**

## Context Shaping (Orchestrator)

Include both the raw source body AND the episodic summary. Truncate the source if needed to fit 4K budget — but always include the full summary.
