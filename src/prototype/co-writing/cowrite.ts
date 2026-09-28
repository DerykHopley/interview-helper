// PROTOTYPE — a scripted stand-in for the co-writing LLM (spec stories 33–41, issues #12 and #13). No model is
// called. The "assistant" asks one question per part of the Scenario, puts the Candidate's own words into that
// part verbatim, and flags a missing measurable result instead of inventing one. That is exactly the behaviour
// the real system prompt must enforce, so the screens can be judged against it.
import { useState } from "react";
import { blank, type Scenario } from "../scenario-bank/data";

export type Msg = { from: "assistant" | "candidate" | "system"; text: string; flag?: boolean };
export type Seed = { kind: "scratch" } | { kind: "gap"; question: string; skill: string; interview: string };

type Step = { key: keyof Scenario | "about"; ask: string; sample: string };

const STEPS: Step[] = [
  { key: "about", ask: "What's the story about? A sentence is fine — we'll fill in the detail together.", sample: "Keeping the old dispatch system running while we replaced it" },
  { key: "role", ask: "What was your role at the time?", sample: "Senior engineer on the dispatch team" },
  { key: "situation", ask: "What was going on? Just the context that matters.", sample: "The dispatch system was 12 years old and a rewrite was planned for 18 months, but the old one kept falling over at peak times." },
  { key: "task", ask: "What were you responsible for?", sample: "Keeping the old system stable until the new one was ready, without blocking the rewrite team." },
  { key: "action", ask: "What did you do? Say \"I\", not \"we\" — the steps you took yourself.", sample: "I set up alerting on the three jobs that failed most, wrote a runbook, and negotiated a change freeze on the old code so fixes only went in behind a flag." },
  { key: "result", ask: "What changed because of what you did?", sample: "The old system stayed up through two peak seasons and the rewrite shipped on time." },
  { key: "metrics", ask: "Is there a number you can back up — time, money, errors, people?", sample: "Peak-time outages went from 6 a month to 1." },
];

const GAP_SAMPLE_ABOUT = "Keeping the old dispatch system running while we replaced it";

type State = { messages: Msg[]; i: number; draft: Scenario; flagged: boolean };

function begin(seed: Seed): State {
  const messages: Msg[] =
    seed.kind === "gap"
      ? [
          { from: "system", text: `Starting from a Gap in ${seed.interview}: “${seed.question}” (${seed.skill})` },
          { from: "assistant", text: `Let's write the story this Question needs. Think of a time that shows ${seed.skill}. What's it about? A sentence is fine.` },
        ]
      : [{ from: "assistant", text: STEPS[0].ask }];
  return { messages, i: 0, draft: { ...blank(), origin: "co-written", tags: seed.kind === "gap" ? [seed.skill] : [] }, flagged: false };
}

/** One Candidate reply → the next state. Pure, so the same script drives the UI and ?answers=n replays. */
function reply(s: State, text: string): State {
  const answer = text.trim();
  if (!answer || s.i >= STEPS.length) return s;
  const step = STEPS[s.i];
  const messages: Msg[] = [...s.messages, { from: "candidate", text: answer }];

  // Measurable result: flag it rather than invent one (story 37).
  if (step.key === "metrics") {
    const none = /^(none|no|n\/a|nothing)\b/i.test(answer);
    const hasNumber = /\d/.test(answer);
    if (!hasNumber && !none && !s.flagged) {
      messages.push({ from: "assistant", flag: true, text: "I didn't hear a number there. A measurable result makes the story much stronger — do you have one, even a rough one? If not, say “none” and I'll leave that part empty rather than guess." });
      return { ...s, messages, flagged: true };
    }
    messages.push({
      from: "assistant",
      text: hasNumber
        ? "Thanks. Your draft is ready: it's your own answers, arranged into the story format. I haven't added anything you didn't say."
        : "OK — I've left the measurable result empty. Your draft is ready: it's your own answers, arranged. Add a number if one comes to mind; the draft can't be saved without one.",
    });
    return { ...s, messages, i: STEPS.length, draft: { ...s.draft, metrics: hasNumber ? answer : "" } };
  }

  const draft = step.key === "about"
    ? { ...s.draft, title: answer.length > 70 ? answer.slice(0, 67) + "…" : answer }
    : { ...s.draft, [step.key]: answer };
  messages.push({ from: "assistant", text: STEPS[s.i + 1].ask });
  return { ...s, messages, draft, i: s.i + 1 };
}

const sampleFor = (seed: Seed, i: number) => (i >= STEPS.length ? "" : i === 0 && seed.kind === "gap" ? GAP_SAMPLE_ABOUT : STEPS[i].sample);

export function useCowrite(seed: Seed) {
  const [s, setS] = useState<State>(() => {
    // ?answers=n replays the first n sample answers (for screenshots of later stages).
    const n = Number(new URLSearchParams(location.search).get("answers") ?? 0);
    let st = begin(seed);
    for (let k = 0; k < n; k++) st = reply(st, sampleFor(seed, st.i));
    // ?flag=1 then answers the measurable-result question without a number, to show the missing-part flag.
    if (new URLSearchParams(location.search).has("flag")) st = reply(st, "The team was really happy with how it went.");
    return st;
  });
  const done = s.i >= STEPS.length;
  return {
    messages: s.messages,
    draft: s.draft,
    setDraft: (d: Scenario) => setS((x) => ({ ...x, draft: d })),
    send: (text: string) => setS((x) => reply(x, text)),
    sample: () => sampleFor(seed, s.i),
    done,
    stage: done ? "draft" : (STEPS[s.i].key as string),
    stepIndex: Math.min(s.i, STEPS.length),
    total: STEPS.length,
  };
}

export type Cowrite = ReturnType<typeof useCowrite>;

// Which parts of the draft are filled, for progress displays.
export const PARTS: { key: keyof Scenario; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "role", label: "Role" },
  { key: "situation", label: "Situation" },
  { key: "task", label: "Task" },
  { key: "action", label: "Action" },
  { key: "result", label: "Result" },
  { key: "metrics", label: "Measurable result" },
];

export const GAP_SEED: Extract<Seed, { kind: "gap" }> = { kind: "gap", question: "How have you kept a legacy system running while replacing it?", skill: "legacy systems", interview: "Senior Product Engineer — Northwind" };
