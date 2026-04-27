---
title: "Phase 4: Voice I/O Complete"
aliases: []
category: journal
tags: [voice, stt, tts, whisper, edge-tts]
parents: [phase-04-voice-io]
created: 2026-04-26
updated: 2026-04-26
source: debrief
---

# Phase 4: Voice I/O Complete

## What Happened
- Planned and implemented Voice I/O in a single session (5 tasks, 2S + 3M)
- STT: host-side module using whisper-server HTTP API — transcribes audio attachments before they reach the container
- TTS: container-side MCP tool using edge-tts subprocess — agent calls speak() to generate audio
- Integration: fire-and-forget async pattern in writeSessionMessage (write original, then update with transcription) — avoids making the sync function async across 10+ callers
- Installed whisper.cpp (Homebrew) + whisper-large-v3-turbo (1.5GB) + edge-tts (via uv)

## Decisions Made
- [[phase-4-voice-io-approach|Phase 4: Voice I/O — Whisper Server + Edge TTS]] — whisper-server over CLI (cold start), edge-tts over piper/say (quality + free)

## Problems Solved
- pip3 broken on Python 3.14 — used `uv tool install edge-tts` instead
- whisper-server `--convert true` syntax error — `--convert` is a toggle flag, default already true
- writeSessionMessage is sync with 10+ callers — used fire-and-forget DB update pattern instead of making async
- vi.restoreAllMocks() doesn't clear vi.fn() call counts — switched to vi.clearAllMocks()
- SESSION_DIR cached at import time in Bun — read env var at call time in handler

## Artifacts Changed
- `src/modules/voice/` (stt.ts, router-hook.ts, index.ts + 2 tests + fixture)
- `container/agent-runner/src/mcp-tools/voice-tts.ts` (speak MCP tool + test)
- `container/skills/voice/SKILL.md` (voice usage guide)
- `src/config.ts` (WHISPER_URL), `src/session-manager.ts` (voice hook), `src/modules/index.ts` (barrel)
- `container/agent-runner/src/mcp-tools/index.ts` (barrel)

## Related
- [[phase-04-voice-io|Phase 4: Voice I/O]]

### Review Gate
Reviewer score: 7/10, verdict: revise. Fixed: removed dead `findByName` import and unused `to` schema field. Noted: `_mockEdgeTts` test seam (acceptable, not in MCP schema), fetch timeout for whisper (future improvement).

### Activation Quality
Active knowledge: 1 entry, 1 referenced (~100% approximate hit rate, literal match). Two-DB constraint directly informed STT host-side placement.

### Health Delta
+28 tests (24 host vitest + 4 container bun:test). 312 → 312 host (voice tests are new files). 166 → 170 container. Both typechecks clean.
