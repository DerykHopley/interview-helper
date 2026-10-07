# How this project was built with AI

The workflow I used to build Interview Helper with Claude Code and Matt Pocock's skills, as of October 2026. It's specific to this project: I plan to try other workflows on other projects and compare them, so this is one data point rather than a recipe. Every ticket, decision comment, review and manual test record mentioned here is in this repo; [where to see it](#where-to-see-it-in-this-repo) is at the end.

## Why Matt Pocock's skills

They're a good way for an existing developer to move into AI-assisted work, because they're built around the developer, not instead of them. They don't hand the whole job to the model. They give you the habits of a good senior engineer as commands: interview me about the idea, write it up as a spec, split it into tickets, build it test-first, review it on two axes. You stay in charge of the decisions; the skills make sure the right questions get asked.

## The flow, start to finish

0. **`/setup-matt-pocock-skills`**, once per repo. It sets up where the issues live (GitHub Issues for me), the labels, and the docs layout: a `GLOSSARY.md` glossary and `docs/adr/` for decisions.
1. **Understand the idea as well as you can, then `/grill-with-docs`.** Explain it as fully as you can, and give it everything: examples, another spec to base it on, links. It asks questions one round at a time, each with a recommended answer, and writes the glossary and decision records as you go.
   - **Answer the questions; don't just accept the recommendations.** Discuss why, or how something would work.
   - **Ask for alternatives.** The model will run with whatever you tell it, including a wrong approach. Ask "what are the other options?" Claude knows a lot, but links you give it help more.
   - **Talk through the tech stack.** A static site, or fully scalable infrastructure on AWS? Say what you need and what you don't.
2. **`/to-spec`** turns that conversation into a spec, filed as an issue.
3. **`/to-tickets`** breaks the spec into tickets, each saying what blocks it. Matt's skills come with default labels, and you can add your own. I added a priority label (must, should, could), mainly so I can see priorities at a glance. My README has a chart of the tickets and how they depend on each other, and each ticket greys out in its own PR when it's done.
4. **`/prototype`**: ask for three versions of a screen. Look at each, pick one, or mix them: the header of one and the main part of another. Then check the spec against what the designs decided, and add the chosen design to its ticket.
5. **`/implement` each ticket**, with **`/tdd`** inside it: test first, watch it fail, make it pass.

## The loop for each ticket

This is where most of the value is. For every ticket I ask Claude to:

1. **Read the ticket, the spec and the design, and ask me about anything unclear before building**, each question with its recommendation. If it gets stuck later, it asks again rather than guessing.
2. **Record my decisions on the ticket** as a comment, so they don't live only in a chat that will be cleared.
3. **Agree the test seams** (what gets faked, and where) before writing tests.
4. **Build test-first, then prove the key tests.** For each important rule it undoes the fix and checks that a test fails. If a test still passes, it's passing for the wrong reason and needs strengthening. This has caught a few weak tests.
5. **Check it for real:**
   - **CI on every push.** My machine is fast, so CI catches timing bugs that local runs hide.
   - **The tests with storage deliberately slowed down**, which catches races.
   - **A real browser at desktop and phone width.**
   - **A real paid model call where it matters.** It always asks first, with a cost estimate (usually cents).
6. **Run `/code-review`**, which reviews on two axes in parallel: standards (bugs, standards violations, code smells) and spec (what's missing, what wasn't asked for, what's wrong). I get both lists with a recommendation and choose what to fix.
7. **Push and open a PR only when I say so**, with a **manual test record** posted on the PR: step-by-step checks for me to do by hand.
8. **I review the PR and test it myself.** I often find issues that only a human finds, because I did something silly or unexpected that the model didn't think of.

## Be part of the process

- **Review often.** Don't let it run for hours unwatched.
- **Ask for reports and comparisons.** My project's evaluation report compares prompts and models side by side, with an interactive page for each run. When I couldn't choose a speech model, I asked for a comparison page and recorded my own answers on it.
- **Disagree when it's wrong, and listen when it disagrees with you.** I asked for a "hire / no hire" verdict at the end of an interview. Claude pointed out the model can't know the company's bar or the other candidates, so a verdict would be made up. We built a "Readiness" estimate instead, and it's a better feature.
- **Save decisions often.** Put them in tickets, PR descriptions, the glossary and the decision records. Claude Code also keeps its own memory. Before `/compact` or `/clear`, ask: "Is there anything you need to save?"

## What this caught

- **Things only I found by testing by hand.** A rich first answer in the co-writing chat was filed only as the title. A question ("What was your Task?") read as jargon. A hint said "say I, not we" when I hadn't said "we". Each became a prompt fix the same day.
- **Bugs the reviews found before I merged.** A Reset button that left old numbers in the boxes. Settings that went stale across browser tabs. The cost total missing calls that failed after being billed.
- **Mistakes in its own notes.** A docs review found the README claiming something the code doesn't do. The claim came from a note in Claude's memory that was wrong, and it corrected the note.
- **Things only a real run shows.** One real call found my local server running an old config and the panel crashing on it. Blocking a CDN showed that voice depends on it, which my earlier notes had wrongly said it didn't.

## Tips

- Use CI from day one.
- Don't let it commit or push without asking, and tell it to stage files by name. Mine once swept an untracked file of mine into a commit.
- Keep a glossary (`GLOSSARY.md`). The same words in the code, the tickets and the UI save a lot of confusion.
- Short sessions with saved decisions beat one long session.

## Where to see it in this repo

- **The spec:** [#1](https://github.com/DerykHopley/interview-helper/issues/1), written by `/to-spec`, with the user stories, modules and out-of-scope list.
- **Tickets and their labels:** [the issues](https://github.com/DerykHopley/interview-helper/issues), and the dependency chart at the bottom of the [README](../README.md#how-it-was-built).
- **Decisions recorded on a ticket:** [#56](https://github.com/DerykHopley/interview-helper/issues/56), the Readiness Report, from a `/grill-with-docs` session through to its real check.
- **A PR with its review and manual test record:** [PR #57](https://github.com/DerykHopley/interview-helper/pull/57).
- **The glossary and decision records:** [`GLOSSARY.md`](../GLOSSARY.md) and [`docs/adr/`](adr/).
- **The prototypes:** [`docs/prototypes/`](prototypes/README.md), each round with its screenshots and the version chosen.
- **The reports and comparisons:** [`eval/reports/`](../eval/reports/) (the Matcher Reports and their interactive pages) and the [voice comparison page](prototypes/voice/).
- **The prompts:** [`docs/prompts.md`](prompts.md).
