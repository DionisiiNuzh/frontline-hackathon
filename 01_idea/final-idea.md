# Selected Concept: SAR Dispatch Copilot

## One-line pitch

SAR Dispatch Copilot turns a live emergency call into the right questions, the right rescue-team recommendation, and a dispatcher-approved operational brief in minutes rather than a chain of manual interpretation and handover.

## Problem framing

Dispatchers may need to make time-critical decisions from incomplete, unstructured caller information while understanding which independent or voluntary team has the appropriate coverage, people, skills, equipment, and availability. Information can lose structure or urgency as it is passed from caller to police control and then to a rescue-team leader.

These points currently come from the team's interview notes and should be treated as hypotheses until validated with more dispatchers and rescue-team leaders.

## Target user and context

Primary user: a police or emergency-service dispatcher coordinating a land search-and-rescue request.

Secondary user: the rescue-team leader receiving and assessing the request.

Initial scenario: a missing or injured person in a remote UK land environment. The concept should not initially claim to cover maritime, cave, urban, flood, or major multi-agency incidents.

## Product promise

Help the dispatcher make a faster, better-informed recommendation while keeping the dispatcher and rescue-team leader in control.

The copilot does three connected jobs:

1. **Understand the incident:** transcribe the call and continuously extract facts such as location confidence, casualty condition, party details, terrain, weather, hazards, communications status, and time sensitivity.
2. **Close critical gaps:** show a short, prioritised list of questions whose answers would materially affect safety, urgency, or resource choice.
3. **Prepare the response:** translate incident facts into capability requirements, rank candidate teams, explain every match or mismatch, and produce a concise handover for dispatcher approval.

## Core workflow

1. A dispatcher starts or receives an incident.
2. The live transcript feeds an incident card; uncertain or conflicting facts are visibly marked.
3. The copilot suggests the next best question, with the reason it matters.
4. A rules-and-retrieval layer derives response needs from confirmed facts.
5. Candidate teams are filtered and ranked using coverage, capability, equipment, declared availability, and estimated mobilisation/travel information.
6. The dispatcher reviews the evidence, overrides if needed, and approves the recommendation.
7. The system generates a structured handover for copy/export into the existing operational workflow.

## Recommendation model

Hard constraints should filter before scoring. Examples include operational coverage, required technical capability, declared availability, and safety-critical equipment. Remaining candidates can be ranked by:

- suitability for the incident;
- proximity or estimated response time;
- current personnel/resource availability;
- data freshness and confidence.

Every recommendation must expose the source facts and data timestamps. Missing data must never be silently interpreted as “no capability” or “available.”

## Hackathon MVP

Build one end-to-end, simulated workflow:

- a prerecorded or acted emergency call with streaming transcription;
- a live incident card with confirmed, inferred, missing, and conflicting fields;
- three to five context-aware question suggestions;
- a seeded directory of five to ten fictional or consented teams;
- transparent team filtering and ranking;
- a dispatcher approval/override step;
- an exportable SAR handover containing facts, uncertainties, actions, and contact details;
- an audit timeline showing what the AI inferred and what the human confirmed.

The demo should compare the same incident before and after one key caller answer, showing the brief and team ranking update in real time.

## Explicit non-goals for the MVP

- autonomously dispatching a team;
- replacing emergency call-taking protocols, CAD, SARCALL, or TETRA;
- providing clinical diagnosis or treatment advice;
- building production integrations with emergency-service systems;
- solving no-signal geolocation;
- computer-vision search of aerial imagery;
- creating a nationwide authoritative capability database.

## Why this positioning fits the ecosystem

SARCALL already provides multi-agency incident management, messaging, mapping, and team contact information. The opportunity is therefore an intelligence layer that improves the quality and speed of the decision and handover, then feeds established tools instead of duplicating them.

UK mountain-rescue teams are locally organised, operate across geographic patches, can support neighbouring teams, and make independent choices about training and equipment. That makes capability and provenance important, but also means a universal, centrally mandated database is an adoption risk.

## Adoption strategy

Start with a low-burden sidecar:

- import a minimal team profile rather than demand replacement of existing systems;
- let each team own and time-stamp its capability and availability data;
- export or copy a brief into current workflows;
- offer value first as training and simulation, where operational integration and liability are lower;
- pilot with one police/SAR relationship and one incident class before expanding.

## Safety principles

- advisory only: a named human approves every operational output;
- separate caller statements, model inferences, and verified facts;
- show confidence, conflicts, missing information, and data age;
- prefer deterministic safety rules for hard constraints;
- preserve an audit trail of transcript, edits, recommendations, and overrides;
- degrade safely to manual notes and directory search when AI or connectivity fails;
- minimise sensitive data and define retention/access controls before real deployment.

## Success measures

For a hackathon evaluation or later controlled simulation:

- time from call start to usable first brief;
- percentage of predefined critical facts captured correctly;
- unsafe omissions or fabricated facts (target: zero);
- time to identify a suitable team;
- agreement between recommendations and expert selections;
- number and quality of justified human overrides;
- dispatcher and team-leader trust in the explanation and handover.

## Key assumptions to validate next

1. Dispatchers lack timely access to capability and availability data at the point of tasking.
2. The receiving team regularly needs to re-contact control because the initial handover lacks operationally important facts.
3. Existing call-taking scripts leave room for contextual question prompts.
4. Teams will maintain a small capability/availability profile if ownership, effort, and access are acceptable.
5. Existing systems provide a feasible import/export or copy-paste integration path.
6. Team selection, rather than only local operational patch, is a sufficiently frequent decision to justify ranking.

## Decision

Proceed with the dispatch-copilot concept, using a constrained land-SAR scenario and fictional/consented team data. Treat autonomous dispatch, nationwide data centralisation, radio interoperability, no-signal location, and computer vision as future or separate concepts.

