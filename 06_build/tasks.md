# Trial build tasks

## Interface constraint

This application is purely an operational tool, not a marketing website. Interface copy and layout should prioritize dispatcher context, state, actions, and safety information. Do not add promotional hero sections, slogans, benefit-led headlines, sales language, or marketing calls to action.

- [x] Define the bounded trial scope and architecture.
- [x] Scaffold the React frontend and Express backend in `app/`.
- [x] Implement transcript extraction with safe local fallback.
- [x] Implement explainable deterministic team matching.
- [x] Add a dispatcher-focused review interface.
- [ ] Validate a live request with the user's Anthropic API key.
- [ ] Run the prepared scenario with a dispatcher/domain reviewer.

## Minimal voice-to-summary run

### Scope

Play one fictional incident recording in real time, stream the audio as it plays, show the growing Deepgram transcript, and automatically hand finalized transcript text to the existing Claude analysis endpoint so the incident summary updates. Team matching, suggested-question behaviour, telephony, and outbound messaging are not part of this run.

### User-owned setup

- [x] **User:** Approve a short fictional incident-call script prepared by Codex.
- [x] **User:** Record the approved script as an audio file (`trial1.m4a` and short first-run clip `trial1_q1.m4a`).
- [x] **User:** Create a Deepgram account and a project API key in the Deepgram Console under **Project → Settings → API Keys**.
- [x] **User:** Add `DEEPGRAM_API_KEY` to `app/.env`; do not paste or commit the key.
- [x] **User:** Add `ANTHROPIC_API_KEY` to `app/.env`; do not paste or commit the key.

### Codex-owned implementation

- [x] **Codex:** Draft the fictional 30–60 second call script using the current North Ridge scenario.
- [x] **Codex:** Add `DEEPGRAM_API_KEY` to `app/.env.example` without a real secret.
- [x] **Codex:** Add a server-side WebSocket bridge so the Deepgram credential never reaches the browser.
- [x] **Codex:** Add an in-app audio player that sends small audio chunks while playback advances, rather than uploading the completed recording for retrospective transcription.
- [x] **Codex:** Display interim transcription separately from committed finalized transcript segments.
- [x] **Codex:** Send only finalized transcript text to the existing Claude incident-analysis path after completed utterances.
- [x] **Codex:** Prevent an older Claude response from replacing a summary generated from a newer transcript revision.
- [x] **Codex:** Keep the last completed incident summary visible while the next summary is being generated.
- [x] **Codex:** Add clear ready, playing, transcribing, analysing, complete, and error states.
- [x] **Codex:** Add a focused test for reliable summary normalization when Claude omits the required summary property.

### Joint validation

- [ ] **User + Codex:** Run the recording at normal speed and confirm transcript text appears before playback ends.
- [ ] **User + Codex:** Confirm at least two finalized utterances trigger automatic Claude summary updates without an Analyse button.
- [ ] **User + Codex:** Confirm no Deepgram or Anthropic credential is returned to the browser or committed to Git.
- [ ] **User + Codex:** Record transcription and summary latency observed during the run.

### First-run result

- [x] `trial1_q1.m4a` played through headless Chromium and was captured from real-time browser playback.
- [x] Deepgram returned a finalized transcript through the server-side bridge.
- [x] The finalized cumulative transcript was handed automatically to Claude.
- [x] The resulting incident summary appeared in the browser without an Analyse action.
- [ ] Validate multiple automatic summary revisions with a clip containing clear pauses between two or more utterances.
