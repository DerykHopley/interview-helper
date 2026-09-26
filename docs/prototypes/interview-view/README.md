# Interview view — prototype decisions

Question: what should the Interview view (Questions → Matches → pick → Gaps) look like?

**Outcome:** K, dark table (round 5). Summary: one Question at a time on a flashcard deck, on a dark card table; "Deal my Matches" fans the Matches out below the Question card as tilted, overlapping cards, with the best in the middle; tap a card to keep it.

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

**Decision:** G for the look: tilted, overlapping cards. But H stood out because of its dark background, so round 4 tries G with darker contrast.

## Round 4 — 2026-09-26

G's dealt hand, with the dark contrast that made H stand out added in three different places. Screenshots are taken after the Matches are dealt (`?flipped=1`).

| Variant | Screenshot |
|---|---|
| G — Dealt hand (from round 3), on the yellow background | [round-4/variant-G-dealt.png](round-4/variant-G-dealt.png) |
| K — Dark table: dealing darkens the whole page to a dark green card table | [round-4/variant-K-dealt.png](round-4/variant-K-dealt.png) |
| L — Card turns over: the Question card flips to a dark side and the cards dealt below it are light cream | [round-4/variant-L-dealt.png](round-4/variant-L-dealt.png) |
| M — Hand on the card: the Matches are fanned out on the dark back of the Question card | [round-4/variant-M-dealt.png](round-4/variant-M-dealt.png) |

**Decision:** K, the dark table, with the background always dark rather than switching when the cards are dealt.

## Round 5 — 2026-09-26

K becomes the default. The dark table now stays the same before and after dealing, and "Deal my Matches" has a yellow outline so it shows up against the dark table.

| State | Screenshot |
|---|---|
| Before dealing | [round-5/variant-K-before-deal.png](round-5/variant-K-before-deal.png) |
| After dealing | [round-5/variant-K-dealt.png](round-5/variant-K-dealt.png) |

**Decision:** K is the main design for the Interview view. The other variants are removed from the prototype and remain in the branch history.

## Round 6 — 2026-09-26

K without the "Next card" and back buttons, to free up space. Instead, you swipe the Question card left for the next Question and right for the previous one (touch or mouse drag), use the faint arrow buttons on the left and right edges, or press ← →. At the first and last card the swipe springs back. Also added a phone layout.

| State | Desktop (1440×900) | Phone (390×844) |
|---|---|---|
| Before dealing | [round-6/desktop-before.png](round-6/desktop-before.png) | [round-6/phone-before.png](round-6/phone-before.png) |
| After dealing | [round-6/desktop-dealt.png](round-6/desktop-dealt.png) | [round-6/phone-dealt.png](round-6/phone-dealt.png) |

**Decision:** _pending_

## Round 7 — 2026-09-26

On a phone-sized screen (Galaxy S25, 360×780) there was a lot of empty space below the cards. The phone layout now fills the screen height: a taller Question card (about 44% of the height), then an area set aside for the dealt Matches so the Question card stays put when you deal, then the tally line near the bottom.

| State | Galaxy S25 (360×780) |
|---|---|
| Before dealing | [round-7/s25-before.png](round-7/s25-before.png) |
| After dealing | [round-7/s25-dealt.png](round-7/s25-dealt.png) |

**Decision:** _pending_

## Round 8 — 2026-09-26

On Q7 (three Matches) the fan didn't have enough horizontal room on a phone. The middle of the fan now always holds the kept card, or the best Match if none is kept yet, on top of the others. The other cards tuck in behind it on each side. Tapping a side card keeps it, and it slides into the middle. With only two Matches, the second card peeks out from the left only.

| State | Screenshot |
|---|---|
| Galaxy S25, Q7 (three Matches) | [round-8/s25-q7-dealt.png](round-8/s25-q7-dealt.png) |
| Galaxy S25, Q1 (two Matches, one kept) | [round-8/s25-q1-dealt.png](round-8/s25-q1-dealt.png) |
| Desktop, Q7 | [round-8/desktop-q7-dealt.png](round-8/desktop-q7-dealt.png) |

**Decision:** _pending_
