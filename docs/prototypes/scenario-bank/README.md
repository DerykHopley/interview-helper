# Scenario Bank — prototype decisions

Question: what should the Scenario Bank look like (spec #1 stories 24–32 and 47–50)? It needs to list stories with their skill tags; read one in full; create one by hand, with a check for missing required parts; edit; delete; show where each story came from (by hand, co-written, demo); and remove all demo stories at once.

The Scenario Bank is a tab of the chosen dashboard (D2), so the variants are built inside the real D2 page rather than on a blank one. Prototype code lives on the throwaway branch `prototype/scenario-bank`, not on main. It runs at `/prototype/scenario-bank` (`npm run prototype:scenario-bank`). Everything is in memory. "Co-write with AI" only shows a note, because co-writing is its own prototype (#12).

To try it:
- The prototype bar's **state** panel switches between an empty bank and the sample stories.
- `?scenario=empty` starts empty.
- `?mode=read|edit|choose|new` opens a given state.

## Round 1 — 2026-09-28

All three variants use the same pieces, so only the layout differs:
- **Reader:** Situation · Task · Action · Result, then measurable results, skills, and which Interviews the story is picked in.
- **Form:** the required fields are marked. Saving with parts missing highlights them and lists them, e.g. "Still missing: Result, measurable result". Date and company are optional ("leave it out if it's sensitive").
- **Adding a story:** a choice between "Write it myself" and "Co-write with AI".
- **Deleting:** a confirmation that warns when the story is the picked Match in an Interview.

| Variant | Desktop | Galaxy S25 (360×780) |
|---|---|---|
| B1 — List and reading pane: stories listed on the left, with search, the demo bar and where each is picked. The selected story reads in full on the right, and Edit turns that side into the form. On a phone the list and the story are two screens. | [list + story](round-1/desktop-B1.png) · [new story form](round-1/desktop-B1-new.png) | [list](round-1/s25-B1.png) · [story](round-1/s25-B1-read.png) · [add a story](round-1/s25-B1-choose.png) |
| B2 — Card grid: each story is a card that puts its measurable result up front, with skill filter chips across the top. Opening a card shows the story as a full document over the page (full screen on a phone). | [grid](round-1/desktop-B2.png) · [open story](round-1/desktop-B2-read.png) | [grid](round-1/s25-B2.png) · [open story](round-1/s25-B2-read.png) |
| B3 — Skills first: opens with the skills your stories cover (with counts and bars) and "Not covered yet", the Gap skills from your Interviews, each with a "Write one" button. Below, the stories are compact rows that open in place to read or edit. | [skills + rows](round-1/desktop-B3.png) · [row opened](round-1/desktop-B3-read.png) | [skills](round-1/s25-B3.png) |

**Decision:** B1 (list and reading pane) as the core, with B3's skills overview (skills covered, and not covered yet) added. Round 2 tries where the overview goes.

## Round 2 — 2026-09-28

B1's list and reading pane is the core in every variant; only where B3's skills overview sits changes. In all three, clicking a skill filters the list and selects the first matching story. "Write one" on an uncovered skill starts a new story with that skill already filled in.

| Variant | Desktop | Galaxy S25 (360×780) |
|---|---|---|
| C1 — Skills above: B3's two panels full width above the list and the story | [page](round-2/desktop-C1.png) | [page](round-2/s25-C1.png) |
| C2 — Skills in the list column: a compact overview (top four skills, and Gap chips with +) above the search and list, so the story stays at the top of the page | [page](round-2/desktop-C2.png) · [filtered by a skill](round-2/desktop-C2-filtered.png) | [page](round-2/s25-C2.png) |
| C3 — Skills strip: a one-line summary ("11 skills covered · 3 not covered yet: …") that opens into the full panels | [closed](round-2/desktop-C3.png) · [open](round-2/desktop-C3-open.png) | [closed](round-2/s25-C3.png) |

**Decision:** _pending_
