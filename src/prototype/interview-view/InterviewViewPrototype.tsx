// PROTOTYPE — round 3: the flashcard deck (round 2's E) with four ways of showing Matches,
// switchable via ?variant=E|G|H|J. Earlier rounds: see docs/prototypes/interview-view/README.md.
// Picks are shared in memory so you can compare the same state across variants.
import { useState } from "react";
import { PrototypeSwitcher, useVariant, type VariantDef } from "../PrototypeSwitcher";
import { initialPicks, questions, scenarioById, type Picks } from "./data";
import { VariantE } from "./VariantE";
import { VariantG } from "./VariantG";
import { VariantH } from "./VariantH";
import { VariantJ } from "./VariantJ";
import "./prototype.css";

const variants: VariantDef[] = [
  { key: "E", name: "One Match at a time" },
  { key: "G", name: "Dealt hand" },
  { key: "H", name: "Ranked list" },
  { key: "J", name: "Guess first" },
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
      {variant === "E" && <VariantE {...props} />}
      {variant === "G" && <VariantG {...props} />}
      {variant === "H" && <VariantH {...props} />}
      {variant === "J" && <VariantJ {...props} />}
      <PrototypeSwitcher variants={variants} current={variant} onChange={setVariant} state={state} />
    </>
  );
}
