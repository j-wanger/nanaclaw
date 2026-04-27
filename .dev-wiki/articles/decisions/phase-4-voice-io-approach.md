---
title: "Phase 4: Voice I/O — Whisper Server + Edge TTS"
aliases: [voice-io-approach, whisper-stt, edge-tts-decision]
category: decisions
tags: [voice, stt, tts, whisper, architecture]
parents: [phase-04-voice-io]
created: 2026-04-26
updated: 2026-04-26
source: plan
confidence: medium
---

## Context

Phase 4 adds voice I/O to the personal assistant. STT needs to process incoming voice messages from any channel (Telegram ogg, WhatsApp opus, iMessage m4a). TTS needs to let the agent respond with audio. M1 Max 64GB has headroom (~34GB free after Qwen 35B). whisper-large-v3-turbo runs ~10x realtime on M1 Max. Entry criteria gap: neither whisper.cpp nor edge-tts installed.

## Decision

**STT: Host-side module, whisper-server HTTP API.** Transcription happens in the host before writing to inbound.db — consistent with the two-DB model (host writes inbound, container reads). Uses whisper-server's OpenAI-compatible `/v1/audio/transcriptions` endpoint, matching the llama-cpp HTTP server pattern from Phase 3. Graceful degradation: audio forwarded without transcription if server unreachable.

Chose HTTP server over CLI subprocess because: model stays warm in memory (no ~2s cold-start per transcription), consistent with llama-server pattern, naturally async from Node.

**TTS: Container MCP tool, edge-tts subprocess.** Agent calls `speak(text, voice?)` MCP tool. Shells out to edge-tts CLI, writes mp3 to outbox. Existing delivery pipeline handles outbox file attachments — no delivery changes needed. Graceful degradation: error if edge-tts not installed.

Chose edge-tts over piper/macOS say: free Microsoft voices, good quality, no local model download. Network dependency acceptable — graceful degradation handles offline.

## Consequences

- whisper-server runs as persistent service alongside llama-server
- STT is transparent to the container — it sees transcription text, not audio processing
- TTS is agent-controlled (MCP tool), not automatic
- Both paths degrade gracefully when tools unavailable
- Phase includes toolchain setup as first task (entry criteria gap)
