# Dashboard — prototype decisions

Question: after unlocking, what should the Candidate's home look like? The core is the list of Interviews and creating one from a Job Spec. The Scenario Bank and Backup (import/export) need to be reachable from it.

Prototype code lives on the throwaway branch `prototype/dashboard`, not on main. It runs at `/prototype/dashboard` (`npm run prototype:dashboard`). The data is made up and held in memory. "Generating Questions" is a 2-second timer, with no LLM call. Opening an Interview goes to the Interview view prototype (K1). The Scenario Bank and Backup pages are placeholders for now.

The prototype bar's **state** panel switches between a new Candidate with no data and the sample data, and sets the Access Token to active, expired or none. The URL can also take `?scenario=empty`, `?token=expired|none` and `?create=1`.

## Round 1 — 2026-09-28

All three variants use the same form for creating an Interview:
- Paste a Job Spec (or "Use a sample Job Spec"), and it shows the role and company it detected.
- With an Access Token, "Create and generate ~8 Questions".
- Without one, "Create without Questions", with a note explaining why.

| Variant | Desktop | Galaxy S25 (360×780) |
|---|---|---|
| D1 — Decks on the table: each Interview is a deck of cards on the dark table, with its progress, Gaps and when you last practised. "+ New Interview" is an empty deck slot that opens a Job Spec card. The Scenario Bank and Backup sit at the edge of the table. | [home](round-1/desktop-D1.png) | [home](round-1/s25-D1.png) · [empty](round-1/s25-D1-empty.png) · [create, token expired](round-1/s25-D1-create.png) |
| D2 — Classic dashboard: tabs (Interviews · Scenario Bank · Backup), a table of Interviews that turns into cards on a phone, and a side column of status cards (Scenario Bank with "Remove demo", a Backup warning with "Export now", Gaps by skill). "New Interview" opens a drawer from the right. | [home](round-1/desktop-D2.png) · [create drawer](round-1/desktop-D2-create.png) | [home](round-1/s25-D2.png) · [empty](round-1/s25-D2-empty.png) · [create, token expired](round-1/s25-D2-create.png) |
| D3 — Next step: leads with "Pick up where you left off" (your most recent Interview and a Resume button), then a to-do list (fill Gaps, back up, remove demo stories), then all Interviews. A new Candidate sees the Job Spec box straight away. On a phone, the navigation becomes a bottom tab bar (Home · Stories · Backup). | [home](round-1/desktop-D3.png) | [home](round-1/s25-D3.png) · [empty](round-1/s25-D3-empty.png) · [create, token expired](round-1/s25-D3-create.png) |

**Decision:** _pending_
