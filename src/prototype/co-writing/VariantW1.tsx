// PROTOTYPE — Variant W1: chat, then draft. A plain chat thread; when the last part is answered, the draft appears
// at the end of the thread as a review card (the Scenario form, pre-filled) to edit, approve or discard.
import { useEffect, useRef } from "react";
import { useCowrite, type Seed } from "./cowrite";
import { Bubble, DraftReview, Reply, RulesNote } from "./Shared";

export function VariantW1({ seed, onRestart }: { seed: Seed; onRestart: () => void }) {
  const cw = useCowrite(seed);
  const end = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    // Jump on first render (e.g. ?answers=n), animate afterwards.
    if (cw.done && first.current) document.querySelector(".cw-review")?.scrollIntoView({ block: "start" });
    else end.current?.scrollIntoView({ behavior: first.current ? "auto" : "smooth", block: "end" });
    first.current = false;
  }, [cw.messages.length, cw.done]);

  return (
    <main className="d2-main w1">
      <div className="w1-head">
        <h1>{seed.kind === "gap" ? "Write a story for this Gap" : "Co-write a story"}</h1>
        <span className="cw-progress">{cw.done ? "Draft ready" : `Question ${cw.stepIndex + 1} of ${cw.total}`}</span>
      </div>
      <RulesNote />
      <div className="w1-thread">
        {cw.messages.map((m, i) => <Bubble key={i} m={m} />)}
        {cw.done && <DraftReview cw={cw} seed={seed} onRestart={onRestart} />}
        <div ref={end} />
      </div>
      <div className="w1-composer"><Reply cw={cw} /></div>
    </main>
  );
}
