# Trial product scope

## Goal

Test whether a single dispatcher view can reduce the effort needed to turn a call into a structured operational picture and a defensible team shortlist.

## Trial flow

1. For the minimal voice run, a dispatcher selects and plays a fictional incident recording; otherwise a dispatcher may paste or edit a simulated call transcript.
2. While the recording plays, finalized speech is appended to the transcript and automatically analysed.
3. The assistant extracts a METHANE-style incident record, separates confirmed facts from uncertainty, and suggests the next questions.
4. The product ranks seeded rescue teams using visible capability and availability rules.
5. The dispatcher reviews the result and may select a team, which completes the draft METHANE dispatch message; the product does not dispatch it.

## In scope

- Transcript analysis with Anthropic when configured.
- Real-time playback streaming of one user-selected fictional recording through Deepgram, with interim and finalized transcript display.
- Automatic incident refresh from finalized transcript utterances.
- Local demonstration fallback when no API key is configured.
- Structured incident fields, confidence labels, gaps, and suggested questions.
- Explainable, deterministic team suitability ranking.
- Seeded team roster and a review-only selection action.
- A selection-aware METHANE message that remains a reviewable draft.

## Out of scope

- Microphone capture, telephony, maps, authentication, persistence, team tracking, and real dispatch.
- Medical or operational advice.

## Trial success criteria

- A prepared scenario can be analysed and ranked in under 15 seconds.
- The UI never represents an inferred fact as confirmed.
- Every team score exposes supporting and limiting reasons.
- The app remains demonstrable without an external API.
