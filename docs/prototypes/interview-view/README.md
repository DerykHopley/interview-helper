# Interview view — prototype decisions

Question: what should the Interview view (Questions → Matches → pick → Gaps) look like?

Prototype code lives on the throwaway branch `prototype/interview-view`, not on main. Screenshots are 1440×900, taken on page load, with made-up data.

## Round 1 — 2026-09-26 (commit `afd70b2`)

| Variant | Screenshot |
|---|---|
| A — Split pane: Question list on the left, Matches for the selected Question on the right | [round-1/variant-A.png](round-1/variant-A.png) |
| B — One at a time: one full-screen Question, reveal Matches, pick, next | [round-1/variant-B.png](round-1/variant-B.png) |
| C — Coverage board: Questions × Scenarios grid showing Match strength, reuse and Gaps | [round-1/variant-C.png](round-1/variant-C.png) |

**Decision:** B. The Candidate sees only one Question at a time and chooses when to go to the next.

## Round 2 — 2026-09-26 (commit `86a2fcd`)

Alternatives within the one-Question-at-a-time shape.

| Variant | Screenshot |
|---|---|
| B — One at a time (from round 1) | [round-2/variant-B.png](round-2/variant-B.png) |
| D — Interviewer chat: Questions asked as messages, Matches as quick replies | [round-2/variant-D.png](round-2/variant-D.png) |
| E — Flashcards: flip the Question to see one Match at a time | [round-2/variant-E.png](round-2/variant-E.png) |
| F — Rehearsal desk: the chosen Match's STAR notes, a 2-minute timer, mark as practised | [round-2/variant-F.png](round-2/variant-F.png) |

**Decision:** E. A deck of flashcards: the front is the Question, and you flip it to see the Matches.

## Round 3 — 2026-09-26

The flashcard deck from E is the same in every variant; only the way the Matches are shown changes. Screenshots use `?flipped=1` so that each one shows the Matches.

| Variant | Screenshot |
|---|---|
| E — One Match at a time: best Match on the back of the card, "Another story" steps through the rest | [round-3/variant-E-flipped.png](round-3/variant-E-flipped.png) |
| G — Dealt hand: the Question card stays face up, and the Matches are dealt below it as a fan of smaller cards with the best one in the middle | [round-3/variant-G-flipped.png](round-3/variant-G-flipped.png) |
| H — Ranked list: every Match on the back at once, each with a strength bar | [round-3/variant-H-flipped.png](round-3/variant-H-flipped.png) |
| J — Guess first: pick the story you'd tell from your whole Scenario bank, then flip to see whether it was a Match | [before the flip](round-3/variant-J-before-flip.png) · [after the flip](round-3/variant-J-flipped.png) |

**Decision:** _pending_
