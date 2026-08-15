# Current state

The voice-to-summary implementation and dispatcher review interface are integrated in `app/`. Browser-selected audio is played in real time, captured as timed media chunks, bridged server-side to Deepgram, displayed as temporary interim text plus append-only finalized segments, and handed cumulatively to Claude after every finalized segment once at least 20 characters are available. Transcript revisions reject stale Claude results.

The transcript UI is isolated in `app/src/TranscriptPanel.jsx`, starts empty, renders finalized segments as numbered rows, follows rapid live updates by scrolling immediately after layout, and shows the latest suggested questions. Focused `[transcription]` and `[transcript]` logs expose Deepgram/browser events, deliberate resets, cumulative append state, rendered segment counts, and scroll position.

A direct Deepgram run with the 14-second `trial1_q1.m4a` established the earlier root cause: Deepgram returned three non-empty `is_final` segments, while only the third had `speech_final: true`. The bridge had buffered until `speech_final` and therefore collapsed all three into one row. It now emits each final segment immediately using `{ type: "final", text }`. The event semantics and rationale are authoritative in `05_architecture/trial-architecture.md`.

The interface now uses a staged two-column dispatcher layout. The active-call stage places the transcript left and incident picture right, with the recommended “Ask next” prompt promoted to the largest, high-contrast content in the workspace. Sending the review-only message reveals and smoothly scrolls to a response stage with ranked teams left and an operational schematic right showing all seeded team positions plus a highlighted incident location. The schematic is not live tracking and no external dispatch occurs.

The automated server/UI tests and Vite production build pass. Both credentials remain server-side and were not exposed.

Next: run `trial1_q1.m4a` through the interactive application and confirm its three finalized rows remain visible, cumulative summaries rerank the teams, and selecting a team updates the METHANE message. If using `npm start`, restart the server first; `npm run dev` should reload automatically.
