# Trial product scope

## Goal

Test whether a single dispatcher view can reduce the effort needed to turn a call into a structured operational picture and a defensible team shortlist.

## Trial flow

1. A dispatcher pastes or edits a simulated call transcript.
2. The assistant extracts a METHANE-style incident record, separates confirmed facts from uncertainty, and suggests the next questions.
3. The product ranks seeded rescue teams using visible capability and availability rules.
4. The dispatcher reviews the result and may select a team; the product does not dispatch it.

## In scope

- Transcript analysis with Anthropic when configured.
- Local demonstration fallback when no API key is configured.
- Structured incident fields, confidence labels, gaps, and suggested questions.
- Explainable, deterministic team suitability ranking.
- Seeded team roster and a review-only selection action.

## Out of scope

- Live audio, telephony, maps, authentication, persistence, team tracking, and real dispatch.
- Medical or operational advice.

## Trial success criteria

- A prepared scenario can be analysed and ranked in under 15 seconds.
- The UI never represents an inferred fact as confirmed.
- Every team score exposes supporting and limiting reasons.
- The app remains demonstrable without an external API.
