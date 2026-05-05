# Active Knowledge
## Phase: 38 - Review Remediation

### Dedup Landscape
from: external review + codebase grep
retrieved: 2026-05-05

- loadWikis duplicated in 13 files, resolveWikiPath in ~8 files, text() in 6 files
- wiki-utils.ts already exports loadWikis, resolveWikiByName, WikiEntry, parseFrontmatter, stripFrontmatter
- Drop-in files (all 3 duped): claim-tools, claim-linker, claim-conflicts, claim-reconcile, knowledge-tools, knowledge-analysis-tools
- Adaptation files (loadWikis only): wiki-search, research-fetch, wiki-write, research-summarize (custom wiki resolution)
- Partial files: url-index, local-worker/dispatch (loadWikis+WikiEntry only)

### Memory DB Schema Gap
from: [[decision:phase-38-review-remediation-approach]] + approach review
retrieved: 2026-05-05

- groups/<group>/memory/memory.db currently has FTS tables only (memory_fts), NOT the memory_server's memories table
- MEMORY_PROJECT_DIR in container.json points to same directory -- memory_server would create memories table there
- memories table schema: id, content, context, category, trust, strength, active, superseded_by, created_at, updated_at
- Context builder must check for memories table existence before querying (graceful fallback to MEMORY.md-only)
