// PROTOTYPE — round 4: G's dealt hand, plus three ways of adding H's dark contrast,
// switchable via ?variant=K|G|L|M. K (the round 4 pick) is the default. Earlier rounds: see docs/prototypes/interview-view/README.md.
// Picks are shared in memory so you can compare the same state across variants.
import { useState } from "react";
import { PrototypeSwitcher, useVariant, type VariantDef } from "../PrototypeSwitcher";
import { initialPicks, questions, scenarioById, type Picks } from "./data";
import { VariantG } from "./VariantG";
import { VariantK } from "./VariantK";
import { VariantL } from "./VariantL";
import { VariantM } from "./VariantM";
import "./prototype.css";

const variants: VariantDef[] = [
  { key: "K", name: "Dark table" },
  { key: "G", name: "Dealt hand (round 3)" },
  { key: "L", name: "Card turns over" },
  { key: "M", name: "Hand on the card" },
];

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
      {variant === "G" && <VariantG {...props} />}
      {variant === "K" && <VariantK {...props} />}
      {variant === "L" && <VariantL {...props} />}
      {variant === "M" && <VariantM {...props} />}
      <PrototypeSwitcher variants={variants} current={variant} onChange={setVariant} state={state} />
    </>
  );
}
