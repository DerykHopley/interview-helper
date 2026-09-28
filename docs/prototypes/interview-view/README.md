# Interview view — prototype decisions

Question: what should the Interview view (Questions → Matches → pick → Gaps) look like?

**Outcome:** K1, the answer bar on the dark table (round 12). One Question at a time on a flashcard deck on a dark card table:
- Swipe, the faint side arrows or ← → move between Questions.
- Tapping the card, or "Deal my Matches", fans the Matches out below it as tilted, overlapping cards, with the kept card (or the best Match) in the middle. Tapping another card keeps it. Tapping the Question card again hides the Matches.
- A chat-style bar fixed at the bottom takes a typed or spoken answer.

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

## Round 9 — 2026-09-26

The Question card is larger until the Matches are dealt, then shrinks back to its round 8 size to make room for them (a 0.3-second animation). On desktop the card goes from 600×440 to 520×340 and the Question text from 34px to 28px. On a phone the card goes from about 58% of the screen height to 42%, with the text shrinking to match.

| State | Galaxy S25 (360×780) | Desktop (1440×900) |
|---|---|---|
| Before dealing (large) | [round-9/s25-before.png](round-9/s25-before.png) | [round-9/desktop-before.png](round-9/desktop-before.png) |
| After dealing (round 8 size) | [round-9/s25-dealt.png](round-9/s25-dealt.png) | [round-9/desktop-dealt.png](round-9/desktop-dealt.png) |

**Decision:** _pending_

## Round 10 — 2026-09-26

You can now hide the Matches again. Tapping the Question card switches between dealing the Matches and hiding them. While they are showing, the card's hint reads "Tap to hide your Matches". Hiding them returns the card to its larger size and brings back the "Deal my Matches" button. Your kept Match stays kept.

| State | Galaxy S25 (360×780) | Desktop (1440×900) |
|---|---|---|
| Dealt, with the hide hint | [round-10/s25-dealt.png](round-10/s25-dealt.png) | [round-10/desktop-dealt.png](round-10/desktop-dealt.png) |

**Decision:** _pending_

## Round 11 — 2026-09-26

The two-card fan is now balanced. The whole fan is centred on the screen, so two cards sit evenly either side of the middle. The kept card (or the best Match) is on the right, on top and raised. Tapping the other card keeps it, and the two cards swap sides. The three-card fan is unchanged.

| State | Screenshot |
|---|---|
| Galaxy S25, Q1 (two Matches) | [round-11/s25-q1-dealt.png](round-11/s25-q1-dealt.png) |
| Desktop, Q1 (two Matches) | [round-11/desktop-q1-dealt.png](round-11/desktop-q1-dealt.png) |
| Galaxy S25, Q7 (three Matches, unchanged) | [round-11/s25-q7-dealt.png](round-11/s25-q7-dealt.png) |

**Decision:** _pending_

## Round 12 — 2026-09-26

Question: how does the Candidate type or speak their answer to the Question? Three versions of K. Answers are kept in memory only. Voice uses the browser's built-in speech-to-text where it exists; where it doesn't (e.g. Firefox, or a page opened without a secure connection), a simulated transcript types itself out, marked "simulated voice".

| Variant | Galaxy S25, dealt | Galaxy S25, answering | Desktop, answering |
|---|---|---|---|
| K1 — Answer bar: a chat-style text box fixed at the bottom of the screen with a mic button beside it; it grows while you write, and the Matches stay visible above | [dealt](round-12/s25-K1-dealt.png) | [answering](round-12/s25-K1-answering.png) | [answering](round-12/desktop-K1-answering.png) |
| K2 — Answer on the card: "✎ Answer this Question" turns the Question card over to a writing pad (the Matches are put away), with the kept story named, a large mic button, and "Done" to turn it back | [dealt](round-12/s25-K2-dealt.png) | [answering](round-12/s25-K2-answering.png) | [answering](round-12/desktop-K2-answering.png) |
| K3 — Speak first: a big mic button under the Matches ("Tap to answer out loud") opens a sheet from the bottom with a timer and the live transcript, which you can edit; a ⌨ button opens it for typing | [dealt](round-12/s25-K3-dealt.png) | [answering](round-12/s25-K3-answering.png) | [answering](round-12/desktop-K3-answering.png) |

