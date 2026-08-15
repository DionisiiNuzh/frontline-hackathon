# Search and Rescue Dispatch Assistant

## Problem statement

1. **Dispatchers lack real-time visibility into rescue teams' skillsets, resources, and availability**, making it hard to identify the *right* team for a given incident context (not just the nearest one) — especially under time pressure with incomplete information.
2. **Dispatchers don't reliably extract complete, structured incident information during the call.** Even where frameworks like METHANE exist, applying them consistently live — while managing a caller in distress — is a trained skill that degrades under cognitive load, leading to gaps (missing hazard information, vague location, or no access route) that cascade into delayed or misdirected response.

## Idea

An AI decision-support system for search-and-rescue coordination that turns emergency calls into a structured operational picture and helps dispatchers identify the most suitable available rescue team.

It combines:

- a shared, current view of rescue teams' operational areas, capabilities, equipment, and availability;
- real-time extraction of relevant facts from emergency calls;
- suggested questions when important information is missing or unclear;
- explainable matching between the incident's requirements and suitable rescue teams;
- a structured handover containing confirmed facts, uncertainties, and outstanding questions.

The system supports human dispatchers; it does not dispatch rescue teams autonomously.
