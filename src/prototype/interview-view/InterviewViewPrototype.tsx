// PROTOTYPE — three radically different layouts of the Interview view (Questions → Matches → pick → Gaps),
// switchable via ?variant=A|B|C. Picks are shared in memory so you can compare the same state across variants.
import { useState } from "react";
import { PrototypeSwitcher, useVariant, type VariantDef } from "../PrototypeSwitcher";
import { initialPicks, questions, scenarioById, type Picks } from "./data";
import { VariantA } from "./VariantA";
import { VariantB } from "./VariantB";
import { VariantC } from "./VariantC";
import "./prototype.css";

const variants: VariantDef[] = [
  { key: "A", name: "Split pane" },
  { key: "B", name: "One at a time" },
  { key: "C", name: "Coverage board" },
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
      {variant === "A" && <VariantA {...props} />}
      {variant === "B" && <VariantB {...props} />}
      {variant === "C" && <VariantC {...props} />}
      <PrototypeSwitcher variants={variants} current={variant} onChange={setVariant} state={state} />
    </>
  );
}
