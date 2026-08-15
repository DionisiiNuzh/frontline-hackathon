# Current state

The text trial and minimal voice-to-summary implementation are in `app/`. Browser-selected audio is played in real time, captured as timed media chunks, bridged server-side to Deepgram, displayed as temporary interim text plus append-only finalized segments, and handed cumulatively to Claude after every finalized segment. Transcript revisions reject stale Claude results.

The transcript UI is now isolated in `app/src/TranscriptPanel.jsx`, starts empty, renders finalized segments as numbered rows, and follows rapid live updates by scrolling immediately after layout. Focused `[transcription]` and `[transcript]` logs expose Deepgram/browser events, deliberate resets, cumulative append state, rendered segment counts, and scroll position.

A direct Deepgram run with the 14-second `trial1_q1.m4a` established the earlier root cause: Deepgram returned three non-empty `is_final` segments, while only the third had `speech_final: true`. The bridge had buffered until `speech_final` and therefore collapsed all three into one row. It now emits each final segment immediately using `{ type: "final", text }`. The event semantics and rationale are authoritative in `05_architecture/trial-architecture.md`.

The UI regression test confirms three final events remain as three visible rows. All server/UI tests pass and the Vite production build succeeds. Both credentials remain server-side and were not exposed.

Next: run `trial1_q1.m4a` through the interactive application and confirm the three rows remain visible during playback and drive cumulative summary revisions. If using `npm start`, restart the server first; `npm run dev` should reload automatically.
