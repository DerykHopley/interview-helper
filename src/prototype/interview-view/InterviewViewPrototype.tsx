// PROTOTYPE — round 2: four one-Question-at-a-time layouts of the Interview view (Questions → Matches → pick → Gaps),
// switchable via ?variant=B|D|E|F. Round 1 (A split pane, C coverage board) is in commit afd70b2. Picks are shared in memory so you can compare the same state across variants.
import { useState } from "react";
import { PrototypeSwitcher, useVariant, type VariantDef } from "../PrototypeSwitcher";
import { initialPicks, questions, scenarioById, type Picks } from "./data";
import { VariantB } from "./VariantB";
import { VariantD } from "./VariantD";
import { VariantE } from "./VariantE";
import { VariantF } from "./VariantF";
import "./prototype.css";

const variants: VariantDef[] = [
  { key: "B", name: "One at a time (round 1)" },
  { key: "D", name: "Interviewer chat" },
  { key: "E", name: "Flashcards" },
  { key: "F", name: "Rehearsal desk" },
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
      {variant === "B" && <VariantB {...props} />}
      {variant === "D" && <VariantD {...props} />}
      {variant === "E" && <VariantE {...props} />}
      {variant === "F" && <VariantF {...props} />}
      <PrototypeSwitcher variants={variants} current={variant} onChange={setVariant} state={state} />
    </>
  );
}
