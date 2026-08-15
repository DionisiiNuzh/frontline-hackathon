# Current state

The first text trial and the minimal voice-to-summary implementation are in `app/`. A browser-selected recording is played in real time, captured as timed media chunks, bridged server-side to Deepgram, shown as interim/finalized transcript, and automatically handed to the existing Claude incident analysis after completed utterances. Transcript revisions reject stale Claude results.

The minimal voice path passed its first external end-to-end run using the 14-second `trial1_q1.m4a`: headless Chromium played and captured the audio in real time, Deepgram returned one finalized utterance, the cumulative transcript was sent automatically to Claude, and the incident summary appeared in the browser. Both credentials were detected without being exposed. A normalization guard and test handle the observed case where Claude returns structured fields but omits its required summary property. The app builds and both tests pass.

Next: run a clip with clear pauses that produces at least two finalized utterances and verify multiple automatic summary revisions during playback. The standalone recording script is in `06_build/incident-call-script.md`.
