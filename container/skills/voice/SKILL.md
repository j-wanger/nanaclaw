# Voice I/O

## Voice Messages (Inbound)

Voice messages from channels arrive as audio attachments with transcription prepended automatically by the host. You'll see:

```
[Voice transcription: what the user said]
[audio: voice.ogg — saved to /workspace/inbox/...]
```

Respond to the transcription text normally. The audio file is available at the path shown if you need it.

If transcription is unavailable (whisper-server down), you'll see only the audio attachment without transcription. Let the user know you received audio but couldn't transcribe it.

## Speaking (Outbound)

Use the `speak` tool to send audio responses:

```
speak({ text: "Hello! How can I help you today?" })
```

### When to Speak

- When the user sent a voice message (respond in kind)
- When the user explicitly asks you to read something aloud
- For short confirmations or greetings in voice conversations

Don't speak for long responses, code, or structured content — text is better for those.

### Voice Selection

Default voice: `en-US-AriaNeural`. Override with the `voice` parameter:

```
speak({ text: "Bonjour!", voice: "fr-FR-DeniseNeural" })
```

Common voices: `en-US-GuyNeural` (male), `en-GB-SoniaNeural` (British), `ja-JP-NanamiNeural` (Japanese), `zh-CN-XiaoxiaoNeural` (Chinese).

### Limitations

- Requires `edge-tts` CLI (network access to Microsoft TTS service)
- If edge-tts is unavailable, the tool returns an error — fall back to text
- Audio is mp3 format, delivered as a file attachment
