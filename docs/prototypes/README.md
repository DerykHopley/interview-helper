# Prototype decisions

Throwaway UI prototypes were used to choose each screen's design before building it. This folder holds the history of those decisions: each area's README gives the question, every round's variants with screenshots, the feedback, and the chosen design (its **Outcome**). The prototype code itself is not on `main`. It lives on the `prototype/*` branches, and `prototype/dev-panel` contains all of them.

| Area | Chosen design | Tickets | Log |
|---|---|---|---|
| Access Token and Unlock Key | A2 — checklist | #3, #4 | [access](access/README.md) |
| Dashboard | D2 — classic dashboard | #8, #9 | [dashboard](dashboard/README.md) |
| Scenario Bank | C4 — list and reading pane, compact skills overview | #5, #7 | [scenario-bank](scenario-bank/README.md) |
| Backup and Packs | X4 — status line and panels | #6, #7 | [backup](backup/README.md) |
| Interview practice | S3 — flashcard deck on a dark table, dealt hand, answer bar, header, missing states, end card, quick jump | #8–#11, #13 | [interview-view](interview-view/README.md) |
| Co-writing | W5 — chat with pinned part chips, fixed reply box | #12, #13 | [co-writing](co-writing/README.md) |
| Developer panel | P1 — side drawer | #17 | [dev-panel](dev-panel/README.md) |

Parked for later: interview date and application status (#25), and "Undo" after deleting an Interview.

The prototypes use made-up data and never call an LLM. When building a design for real, rewrite it properly with tests; don't copy the prototype code across.
