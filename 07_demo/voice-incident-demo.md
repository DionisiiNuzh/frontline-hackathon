# Voice incident response demo

## Recommended presentation

Use a bundled, prerecorded two-person emergency call as the primary demo. Play it from inside the product so the audio, timing, and transcript are reproducible. Keep live microphone input as an optional second take, not as the critical path. Do not depend on a real phone call for the judged demo.

## Six-minute run of show

### 0:00–0:30 — Set the stakes

Show the empty incident workspace. Explain that the dispatcher will keep talking to the caller while Northstar builds and updates the operational picture in the background.

### 0:30–2:15 — Let the call drive the interface

Start the prepared recording. Reveal information in deliberate beats:

1. A person has fallen and cannot stand.
2. They are near North Ridge, but the exact location is unknown.
3. The ground is steep with loose rock.
4. The casualty is conscious and speaking.
5. The caller supplies a landmark or location clue after the dispatcher asks one of Northstar's suggested questions.

As each finalized utterance arrives, show the transcript growing, changed incident fields briefly highlighting, the summary revising, and answered questions disappearing. There is no Analyse button.

### 2:15–3:15 — Explain the operational picture

Pause the audio. Point to confirmed, uncertain, and unknown values. Read one high-value next question and show why it matters. Emphasize that the system preserves uncertainty rather than filling gaps.

### 3:15–4:15 — Search all teams continuously

Show that the entire roster was reranked as the incident changed. Open the best current match and point to both a supporting reason and a limitation. Change or reveal one capability need during the call so the ranking visibly responds.

### 4:15–5:15 — Prepare the handoff

Select the team. Open the generated outbound package containing the incident summary, structured METHANE fields, location and confidence, hazards, casualty state, access, requested capabilities, selected team, unanswered questions, source transcript reference, and timestamp.

The dispatcher reviews the destination and payload, then presses **Confirm and send**. The demo adapter returns a visible acknowledgement and message reference. Describe SARCall as the intended destination only if its integration mechanism has been verified; otherwise label this clearly as a simulated emergency-messaging handoff.

### 5:15–6:00 — Close on the value

Return to the timeline: call heard, facts structured, gaps identified, teams searched, handoff prepared and acknowledged while the dispatcher stayed in the conversation. State clearly that AI drafts and ranks; the dispatcher verifies and authorizes.

## Screen states that must be visible

- Audio source and call status: ready, listening, ended.
- Incremental transcript with finalized versus currently transcribing speech.
- Last-updated indicator and analysis-in-progress state that does not blank prior results.
- Structured incident picture with changed fields highlighted.
- Prioritized next questions that update when answered.
- Complete team search with reasons, limitations, availability, and ETA.
- Outbound message preview, explicit destination, confirm action, and acknowledgement.
- Persistent decision-support and simulated-send labels.

## Reliability plan

- Primary: bundled recording, known transcript timing, live AI analysis.
- Fallback 1: bundled recording with cached transcription segments.
- Fallback 2: cached structured-analysis revisions and deterministic team ranking.
- Final fallback: one-click replay of the complete prepared scenario.

The fallback should use the same interface and be labelled honestly. Rehearse with network disabled once before presenting.

## Demo acceptance checks

- No manual analysis action is required after starting the call.
- A stale analysis response cannot replace a newer revision.
- The interface retains the last good incident picture while a refresh is running.
- At least one suggested question is answered during the scenario and then disappears.
- At least one new fact changes the team ordering or matching explanation.
- The outbound package carries uncertainties as well as confirmed facts.
- Nothing is sent until the dispatcher confirms, and the acknowledgement is unmistakably simulated unless backed by a verified integration.
