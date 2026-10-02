# Prompts

Every place Interview Helper prompts a model: which model and settings it uses, what type of prompt it is and why, how it's checked, and what could make it better. The prompts themselves live in the code, linked from each section, so this page never goes out of date with them.

## What every prompt shares

- **Structured output.** Each call sends a Zod schema as JSON Schema, and the reply is checked against it. A reply that doesn't fit is refused, never guessed at.
- **Untrusted text stays data.** Everything the Candidate typed or pasted (Job Specs, Scenarios, Answers) is sent as JSON, or inside its own tags such as `<answer>…</answer>`, with that tag escaped inside the text (`src/model-gateway/delimited.ts`). Every system prompt says that text inside is data, never instructions.
- **The honesty rule.** Every prompt that touches the Candidate's career says never to add facts, figures, names or achievements they didn't give. Where a reply quotes the Candidate, code checks the quote is really there.
- **One gateway.** Every call goes through the Model Gateway (`src/model-gateway/ModelGateway.ts`) to the Worker, which picks the model and limits for each job (`worker/wrangler.jsonc`). App tests fake the gateway, so no test ever calls a real model.
- **Models from the course's allow-list.** `openai/gpt-5-mini` at **low** reasoning effort is the default: cheap, quick, and good enough on every check so far. GPT-5 models take no temperature on OpenRouter, so reasoning effort is the setting that's compared.

## The prompts

