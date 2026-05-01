# Active Knowledge — Phase 25

### Session Lifecycle & Resume Patterns
from: [[wiki:session-lifecycle]] + [[wiki:session-handoff-failure-modes]]
retrieved: 2026-05-01

- Session resumption is a state injection problem — hangs occur when provider query blocks during init
- Stall detection signals: no events yielded, heartbeat stops updating, message stays pending
- Re-orientation after fresh start should take ≤2 turns (compaction anchors provide context)

### AML Entity Modeling
from: [[wiki:address-and-employer-modeling-for-aml-graphs]]
retrieved: 2026-05-01

- Typed node modeling: entities need type classification (PERSON, ORG, LOCATION) not flat strings
- Specificity penalties: generic entities (e.g., "United States" as jurisdiction) are low-value
- Entity attributes (gender, age, profession) are properties of PERSON nodes, not standalone entities

### NER Pipeline for Adverse Media
from: [[wiki:ai-powered-adverse-media-screening-with-ner-name-matching]]
retrieved: 2026-05-01

- Pipeline: NER → entity extraction → fuzzy matching → entity resolution (Phase 25 covers steps 1-2 only)
- Precision filter critical: articles mentioning sanctions may name dozens of incidental entities
- Dedup first pass: exact match on type+name+source; fuzzy resolution is a separate phase
