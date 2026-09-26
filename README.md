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
  T7["#7 Pack import & Demo Scenarios"]
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
  T23["#23 Deploy & README"]
  T24["#24 Reflection document (human)"]

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
  T8 --> T9 & T10
  T10 --> T11 & T13 & T17
  T12 --> T13 & T22
  T6 --> T22
  T7 --> T16
  T14 --> T19 & T20 & T21 & T22
  T15 --> T17
  T9 & T11 & T13 --> T23

  classDef must fill:#2E3A8C,color:#fff,stroke:#2E3A8C
  classDef mustcrit fill:#2E3A8C,color:#fff,stroke:#D9822B,stroke-width:4px
  classDef should fill:#E2F2EF,color:#0B4F49,stroke:#0F7B72,stroke-width:2px
  classDef could fill:#fff,color:#4A5263,stroke:#8A93A6,stroke-width:2px,stroke-dasharray:5 4

  class T2,T4,T5,T10,T14,T15,T16,T18,T24 mustcrit
  class T3,T7,T8,T9,T11,T12,T13,T23 must
  class T6,T17,T19,T22 should
  class T20,T21 could
```
