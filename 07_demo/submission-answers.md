# Project submission answers

## Briefly, what problem are you solving?

Search-and-rescue coordinators must quickly turn incomplete emergency calls into structured incident information and identify the right available team. Mountain Rescue England and Wales recorded 3,968 call-outs, 3,175 deployments and 158,543 volunteer hours in 2025. Relai bridges the gap between an unstructured call and the accurate, evolving M/ETHANE picture responders need.

Sources: [Mountain Rescue England and Wales](https://www.mountain.rescue.org.uk/2026/07/summer-in-the-mountains-prepare-well-enjoy-more/) and [JESIP M/ETHANE guidance](https://www.jesip.org.uk/joint-doctrine/m-ethane/).

## What is your solution?

Relai is a human-in-the-loop rescue coordination assistant. It transcribes a live call, builds a M/ETHANE incident record, labels facts as confirmed, uncertain or missing, and suggests the most important questions to ask next. It then ranks suitable teams by capability, availability and ETA, explains each score, and generates a reviewable handoff. Relai supports the coordinator; it never dispatches autonomously.

## How is your solution novel or frontier?

Relai connects the full workflow: live speech, structured facts, missing-information prompts, explainable team matching and handoff. AI interprets the call, while deterministic code ranks teams, making recommendations transparent and reproducible. It preserves uncertainty, rejects stale analysis as the call changes, and keeps every operational decision with a human.

## Technical details: technologies / models / APIs used / data used / research

React 19, Vite, Node.js and Express. Deepgram Nova-3 (`en-GB`) provides live transcription over WebSockets. Claude Haiku 4.5 extracts structured M/ETHANE facts, confidence states, capability needs and next questions through Anthropic's Messages API. Deterministic code ranks teams by capability, availability and ETA. MapLibre GL JS and CARTO provide the map. The demo uses fictional audio and a seeded, non-live team roster. API keys stay server-side, transcripts are not stored, and Relai never performs real dispatch. Research: [JESIP M/ETHANE](https://www.jesip.org.uk/joint-doctrine/m-ethane/) and [Deepgram streaming guidance](https://developers.deepgram.com/docs/understand-endpointing-interim-results).