| Job | Where | Model · effort | Prompt type | Checked by |
|---|---|---|---|---|
| `question-generation`: role and company | [`questionGenerator.ts`](../src/interviews/questionGenerator.ts) | gpt-5-mini · low | Zero-shot extraction | App tests |
| `question-generation`: Questions | same | gpt-5-mini · low | Zero-shot, rule-based generation | App tests |
| `matching` | [`promptVariants.ts`](../src/matching/promptVariants.ts) | gpt-5-mini · low | **Five Prompt Variants**; rubric, zero-shot ships | The Matcher Report |
| `match-reasons`: reasons | [`matchReasons.ts`](../src/matching/matchReasons.ts) | gpt-5-mini · low | Zero-shot, constrained writing | The reason judge |
| `match-reasons`: Gap suggestion | same | gpt-5-mini · low | Zero-shot, constrained | App tests |
| `co-writing` | [`coWriter.ts`](../src/cowriting/coWriter.ts) | gpt-5-mini · low | Multi-turn chat, numbered rules, state in the system prompt | App tests, real chats (#12) |
| `feedback` | [`feedback.ts`](../src/interviews/feedback.ts) | gpt-5-mini · low | Checklist judge, quotes checked in code | App tests, a real check (#32) |
| `readiness-report` | [`readiness.ts`](../src/interviews/readiness.ts) | gpt-5-mini · **medium** | Rubric judge, quotes checked and level capped in code | App tests, a real check (#56) |
| `reason-judging` (eval only) | [`eval/src/reasons.ts`](../eval/src/reasons.ts) | **gemini-3.8-flash** · low | LLM-as-a-judge, calibrated | Its calibration set |

### Question generation

Two calls, both zero-shot. The first pulls the role and company out of a pasted Job Spec, or null for either; this is plain extraction, so instructions are enough. The second writes about 8 behavioural Questions, each tagged with the skill it tests. The rules are "Tell me about a time…" framing only, no technical or hypothetical Questions, and none that repeat the existing ones, which are sent along. The reply's schema bounds the count (5–10 for a new Interview), so a far-off reply is refused.

**Why zero-shot:** the task is well described by rules, and examples would pull every Interview's Questions towards the examples' wording.

**To improve:** other kinds of Question, such as technical, hypothetical or motivation ([#40](https://github.com/DerykHopley/interview-helper/issues/40)). A check that each Question's skill really is in the Job Spec.

### Matching

The LLM Matcher scores every Scenario 0–100 against one Question. It's the one job with **Prompt Variants**: five versions of the system prompt, each adding one technique to the same base, with the same message and output schema, so only the technique differs.

| Variant | What it adds |
|---|---|
| Zero-shot | The base: task, scoring, "judge only from what each Scenario says", the data rule |
| Few-shot | Three made-up Scenarios from a hospital ward, with their scores, so no Evaluation Set answer leaks in |
| Chain-of-thought | "Before scoring, reason step by step in notes…": the reply's `notes` field comes first |
| Persona | "You are an experienced interviewer…" |
| **Rubric, zero-shot** (ships) | Score bands: 80–100 strong and direct, 50–79 partial, 0–49 doesn't answer |

**Why the rubric ships:** in the Matcher Report all five ranked every Question right on the starter set. The rubric was the only cheap variant to resist **all six** prompt-injection attacks; zero-shot and persona resisted 4 of 6, and few-shot 5 of 6. Chain-of-thought also resisted all six but cost about twice as much and was slower. The bands also give the Gap threshold a stable meaning.

**To improve:**
- Revisit with the owner's harder Evaluation Set ([#16](https://github.com/DerykHopley/interview-helper/issues/16)), especially **minimal** effort. On the starter set it cost a third as much and was about 4× faster, but had the narrowest margin between real Matches and Gaps.
- Few-shot examples from the Pack's Example Scenarios.
- Combine the rubric with chain-of-thought (see the guide below).

### Match reasons and the Gap suggestion

A cheap second call writes one sentence per Match: which part of the Scenario answers the Question, using only facts written in it, speaking to the Candidate as "you". It's separate from scoring, so every Matcher's Matches read the same way. For a Gap, a similar call describes the *kind* of Scenario that would answer the Question, never an achievement.

**Why separate:** scoring and explaining are different jobs, and a scoring-only Matcher (an embedding model, say) still gets reasons.

**To improve:** reasons for the 2nd and 3rd Matches often stretch a weak Scenario to fit, because the prompt asks what answers the Question even when the honest answer is "only partly" ([#43](https://github.com/DerykHopley/interview-helper/issues/43)). A judge for the Matches themselves, not only their reasons ([#42](https://github.com/DerykHopley/interview-helper/issues/42)).

### Co-writing

The only multi-turn prompt: a chat with real user and assistant turns. The system prompt is a numbered rule set (11 rules):
- ask one plain-English question per STAR part, in order
- never add facts
- keep the Candidate's own words
- put a sentence that covers several parts into each of them
- one follow-up for a vague answer, then leave the part empty
- flag a missing measurable result rather than invent one

Each turn's reply is structured: the next message, the draft part by part, suggested skills, and whether it's ready for review. The draft so far goes back in the system prompt, in `<draft_so_far>` tags, so the model builds on it instead of redrafting from memory. When started from a Gap, the Gap's Question goes in `<gap_question>`, as context and never as a source of facts.

**Why rules, not examples:** the behaviour is procedural (what to ask next, when to stop), and examples would leak their content into Candidates' Scenarios. Real chats on #12 shaped several of the rules, including plain-English questions and one answer covering several parts.

**To improve:**
- **A known weakness:** a sentence given in answer to another part's question isn't moved to its part ([#22](https://github.com/DerykHopley/interview-helper/issues/22)).
- An LLM-judge honesty check on the finished draft ([#22](https://github.com/DerykHopley/interview-helper/issues/22)).
- A "what I learned" part, STAR-L ([#47](https://github.com/DerykHopley/interview-helper/issues/47)).

### Feedback on an Answer

A checklist judge, run against the Scenario the Candidate picked for that Question:
- each STAR part, said or missing
- a measurable result, said or missing
- every claim the Scenario doesn't support, quoted from the Answer
- whether the Answer shows the Question's skill

It never writes a better Answer. **Code checks its quotes:** a claim not found word for word in the Answer is dropped, and what it says the Scenario says is kept only if it's in the Scenario.

**Why a checklist:** fixed points are easy to show, compare between attempts and test, and a checklist has no room to rewrite the Answer. In a real check on #32, honest Answers weren't flagged and invented claims were.

**To improve:** few-shot examples of claims that are and aren't in a Scenario, for borderline paraphrases. Feedback on delivery (pace, filler words) from the voice recording, on the device.

### Readiness Report

A rubric judge over a whole Interview's Answers, against its Questions' skills and its Job Spec. It returns:
- **Readiness** (Ready, Nearly there, Not yet)
- each answered Question's rating
- strengths, quoting the Answers
- things to work on
- claims not in a picked Scenario

**Code keeps it honest:**
- Readiness is **capped at Nearly there** while any Question is unanswered.
- Quotes must appear word for word in that Answer.
- Claims are kept only for Answers with a picked Scenario.
- A Question the model leaves out shows as "not judged", never guessed at.

**Medium effort:** it's the one judgement over the whole Interview, it's asked for rarely, and it's still about half a cent.

**Why Readiness, never hire / no hire:** the model only sees typed or transcribed Answers. It knows nothing of delivery, the other candidates or the company's real bar, so "Not hired" would be a made-up judgement presented as fact. The prompt says to talk about how ready the Answers are, never about being hired, recommended or rejected. That rule was added after a real reply said "before recommending you".

**Real check (#56):** strong Answers came out Nearly there, held back by a brief incident Answer; weak ones Not yet; and both invented claims were flagged.

**To improve:** a mock-interview "run" with history, to show progress over time. A judge of the report itself on a labelled set of strong and weak Answer sets.

### Judging Match reasons (eval only)

The course's **LLM-as-a-judge**. For each Match reason it decides:
- **grounded:** every fact is in that Scenario
- **answers the Question:** it names the part of the Scenario that does

It quotes what's wrong. The reason's form (one sentence, at most 25 words, "you") is checked in code, since it needs no judgement.

**Why another company's model:** the reasons are written by gpt-5-mini, so a gemini judge doesn't grade its own kind of writing kindly. The judge is itself checked, on every run, against hand-written reasons with known verdicts, some with a planted invention (`eval/sets/fixture/reason-calibration.yaml`). It matched 10 of 10.

## Adding a Prompt Variant, e.g. rubric with chain-of-thought

A worked example of how a prompting technique is tried, measured and shipped.

1. **Write the variant.** In [`src/matching/promptVariants.ts`](../src/matching/promptVariants.ts), add an entry to `PROMPT_VARIANTS`. Reuse the shared parts (`TASK`, `JUDGE`, `DATA_RULE`) so only the technique differs. Keep `DATA_RULE` last: a test checks every variant ends with it.

   ```ts
   "rubric-chain-of-thought": {
     name: "Rubric, chain-of-thought",
     system: [
       TASK,
       "Score every Scenario from 0 to 100:",
       "- 80–100: strong, direct evidence of exactly what the Question asks.",
       "- 50–79: relevant, but partial or indirect.",
       "- 0–49: doesn't really answer the Question.",
       JUDGE,
       "Before scoring, reason step by step in notes: what the Question asks for, then which band each Scenario falls in and why. Keep notes brief.",
       DATA_RULE,
     ].join("\n"),
   },
   ```

   No schema change is needed: every variant's reply is `{ notes, scores }`, with `notes` first so a model can reason before it scores. The others leave it empty, and notes over 4,000 characters are cut short rather than failing the call.

2. **Run the tests.** `npm test`. The eval tests send every variant through a fake gateway and check its prompt.

3. **Compare it.** With the Worker running (`npm run dev:worker`), run `npm run eval -- --all-setups --runs 3`. This runs every Prompt Variant (and every reasoning effort) on the shipped model, 3 times each, and writes a dated report to `eval/reports/`. It spends real money: about 30–60 cents on the starter set. The new variant gets a row in the **Prompt Variants** table, ranked by top-1, then Gap mistakes, then attacks that reached their goal, then margin, then cost. Its **Gap threshold** is recorded in `src/matching/gapThresholds.json` under its own name.

   To change only the layout of a report later, use `npm run eval -- --render eval/reports/<report>.json`. It rebuilds the report from saved scores, with no calls.

4. **Ship it.** If it wins, set `promptVariant: "rubric-chain-of-thought"` in `MATCHING_CONFIG` (`src/matching/matchingConfig.ts`). That's one line. The Matcher's name includes its variant, model and effort, so the app picks up the threshold measured for exactly that Setup; an app test fails if none is recorded.

The same pattern (one technique at a time, the same schema, measured on the same set) would give the other jobs Prompt Variants too. For now only matching has them; the rest are tuned by real checks recorded on their tickets.
