// PROTOTYPE — the co-writing chat (issues #12, #13), shown inside the D2 dashboard's Scenario Bank tab, where
// "Co-write with AI" leads. Round 2 variants ?variant=W4|W5|W6 (quieter W2); round 1 W1|W2|W3. ?from=gap starts from the Q6 Gap
// (legacy systems); ?answers=n pre-answers the first n questions with the sample answers (for screenshots).
import { useState } from "react";
import { PrototypeSwitcher, useVariant, type VariantDef } from "../PrototypeSwitcher";
import { useDashboard } from "../dashboard/data";
import { VariantD2 } from "../dashboard/VariantD2";
import { GAP_SEED, type Seed } from "./cowrite";
import { VariantW1 } from "./VariantW1";
import { VariantW2 } from "./VariantW2";
import { VariantW3 } from "./VariantW3";
import { QuietDraft } from "./QuietDraft";
import "../dashboard/dashboard.css";
import "../scenario-bank/scenario-bank.css";
import "./co-writing.css";

const variants: VariantDef[] = [
  { key: "W4", name: "Slim draft rail" },
  { key: "W5", name: "Draft chips above chat" },
  { key: "W6", name: "Draft in a drawer" },
  { key: "W2", name: "Chat with live draft (round 1)" },
  { key: "W1", name: "Chat, then draft" },
  { key: "W2", name: "Chat with live draft" },
  { key: "W3", name: "One question at a time" },
];

export function CoWritingPrototype() {
  const [variant, setVariant] = useVariant(variants);
  const dash = useDashboard();
  const [seed, setSeed] = useState<Seed>(() => (new URLSearchParams(location.search).get("from") === "gap" ? GAP_SEED : { kind: "scratch" }));
  const [run, setRun] = useState(0); // bump to restart the conversation
  const restart = () => setRun((r) => r + 1);
  const props = { seed, onRestart: restart };
  const k = `${variant}-${seed.kind}-${run}`;
  const page =
    variant === "W4" ? <QuietDraft key={k} {...props} mode="rail" />
    : variant === "W5" ? <QuietDraft key={k} {...props} mode="strip" />
    : variant === "W6" ? <QuietDraft key={k} {...props} mode="drawer" />
    : variant === "W1" ? <VariantW1 key={k} {...props} /> : variant === "W2" ? <VariantW2 key={k} {...props} /> : <VariantW3 key={k} {...props} />;

  const state = (
    <div className="db-state">
      <div>starting from: {seed.kind === "gap" ? `Gap — ${GAP_SEED.question}` : "scratch"}</div>
      <div>
        <button onClick={() => { setSeed({ kind: "scratch" }); restart(); }}>From scratch</button>
        <button onClick={() => { setSeed(GAP_SEED); restart(); }}>From the Q6 Gap</button>
        <button onClick={restart}>Restart</button>
      </div>
      <div>Tip: answer the last question without a number to see the missing-part flag.</div>
    </div>
  );

  return (
    <>
      <VariantD2 dash={dash} initialTab="bank" bankPage={page} />
      <PrototypeSwitcher variants={variants} current={variant} onChange={setVariant} state={state} />
    </>
  );
}
