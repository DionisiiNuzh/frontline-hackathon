# Trial architecture

## Shape

- React/Vite single-page dispatcher console.
- Express API in the same `app/` project.
- `POST /api/analyse` calls Anthropic's Messages API from the server only.
- A constrained tool schema captures structured output. When no key is configured, a clearly labelled local scenario parser supplies a demo result.
- Team matching is deterministic application code, not model output.

## Security and safety choices

- `ANTHROPIC_API_KEY` is server-side environment configuration and is never returned to the browser.
- The trial stores no transcripts.
- AI output is treated as a draft and labelled with confidence/source state.
- Dispatch remains a human action outside the system.

## Configuration

- `ANTHROPIC_API_KEY`: optional for fallback demo, required for live AI analysis.
- `ANTHROPIC_MODEL`: optional model override.
- `PORT`: optional Express port; defaults to 3001.
