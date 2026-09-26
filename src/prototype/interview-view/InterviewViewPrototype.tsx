// PROTOTYPE — the Interview view, variant K (dark table). Round 12: three ways to answer the Question by typing
// or by voice, switchable via ?variant=K1|K2|K3. Earlier rounds: docs/prototypes/interview-view/README.md.
import { useState } from "react";
import { PrototypeSwitcher, useVariant, type VariantDef } from "../PrototypeSwitcher";
import { initialPicks, questions, scenarioById, type Picks } from "./data";
import { DEMO_ANSWER } from "./dictation";
import { VariantK1 } from "./VariantK1";
import { VariantK2 } from "./VariantK2";
import { VariantK3 } from "./VariantK3";
import "./prototype.css";

const variants: VariantDef[] = [
  { key: "K1", name: "Answer bar" },
  { key: "K2", name: "Answer on the card" },
  { key: "K3", name: "Speak first" },
];

export function InterviewViewPrototype() {
  const [variant, setVariant] = useVariant(variants);
  const [picks, setPicks] = useState<Picks>(initialPicks);
  const pick = (q: string, s: string | undefined) => setPicks((p) => ({ ...p, [q]: s }));
  // ?answer=demo pre-fills Q1's answer (for screenshots)
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    new URLSearchParams(location.search).get("answer") === "demo" ? { q1: DEMO_ANSWER } : ({} as Record<string, string>),
  );
  const setAnswer = (q: string, text: string | ((previous: string) => string)) =>
    setAnswers((a) => ({ ...a, [q]: typeof text === "function" ? text(a[q] ?? "") : text }));
  const props = { picks, pick, answers, setAnswer };

  const state = questions
    .map((q) => `${q.id}  ${q.matches.length ? (picks[q.id] ? `→ ${scenarioById(picks[q.id]!).title}` : "· not picked") : "✕ GAP"}${answers[q.id] ? `  ✎ ${answers[q.id].split(/\s+/).length} words` : ""}`)
    .join("\n");

  return (
    <>
      {variant === "K1" && <VariantK1 {...props} />}
      {variant === "K2" && <VariantK2 {...props} />}
      {variant === "K3" && <VariantK3 {...props} />}
      <PrototypeSwitcher variants={variants} current={variant} onChange={setVariant} state={state} />
    </>
  );
}
