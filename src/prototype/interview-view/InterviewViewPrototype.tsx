// PROTOTYPE — the Interview view (K1). Round 14: the missing states, and two places to manage Questions,
// via ?variant=S1|S2 (K1–K3 from round 12 still work). ?token=expired, ?scenario=generating, ?q=<n>, ?flipped=1. Earlier rounds: docs/prototypes/interview-view/README.md.
import { useState } from "react";
import { PrototypeSwitcher, useVariant, type VariantDef } from "../PrototypeSwitcher";
import { initialPicks, questions, scenarioById, useDeckRev, type Picks } from "./data";
import { VariantS1, VariantS2 } from "./VariantS";
import { DEMO_ANSWER } from "./dictation";
import { VariantK1 } from "./VariantK1";
import { VariantK2 } from "./VariantK2";
import { VariantK3 } from "./VariantK3";
import "./prototype.css";

const variants: VariantDef[] = [
  { key: "S1", name: "End-of-deck card" },
  { key: "S2", name: "Questions list" },
  { key: "K1", name: "Answer bar" },
  { key: "K2", name: "Answer on the card" },
  { key: "K3", name: "Speak first" },
];

export function InterviewViewPrototype() {
  const [variant, setVariant] = useVariant(variants);
  useDeckRev(); // re-render when Questions are added, deleted, matched or generated
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
    .map((q) => `${q.id}  ${q.unmatched ? "… not matched yet" : q.matches.length ? (picks[q.id] ? `→ ${scenarioById(picks[q.id]!).title}` : "· not picked") : "✕ GAP"}${answers[q.id] ? `  ✎ ${answers[q.id].split(/\s+/).length} words` : ""}`)
    .join("\n");

  return (
    <>
      {variant === "S1" && <VariantS1 {...props} />}
      {variant === "S2" && <VariantS2 {...props} />}
      {variant === "K1" && <VariantK1 {...props} />}
      {variant === "K2" && <VariantK2 {...props} />}
      {variant === "K3" && <VariantK3 {...props} />}
      <PrototypeSwitcher variants={variants} current={variant} onChange={setVariant} state={state} />
    </>
  );
}
