# Co-writing chat — prototype decisions

Question: what should co-writing a Scenario with the AI look like (issue #12 Must, #13 Should; spec stories 33–41)? The AI only asks questions, flags missing parts instead of filling them, and arranges the Candidate's own answers into a draft. The Candidate edits, approves or discards the draft; only an approved draft is saved, with origin "co-written". Starting from a Gap re-matches that Question once the story is saved.

Co-writing starts from "Co-write with AI" in the Scenario Bank, or from a Gap, so the variants are built inside the D2 dashboard's Scenario Bank tab. Prototype code lives on the throwaway branch `prototype/co-writing`, not on main. It runs at `/prototype/co-writing` (`npm run prototype:co-writing`).

**No LLM is called.** A fixed script asks one question for each part of the story (what it's about → role → Situation → Task → Action → Result → measurable result). Each answer goes into its part of the draft word for word, so nothing is ever added. If the measurable result has no number in it, the script flags it once ("I didn't hear a number there… say 'none' and I'll leave that part empty rather than guess"). If you then say "none", that part stays empty, and the form won't let you save until you add one. That's the behaviour the real system prompt must enforce, so the screens can be judged against it. Replies are shown as plain text.

To try it:
- Every question has a "Use sample answer" button.
- The **state** panel switches between starting from scratch and starting from the Q6 Gap ("How have you kept a legacy system running while replacing it?", legacy systems).
- URL options: `?from=gap`, `?answers=n` (answer the first n questions with the samples) and `?flag=1` (answer the measurable result without a number).

After approving, it shows "✓ Saved to your Scenario Bank". Starting from a Gap, it then shows "Re-matching…" followed by "Gap closed", with the new Match and a link back to the Question.

## Round 1 — 2026-09-28

| Variant | Desktop | Galaxy S25 (360×780) |
|---|---|---|
| W1 — Chat, then draft: a plain chat thread, with the reply box fixed at the bottom. Once the last part is answered, the draft appears at the end of the thread as the Scenario form, pre-filled, with **Approve and save** / **Discard draft**. | [mid-chat](round-1/desktop-W1-mid.png) | [mid-chat](round-1/s25-W1-mid.png) |
| W2 — Chat with live draft: chat on the left, and on the right the draft filling in part by part as you answer, showing which words went where and what's still missing ("Answering now…" / "Not yet"). When it's done, the right side becomes the editable review. On a phone, Chat and Draft are two tabs. | [mid-chat](round-1/desktop-W2-mid.png) · [from a Gap](round-1/desktop-W2-gap.png) · [missing-part flag](round-1/desktop-W2-flag.png) · [review](round-1/desktop-W2-draft.png) | [chat tab](round-1/s25-W2-mid.png) |
| W3 — One question at a time: each AI question is a single cream card on the dark table, like the Interview view, with a row of chips for the story's parts showing progress above it and the answer box below. Earlier answers fold into "Show your answers so far". The last card turns into the review. | [mid](round-1/desktop-W3-mid.png) · [from a Gap](round-1/desktop-W3-gap.png) · [missing-part flag](round-1/desktop-W3-flag.png) | [mid](round-1/s25-W3-mid.png) · [review](round-1/s25-W3-draft.png) |

**Decision:** _pending_
