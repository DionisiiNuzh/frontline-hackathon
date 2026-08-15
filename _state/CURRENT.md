# Current state

The voice-to-summary implementation and dispatcher review interface are integrated in `app/`. Browser-selected audio is played in real time, captured as timed media chunks, bridged server-side to Deepgram, displayed as temporary interim text plus append-only finalized segments, and handed cumulatively to Claude after every finalized segment once at least 20 characters are available. Transcript revisions reject stale Claude results.

The transcript UI is isolated in `app/src/TranscriptPanel.jsx`, starts empty, renders finalized segments as numbered rows, follows rapid live updates by scrolling immediately after layout, and shows the latest suggested questions. Focused `[transcription]` and `[transcript]` logs expose Deepgram/browser events, deliberate resets, cumulative append state, rendered segment counts, and scroll position.

A direct Deepgram run with the 14-second `trial1_q1.m4a` established the earlier root cause: Deepgram returned three non-empty `is_final` segments, while only the third had `speech_final: true`. The bridge had buffered until `speech_final` and therefore collapsed all three into one row. It now emits each final segment immediately using `{ type: "final", text }`. The event semantics and rationale are authoritative in `05_architecture/trial-architecture.md`.

The interface uses the three-column dispatcher layout from `main`. It loads the expanded rescue-team roster before analysis, switches to deterministic incident-fit ranking after analysis, and allows a ranked team to be selected for review. The incident picture separates current facts from a generated METHANE dispatch message, whose emergency-services line updates from the selected team. No external dispatch occurs.

The automated server/UI tests and Vite production build pass. Both credentials remain server-side and were not exposed.

Next: run `trial1_q1.m4a` through the interactive application and confirm its three finalized rows remain visible, cumulative summaries rerank the teams, and selecting a team updates the METHANE message. If using `npm start`, restart the server first; `npm run dev` should reload automatically.
