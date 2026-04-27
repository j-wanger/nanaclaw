---
title: "src/env.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/env.ts"
content_hash: "6a783678d222faf0"
exports: []
imports: []
imported_by: ["src/config.ts"]
data_reads: [".env file"]
data_writes: []
---

# src/env.ts

Side-effect module that loads environment variables from the `.env` file into `process.env` at import time.

## Exports

No named exports. Imported for its side effect of populating `process.env`.

## Dependencies

**Internal:** None.

**External:** Likely uses `dotenv` or similar for `.env` file parsing.

## Dependents

[[src-config|config.ts]]
