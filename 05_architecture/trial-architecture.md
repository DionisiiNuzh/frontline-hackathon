# Trial architecture

## Shape

- React/Vite single-page dispatcher console.
- Express API in the same `app/` project.
- The browser plays a user-selected recording and sends small `MediaRecorder` chunks over `/api/transcribe` while playback advances.
- The Express server bridges those chunks to Deepgram's live WebSocket API, keeping the Deepgram credential server-side. Interim text is display-only; each stable Deepgram segment extends the finalized transcript as soon as `is_final` is true.
- Each finalized segment triggers the existing analysis endpoint with the cumulative finalized transcript. Transcript revisions prevent late responses from replacing newer incident results, and a newer revision aborts the superseded browser request. The server propagates a client disconnect to the upstream Anthropic request.
- `POST /api/analyse` calls Anthropic's Messages API from the server only. The latency-sensitive extraction defaults to Claude Haiku 4.5 and records model latency and output-token count without logging transcript content.
- A compact constrained tool schema returns three next questions, seven fixed fact slots with confidence, and required capabilities. The server owns canonical field labels, fills omitted values as unknown, derives the one-sentence summary and uncertainty list, and then runs deterministic team matching. This reduces model output on the update path without removing UI or matching data. When no key is configured, a clearly labelled local scenario parser supplies a demo result.
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

## Team review and dispatch draft

- The browser loads the seeded roster from `GET /api/teams`. Before incident analysis, teams are ordered by availability and ETA and are not presented with an incident-fit score.
- Each completed analysis replaces the roster ordering with the deterministic matches returned by `POST /api/analyse`, including fit scores, supporting reasons, and limitations.
- Team selection is enabled only for incident-ranked results. Selection is stored by team ID, survives later transcript revisions while that team remains in the result, and resets when a new recording is selected.
- The browser derives the METHANE dispatch message from the latest structured incident fields. Selecting a team updates only the emergency-services line with its name, ETA, and contact; there is no outbound messaging or dispatch side effect.

## Response map

- The review stage uses Leaflet with CARTO's hosted Dark Matter raster tiles. The browser loads the external basemap directly and retains the CARTO/OpenStreetMap attribution rendered by Leaflet. The raster renderer deliberately avoids a WebGL dependency so the map remains compatible with constrained dispatcher browsers and headless demo environments.
- Each seeded team owns a stable `{ label, latitude, longitude }` location in the server roster. Those coordinates flow unchanged through `GET /api/teams` and deterministic match results.
- The prepared North Ridge scenario resolves through a local alias registry to a fixed Lake District coordinate. Arbitrary extracted text is not geocoded; an unknown location is visibly marked as unmapped rather than assigned an invented coordinate.
- The map supports drag navigation and explicit zoom controls while disabling scroll-wheel zoom. Tile failures leave the surrounding dispatcher view intact and display an unavailable notice.

## Security and safety choices

- `ANTHROPIC_API_KEY` is server-side environment configuration and is never returned to the browser.
- The trial stores no transcripts.
- AI output is treated as a draft and labelled with confidence/source state.
- Dispatch remains a human action outside the system.

## Configuration

- `ANTHROPIC_API_KEY`: optional for fallback demo, required for live AI analysis.
- `ANTHROPIC_MODEL`: optional model override; defaults to `claude-haiku-4-5-20251001` for the latency-sensitive extraction path.
- `DEEPGRAM_API_KEY`: required for the minimal voice run.
- `PORT`: optional Express port; defaults to 3001.
