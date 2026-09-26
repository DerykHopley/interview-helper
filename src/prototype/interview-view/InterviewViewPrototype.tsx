// PROTOTYPE — the Interview view, variant K (dark table), chosen after five rounds.
// Earlier variants are in the git history of this branch; see docs/prototypes/interview-view/README.md.
// The switcher stays for its state panel and so new K variants can be added.
import { useState } from "react";
import { PrototypeSwitcher, useVariant, type VariantDef } from "../PrototypeSwitcher";
import { initialPicks, questions, scenarioById, type Picks } from "./data";
import { VariantK } from "./VariantK";
import "./prototype.css";

const variants: VariantDef[] = [{ key: "K", name: "Dark table" }];

export function InterviewViewPrototype() {
  const [variant, setVariant] = useVariant(variants);
  const [picks, setPicks] = useState<Picks>(initialPicks);
  const pick = (q: string, s: string | undefined) => setPicks((p) => ({ ...p, [q]: s }));
  const props = { picks, pick };

  const state = questions
    .map((q) => `${q.id}  ${q.matches.length ? (picks[q.id] ? `→ ${scenarioById(picks[q.id]!).title}` : "· not picked") : "✕ GAP"}`)
    .join("\n");

  return (
    <>
      {variant === "K" && <VariantK {...props} />}
      <PrototypeSwitcher variants={variants} current={variant} onChange={setVariant} state={state} />
    </>
  );
}
