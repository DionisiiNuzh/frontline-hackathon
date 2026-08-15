# Trial architecture

## Shape

- React/Vite single-page dispatcher console.
- Express API in the same `app/` project.
- The browser plays a user-selected recording and sends small `MediaRecorder` chunks over `/api/transcribe` while playback advances.
- The Express server bridges those chunks to Deepgram's live WebSocket API, keeping the Deepgram credential server-side. Interim text is display-only; each stable Deepgram segment extends the finalized transcript as soon as `is_final` is true.
- Each finalized segment triggers the existing analysis endpoint with the cumulative finalized transcript. Transcript revisions prevent late responses from replacing newer incident results.
- `POST /api/analyse` calls Anthropic's Messages API from the server only.
- A constrained tool schema captures structured output. When no key is configured, a clearly labelled local scenario parser supplies a demo result.
- Team matching is deterministic application code, not model output.

## Streaming transcript event model

- An interim result (`is_final: false`) is Deepgram's replaceable current hypothesis. The UI shows only the latest interim text and does not add it to the durable transcript.
- A finalized segment (`is_final: true`) is stable for its audio time range. The server emits one `{ type: "final", text }` browser event immediately, and the browser appends it to the cumulative transcript without replacing earlier segments.
- `speech_final: true` means Deepgram detected an endpoint in speech. It is not required for committing text because one speech turn can contain multiple finalized segments before that flag appears.
- `UtteranceEnd` is a Deepgram pause event and is retained only as focused diagnostic information. It does not control transcript accumulation.
- In the interface, a numbered transcript row means a finalized segment, not necessarily a complete speaker turn.

This distinction follows Deepgram's [endpointing and interim-results guidance](https://developers.deepgram.com/docs/understand-endpointing-interim-results): concatenate or otherwise preserve every `is_final` result rather than using `speech_final` alone to capture text. Waiting for `speech_final` previously collapsed several visible phrases into one row.

## Transcript interface

- `TranscriptPanel.jsx` owns transcript rendering, the audio controls, and follow-to-bottom behavior; call state and WebSocket orchestration remain in `App.jsx`.
- The initial finalized transcript is empty.
- Finalized segments are rendered as an ordered list. Interim text is a separate temporary row.
- After each final or interim render, `useLayoutEffect` sets the transcript container to its current `scrollHeight`. Immediate scrolling is deliberate: repeated smooth-scroll animations were restarted by rapid interim updates and could lag behind the newest text.
- Focused diagnostic logs use `[transcription]` for received/Deepgram events and `[transcript]` for resets, interim updates, cumulative append state, rendered segment counts, and scroll position. Broad request/audio lifecycle logging is intentionally excluded.

## Security and safety choices

- `ANTHROPIC_API_KEY` is server-side environment configuration and is never returned to the browser.
- The trial stores no transcripts.
- AI output is treated as a draft and labelled with confidence/source state.
- Dispatch remains a human action outside the system.

## Configuration

- `ANTHROPIC_API_KEY`: optional for fallback demo, required for live AI analysis.
- `ANTHROPIC_MODEL`: optional model override.
- `DEEPGRAM_API_KEY`: required for the minimal voice run.
- `PORT`: optional Express port; defaults to 3001.
