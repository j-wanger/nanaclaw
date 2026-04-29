# Voice Instructions

## Inbound
Voice messages arrive with transcription prepended: `[Voice transcription: ...]`. Respond to the text normally. If transcription is missing (whisper down), tell the user you received audio but couldn't transcribe.

## Outbound
Use `speak(text, voice?)` to send audio responses. Default voice is natural. Only speak when the user expects audio or explicitly asks.