**Notes for the real build**
- **Privacy:** Chrome's built-in speech-to-text sends the audio to Google's servers. That sits badly with ADR 0001 (Candidate data never leaves the browser) and with the OpenRouter no-retention settings. Options to weigh: speech recognition that runs on the device where the browser supports it, a Whisper-style model running in the browser (like the local embedding Matcher), or voice as a clearly labelled opt-in.
- **Secure connection:** speech recognition only works on a secure page: `localhost`, or HTTPS. Opening the dev server from a phone over plain `http://` on the local network falls back to the simulated voice.

**Decision:** K1, the answer bar, is the core interview flow. The deck stays in view, with a chat-style bar at the bottom for typing or speaking the answer.

## Round 13 — 2026-09-28

K1 gets a header, so the practice screen connects to the rest of the app. The header is fixed to the top, so it stays put while cards swipe, and it matches the D2 dashboard's top bar. It has:
- **← Interviews**, back to the dashboard.
- **Which Interview:** the role and company.
- **Progress:** a bar with "2/8 picked · 0 answered · 2 Gaps".
- **Access · 6h left** and **🔒 Lock**.

On a phone it shrinks to ←, the role and company, and a lock icon, with the progress line underneath. The Access status is hidden there.

| State | Desktop | Galaxy S25 (360×780) |
|---|---|---|
| Before dealing | [page](round-13/desktop-K1-header.png) | [page](round-13/s25-K1-header.png) |
| Dealt | [page](round-13/desktop-K1-header-dealt.png) | [page](round-13/s25-K1-header-dealt.png) |

**Decision:** _pending_

## Round 14 — 2026-09-28

The K1 Interview screen gets the states it was missing (issues #8, #9, #10 and #13). All versions share these:
- **Finding Matches (#10):** a Question's Matches are found the first time it's dealt. While that happens, three shimmering placeholder cards fan out with "Finding your Matches…". The button reads "Find my Matches" until then. In the sample, Questions 6–8 haven't been matched yet.
- **Access Token expired:** dealing an unmatched Question shows "Matches can't be found — your Access Token has expired", with "Enter a new token". Stories and answers keep working. The header chip reads "Access expired".
- **Gap card on the dark table (#13):** a dashed orange outline ("Gap · legacy systems — No story fits this Question yet"), with the suggestion, **Write a Scenario for this** (opens the co-writing chat started from this Gap), and **Re-run matching**.
- **⋯ menu on each Question card:** **Re-run matching** (needs an Access Token) and **Delete this Question**.
- **A new Interview (#9):** "Writing your Questions…" with placeholder lines until about 8 Questions arrive. With an expired token it says "Questions can't be written right now" and offers typing your own instead.
- **Your own Questions (#8):** they're marked "· typed by you", and their Matches are found when dealt.
- **Ask for more (#9):** "Ask for 4 more Questions". It's off without a token, and after it's been used once.

S1 and S2 differ only in where you manage Questions:

| Variant | Desktop | Galaxy S25 (360×780) |
|---|---|---|
| S1 — End-of-deck card: after the last Question, a card says "That's all 8 Questions" with **Ask for 4 more Questions** and a box to add your own. | [end card](round-14/desktop-S1-end.png) | [end card](round-14/s25-S1-end.png) |
| S2 — Questions list: a **☰ Questions** button in the header opens a side list of every Question, with its status (✓ kept, ! Gap, dashed = not matched yet). Tap one to jump to it, 🗑 to delete it; add your own or ask for more at the bottom. | [list](round-14/desktop-S2-list.png) | [list](round-14/s25-S2-list.png) |

| Shared state | Desktop | Galaxy S25 |
|---|---|---|
| Finding Matches | [finding](round-14/desktop-finding.png) | [finding](round-14/s25-finding.png) |
| Gap card | [Gap](round-14/desktop-gap.png) | [Gap](round-14/s25-gap.png) |
| Token expired | [expired](round-14/desktop-expired.png) | |
| New Interview, Questions being written | [writing](round-14/desktop-generating.png) · [token expired](round-14/desktop-generating-expired.png) | |

URL options: `?variant=S1|S2`, `?token=expired`, `?scenario=generating`, `?matched=1` (every Question already matched), `?list=1` (S2's list open), `?q=9` (S1's end card).

**Decision:** _pending_
