---
title: "Phase 4: Voice I/O"
aliases: [phase-4, voice, stt, tts]
category: phases
tags: [voice, whisper, stt, tts, edge-tts]
parents: [phase-00-fresh-fork-smoke-test]
created: 2026-04-25
updated: 2026-04-26
source: plan
status: completed
scope: ["src/modules/voice/**", "src/modules/index.ts", "container/agent-runner/src/mcp-tools/voice-tts.ts", "container/agent-runner/src/mcp-tools/voice-tts.test.ts", "container/skills/voice/**"]
entry_criteria: "Phase 0 complete, whisper.cpp or faster-whisper installed"
exit_criteria: "STT transcribes voice notes, TTS produces audio, graceful degradation when tools absent"
---

# Phase 4: Voice I/O

## Objective

Add voice input (STT via local Whisper) and voice output (TTS via Edge TTS) for spoken interaction across messaging platforms.

## Scope

- `src/modules/voice/` — index.ts, stt.ts, tts.ts
- `container/skills/voice/SKILL.md`
- Channel adapter modifications for voice message handling

## Exit Criteria

- [ ] STT: fixture .ogg → non-empty text
- [ ] TTS: text string → valid .mp3
- [ ] Graceful degradation when whisper/network unavailable
- [ ] pnpm test still passes

## Notes

Independent after Phase 0 — can run in parallel with any phase. whisper-large-v3-turbo via whisper.cpp (~10x realtime on M1 Max). TTS opt-in per agent group.
