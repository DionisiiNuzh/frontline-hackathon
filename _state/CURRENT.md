# Current state

The first end-to-end trial of the Search and Rescue Dispatch Assistant is implemented in `app/`. It includes a React dispatcher console, Express API, Anthropic integration, a no-key demo fallback, seeded teams, and explainable deterministic ranking.

Next: copy `app/.env.example` to `app/.env`, add the user's Anthropic key, start the app, and validate the prepared transcript against the live model. The product and architecture for this version are recorded in `04_product/trial-scope.md` and `05_architecture/trial-architecture.md`.
