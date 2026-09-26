// PROTOTYPE — Variant E: one Match at a time on the back of the card (round 2's E, rebuilt on the shared deck).
// Best Match first; "Another story" steps through the rest.
import { useState } from "react";
import { FlashcardShell, GapBack, type SlotProps } from "./FlashcardShell";
import { questions, scenarioById, usedFor, type VariantProps } from "./data";

function Back(props: SlotProps) {
  const { q, picks, pick } = props;
  const [matchIndex, setMatchIndex] = useState(0);
  if (!q.matches.length) return <GapBack {...props} />;
  const m = q.matches[matchIndex];
  const s = scenarioById(m.scenarioId);
  const used = usedFor(picks, s.id, q.id);
  const kept = picks[q.id] === s.id;

  return (
    <div className="ve-back">
      <div className="ve-label">
        {matchIndex === 0 ? "Best Match" : `Match ${matchIndex + 1} of ${q.matches.length}`} · {Math.round(m.score * 100)}%
      </div>
      <div className="ve-title">{s.title} {s.origin === "demo" && <span className="tag-demo">demo</span>}</div>
      <p className="ve-reason">{m.reason}</p>
      <p className="ve-result">{s.result}</p>
      {used.length > 0 && <div className="ve-used">Already used for Q{questions.indexOf(used[0]) + 1}</div>}
      <div className="ve-actions">
        {q.matches.length > 1 && (
          <button className="ve-other" onClick={() => setMatchIndex((i) => (i + 1) % q.matches.length)}>Another story</button>
        )}
        <button className={`ve-keep ${kept ? "is-picked" : ""}`} onClick={() => pick(q.id, kept ? undefined : s.id)}>
          {kept ? "✓ Kept" : "Keep this one"}
        </button>
      </div>
    </div>
  );
}

export function VariantE(props: VariantProps) {
  return <FlashcardShell {...props} Back={Back} />;
}
