// PROTOTYPE — the Developer panel (issue #17) over the chosen Interview screen (S3). Hidden until revealed with
// ?dev=1 or Ctrl+Shift+D. Three layouts via ?variant=P1|P2|P3; ?open=1 opens it, ?overrides=1 starts with some
// settings changed from the defaults, ?tab=calls opens P1's call log.
import { useEffect, useState } from "react";
import { PrototypeSwitcher, useVariant, type VariantDef } from "../PrototypeSwitcher";
import { VariantS3 } from "../interview-view/VariantS";
import { initialPicks, useDeckRev, type Picks } from "../interview-view/data";
import { useDev } from "./dev";
import { P1Drawer, P2Dock, P3Pill } from "./Variants";
import "../interview-view/prototype.css";
import "./dev-panel.css";

const variants: VariantDef[] = [
  { key: "P1", name: "Side drawer" },
  { key: "P2", name: "Bottom dock" },
  { key: "P3", name: "Floating pill" },
];

export function DevPanelPrototype() {
  const [variant, setVariant] = useVariant(variants);
  useDeckRev();
  const dev = useDev();
  const [picks, setPicks] = useState<Picks>(initialPicks);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const props = {
    picks, answers,
    pick: (q: string, s: string | undefined) => setPicks((p) => ({ ...p, [q]: s })),
    setAnswer: (q: string, t: string | ((p: string) => string)) => setAnswers((a) => ({ ...a, [q]: typeof t === "function" ? t(a[q] ?? "") : t })),
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") { e.preventDefault(); dev.setEnabled(!dev.enabled); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <>
      <VariantS3 {...props} />
      {dev.enabled && (variant === "P1" ? <P1Drawer dev={dev} /> : variant === "P2" ? <P2Dock dev={dev} /> : <P3Pill dev={dev} />)}
      <PrototypeSwitcher
        variants={variants}
        current={variant}
        onChange={setVariant}
        state={<div>developer panel: {dev.enabled ? "revealed" : "hidden — press Ctrl+Shift+D"} · {dev.calls.length} calls</div>}
      />
    </>
  );
}
