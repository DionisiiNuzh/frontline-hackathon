
# Hackathon Workspace

An ICM-style workspace for taking a hackathon project from idea to working product and demo.

Folders carry context and sequencing. Files carry knowledge and state. Read only what the current task requires.

## Where things live

| Folder             | What it holds                                     |
| ------------------ | ------------------------------------------------- |
| `_context/`        | Hackathon, team, judging, and constraints         |
| `_research/`       | Research process, raw evidence, and findings      |
| `_state/`          | Current project state and handoffs                |
| `01_idea/`         | Idea exploration and selected concept             |
| `02_problem/`      | Problem, stakeholders, workflows, pain points     |
| `03_knowledge/`    | Canonical knowledge about users and the domain    |
| `04_product/`      | Product scope, requirements, features, user flows |
| `05_architecture/` | Technical design and decisions                    |
| `06_build/`        | Implementation plan and tasks                     |
| `07_demo/`         | Demo, pitch, and submission                       |
| `app/`             | Application source code                           |

## Routing

If the task concerns:

* the idea → `01_idea/CONTEXT.md`
* the problem or current user workflow → `02_problem/CONTEXT.md`
* known user/domain facts, practices, rules, or guidelines → `03_knowledge/CONTEXT.md`
* missing or uncertain information → `_research/CONTEXT.md`
* what we should build → `04_product/CONTEXT.md`
* how it should be built → `05_architecture/CONTEXT.md`
* implementation → `06_build/CONTEXT.md`
* demo or judging → `07_demo/CONTEXT.md`
* current progress or resuming work → `_state/CURRENT.md`

## Rules

* One folder, one job.
* Treat `03_knowledge/` as canonical knowledge; research is evidence, not automatically truth.
* Keep one authoritative home for each fact or decision; reference it elsewhere instead of copying it.
* Read the relevant `CONTEXT.md` before substantial work in a folder.
* Load only the inputs named by that context.
* Do not invent missing information; route material unknowns to `_research/`.
* Keep application code in `app/`.
* Persist decisions and useful knowledge in files rather than relying on conversation history.
