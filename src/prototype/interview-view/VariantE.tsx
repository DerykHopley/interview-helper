// PROTOTYPE — Variant E: flashcard. Front = Question. Flip to see the best Match only;
// keep it, or step through the other Matches one by one. Then deal the next card.
import { useState } from "react";
import { questions, scenarioById, usedFor, type VariantProps } from "./data";

export function VariantE({ picks, pick }: VariantProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);
  const q = questions[index];
  const m = q.matches[matchIndex];
  const s = m && scenarioById(m.scenarioId);
  const used = s ? usedFor(picks, s.id, q.id) : [];
  const deal = (d: number) => {
    setIndex((i) => (i + d + questions.length) % questions.length);
    setFlipped(false);
    setMatchIndex(0);
  };
  const remaining = questions.length - index - 1;

  return (
    <div className="ve">
      <div className="ve-deck">
        {/* the cards still to come, peeking out underneath */}
        {Array.from({ length: Math.min(remaining, 3) }).map((_, i) => (
          <div key={i} className="ve-under" style={{ transform: `translate(${(i + 1) * 6}px, ${(i + 1) * 6}px)`, zIndex: 3 - i }} />
        ))}

        <div className={`ve-card ${flipped ? "is-flipped" : ""} ${flipped && !m ? "is-gap" : ""}`}>
          {!flipped ? (
            <div className="ve-front" onClick={() => setFlipped(true)}>
              <div className="ve-corner">{index + 1}/{questions.length}</div>
              <div className="ve-skill">{q.skill}</div>
              <div className="ve-q">{q.text}</div>
              <div className="ve-tap">Tap to flip</div>
            </div>
          ) : !m ? (
            <div className="ve-back">
              <div className="ve-label">Gap</div>
              <div className="ve-title">No story fits yet</div>
              <p className="ve-reason">{q.gapSuggestion}</p>
              <button className="ve-keep">Co-write it</button>
            </div>
          ) : (
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
                  <button className="ve-other" onClick={() => setMatchIndex((i) => (i + 1) % q.matches.length)}>
                    Another story
                  </button>
                )}
                <button className={`ve-keep ${picks[q.id] === s.id ? "is-picked" : ""}`} onClick={() => pick(q.id, picks[q.id] === s.id ? undefined : s.id)}>
                  {picks[q.id] === s.id ? "✓ Kept" : "Keep this one"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="ve-controls">
        <button className="ve-round" onClick={() => deal(-1)} aria-label="Previous card">↶</button>
        <button className="ve-deal" onClick={() => deal(1)}>Next card</button>
      </div>
      <div className="ve-tally">
        {questions.filter((x) => picks[x.id]).length} kept · {questions.filter((x) => !x.matches.length).length} Gaps
      </div>
    </div>
  );
}
