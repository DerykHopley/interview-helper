// PROTOTYPE — Variant W3: one question at a time. Each question from the AI is a single cream card on the dark
// table (like the Interview view), with S·T·A·R progress above it and the answer box below; earlier answers fold
// into a short "so far" list you can open. The last card turns into the draft review.
import { useRef, useState } from "react";
import { PARTS, useCowrite, type Seed } from "./cowrite";
import { DraftReview, Reply, RulesNote } from "./Shared";

export function VariantW3({ seed, onRestart }: { seed: Seed; onRestart: () => void }) {
  const cw = useCowrite(seed);
  const [showSoFar, setShowSoFar] = useState(false);
  const loadedAt = useRef(cw.messages.length); // animate only cards that arrive after load
  const last = [...cw.messages].reverse().find((m) => m.from === "assistant");
  const answered = cw.messages.filter((m) => m.from === "candidate");

  return (
    <main className="d2-main w3">
      {seed.kind === "gap" && <div className="w3-seed">For the Gap: “{seed.question}” · {seed.skill}</div>}
      <div className="w3-pips">
        {PARTS.map((p, n) => (
          <span key={p.key} className={`w3-pip ${n < cw.stepIndex ? "is-done" : n === cw.stepIndex && !cw.done ? "is-now" : ""}`} title={p.label}>{p.label}</span>
        ))}
      </div>

      {cw.done ? (
        <DraftReview cw={cw} seed={seed} onRestart={onRestart} />
      ) : (
        <>
          <div key={cw.messages.length} className={`w3-card ${last?.flag ? "is-flag" : ""} ${cw.messages.length > loadedAt.current ? "is-new" : ""}`}>
            {last?.flag && <span className="cw-flag">Missing part</span>}
            <div className="w3-q">{last?.text}</div>
          </div>
          <div className="w3-answer"><Reply cw={cw} placeholder="Your answer, in your own words" /></div>
          <RulesNote />
        </>
      )}

      {answered.length > 0 && !cw.done && (
        <div className="w3-sofar">
          <button className="cw-link" onClick={() => setShowSoFar((v) => !v)}>{showSoFar ? "Hide" : "Show"} your answers so far ({answered.length})</button>
          {showSoFar && <ol>{answered.map((m, n) => <li key={n}>{m.text}</li>)}</ol>}
        </div>
      )}
    </main>
  );
}
