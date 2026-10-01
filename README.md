### Turing College: AI Engineering 
**Sprint 1:** Foundations of LLM Application Development

**Task:** Build an Interview Practice App

# Problem Statement

A Candidate preparing for a job interview has a handful of strong, real stories from their career, but in the moment of being asked a question they struggle to recall which story fits best, reuse the same story too often, and only discover the stories they are missing when they are already in the interview. Existing practice tools either invent generic model answers (which tempts the Candidate to claim things they never did) or require sending personal career history to a service that stores it.

This is also an educational project: the owner and a small group of fellow learners and teachers want to try it for short, time-boxed sessions, compare how well different kinds of models do the matching, and have the codebase show good practice in security, TDD and LLM evaluation on a public GitHub repo — all on a near-zero budget.

## Build Tickets 
```mermaid
flowchart LR
  T2["#2 Project skeleton & test boundaries"]
  T3["#3 Access Token gate"]
  T4["#4 Vault: Unlock Key & encryption"]
  T5["#5 Scenario Bank, by hand"]
  T6["#6 Scenario Export & import"]
  T7["#7 Pack presets & Demo Scenarios"]
  T8["#8 Interviews with typed Questions"]
  T9["#9 Question generation"]
  T10["#10 Matching (default LLM Matcher)"]
  T11["#11 Picking a Match, already used"]
  T12["#12 Co-writing from scratch"]
  T13["#13 Co-writing from a Gap"]
  T14["#14 Eval harness & first Matcher Report"]
  T15["#15 Prompt Variants & settings"]
  T16["#16 Build the Evaluation Set (human)"]
  T17["#17 Developer panel"]
  T18["#18 GPT-5 sizes & reason judge"]
  T19["#19 Jailbreak workbook"]
  T20["#20 Jev Matcher"]
  T21["#21 Local & embedding Matchers"]
  T22["#22 Honesty check & real-data run"]
  T23["#23 Deployed end-to-end check & README"]
  T24["#24 Reflection document (human)"]
  T30["#30 Deploy app & Worker (human)"]
  T31["#31 Answer bar: typed answers"]
  T32["#32 Feedback on an answer"]
  T33["#33 Voice input (in-browser Whisper)"]

  %% critical path (thick arrows)
  T2 ==> T4 ==> T5 ==> T10 ==> T14
  T14 ==> T15 ==> T24
  T14 ==> T16 ==> T24
  T14 ==> T18 ==> T24

  %% other dependencies
  T2 --> T3
  T3 --> T9 & T10 & T12
  T4 --> T8
  T5 --> T6 & T7 & T12
  T8 --> T9 & T10 & T31
  T10 --> T11 & T13 & T17
  T12 --> T13 & T22
  T7 --> T16
  T14 --> T19 & T20 & T21 & T22
  T15 --> T17
  T31 --> T32 & T33
  T11 --> T32
  T30 & T9 & T10 --> T23

  classDef done fill:#EEF0F4,color:#8A93A6,stroke:#C5CAD6,stroke-width:1px
  classDef must fill:#2E3A8C,color:#fff,stroke:#2E3A8C
  classDef mustcrit fill:#2E3A8C,color:#fff,stroke:#D9822B,stroke-width:4px
  classDef should fill:#E2F2EF,color:#0B4F49,stroke:#0F7B72,stroke-width:2px
  classDef could fill:#fff,color:#4A5263,stroke:#8A93A6,stroke-width:2px,stroke-dasharray:5 4

  class T2,T3,T4,T5,T7,T8,T9,T10,T11,T12,T13,T14,T15,T18,T31,T32,T33 done
  class T16,T24 mustcrit
  class T23,T30 must
  class T6,T17,T19,T20 should
  class T21,T22 could
```

## Running it locally

You need Node 24 or later.

```sh
npm install
cp worker/dev.vars.example worker/.dev.vars   # then fill in both values (see below)
npm run dev:worker                            # the Worker, on http://localhost:8787
npm run dev                                   # the app, on http://localhost:5173
```

`worker/.dev.vars` holds the Worker's two secrets for local development. It's gitignored, so never commit it.

| Secret | What it is |
|---|---|
| `OPENROUTER_API_KEY` | Your OpenRouter API key. Only the Worker ever sees it; it never reaches the browser. |
| `ACCESS_TOKEN_SECRET` | Any long random string, e.g. from `openssl rand -hex 32`. The Worker uses it to check Access Tokens, and you use it to mint them. |

Keep the example file's name as it is: Wrangler reads any file named `.dev.vars.<something>` as an environment's settings, and its empty values would override your real ones.

Checks: `npm run typecheck`, `npm run lint`, `npm test`. These are the same checks CI runs on every push. Tests never call a real model.

## Access Tokens

An Access Token lets a group use the app's AI features for a limited time. Minting one is a **manual step for the app owner**. It runs on your machine with a local script, so only someone who knows the Worker's `ACCESS_TOKEN_SECRET` can create tokens. There is no web page for it.

### Minting a token

```sh
npm run token -- --label cohort1              # lasts 8 hours (the default)
npm run token -- --label cohort1 --hours 24   # up to 168 hours (7 days)
```

It prints the token, for example `IH-COHORT1-1NBP7RK-PH6XVCZGFXZXAM9R`, and when it expires. Share the token with the group, who paste it into the app's **Access Token** field.

- **Label:** names the group in the Worker's usage logs, which record only label, job, model and cost. Use lowercase letters and digits only, with no hyphens: `cohort1`, not `cohort-1`.
- **Hours:** how long the token lasts, 8 by default. The Worker refuses any token that would last longer than 7 days.
- **Signing secret:** the script signs with `ACCESS_TOKEN_SECRET` from your environment, or, if that isn't set, from `worker/.dev.vars`. To mint tokens for the deployed Worker, use the same value you gave it:

  ```sh
  ACCESS_TOKEN_SECRET=<the deployed secret> npm run token -- --label cohort1
  ```

### Why the signature is 80 bits

The token's signature is HMAC-SHA256 cut to its first 80 bits. RFC 2104 §5 suggests keeping at least half the hash (128 bits), which would make the signature 26 characters instead of 16. We chose the shorter token so it can be read out or typed. To forge one, an attacker has to guess the signature by sending requests to the Worker, one guess per request, and 2^80 guesses can't happen before a token expires (7 days at most).

### Revoking tokens

Tokens can't be revoked one at a time. To end every outstanding token at once, change the Worker's `ACCESS_TOKEN_SECRET` (for the deployed Worker, `wrangler secret put ACCESS_TOKEN_SECRET`). Then mint new tokens with the new secret.
