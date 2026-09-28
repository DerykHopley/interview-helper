# Developer panel — prototype decisions

Question: what should the owner-only Developer panel look like (issue #17, Should; spec stories 107–111)? For each job it sets the model (from the Worker's allowed list), Prompt Variant, temperature, max tokens and reasoning effort. Those settings override the config defaults in this browser only. It also shows each LLM call's tokens and cost, priced from OpenRouter's models endpoint. It's hidden behind a toggle and is never part of the Candidate's screens.

The panel sits over the chosen Interview screen (S3). Prototype code lives on the throwaway branch `prototype/dev-panel`, not on main. It runs at `/prototype/dev-panel` (`npm run prototype:dev-panel`, which adds `?dev=1`).

- **Hidden until revealed:** it only appears with `?dev=1` or **Ctrl+Shift+D**. In the real build it should also be left out of builds Candidates get.
- **Made-up data:** there are no real calls. The prices are a sample of what OpenRouter's models endpoint returns (US$ per million input/output tokens), and there are 5 seeded calls.
- **Simulate a call:** makes up a call from the job's current settings, so you can see how the model, Prompt Variant, reasoning effort and max tokens change the cost.
- **Changed settings:** anything changed from the defaults gets a magenta outline and "· changed", with **Reset to defaults** per job and **Reset all**.
- **No prompt text:** the call log keeps tokens and cost only, never prompt or reply text.

The panel is deliberately styled differently from the Candidate's screens (monospace, slate and magenta), so it's never mistaken for part of the app. URL options: `?variant=P1|P2|P3`, `?open=1`, `?overrides=1` (starts with 3 settings changed), `?tab=calls`.

## Round 1 — 2026-09-28

| Variant | Desktop | Galaxy S25 (360×780) |
|---|---|---|
| P1 — Side drawer: a magenta DEV tab on the right edge opens a drawer with **Settings** (one job at a time, chosen with chips) and **Calls** (the call log with the session total). | [settings](round-1/desktop-P1.png) · [calls](round-1/desktop-P1-calls.png) | [settings](round-1/s25-P1.png) · [calls](round-1/s25-P1-calls.png) |
| P2 — Bottom dock, like browser devtools: a slim bar across the bottom shows the last call and the session cost. Opened, it shows every job's settings as a table (jobs as rows, with **Run**) beside the call log. | [open](round-1/desktop-P2.png) | [open](round-1/s25-P2.png) |
| P3 — Floating pill: a small "DEV · $0.00555" counter in the corner. It opens a compact settings popover for one job at a time, and every call pops a toast with its model, tokens and cost. | [open](round-1/desktop-P3.png) | [closed](round-1/s25-P3.png) |

With nothing in the URL the panel doesn't appear: [hidden](round-1/desktop-hidden.png).

**Decision:** _pending_
