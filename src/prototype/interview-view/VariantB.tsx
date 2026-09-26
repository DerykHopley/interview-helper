// PROTOTYPE — Variant B: one Question at a time. Think first, reveal Matches, pick, next. Rehearsal, not a form.
import { useState } from "react";
import { interview, questions, scenarioById, usedFor, type VariantProps } from "./data";

export function VariantB({ picks, pick }: VariantProps) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const q = questions[index];
  const isGap = q.matches.length === 0;
  const go = (d: number) => {
    setIndex((i) => Math.min(questions.length - 1, Math.max(0, i + d)));
    setRevealed(false);
  };

  return (
    <div className={`vb ${isGap && revealed ? "vb-is-gap" : ""}`}>
      <div className="vb-top">
        <span>{interview.title}</span>
        <div className="vb-pips">
          {questions.map((x, i) => (
            <button
              key={x.id}
              className={`vb-pip ${i === index ? "is-current" : ""} ${picks[x.id] ? "is-picked" : ""} ${!x.matches.length ? "is-gap" : ""}`}
              onClick={() => { setIndex(i); setRevealed(false); }}
              aria-label={`Question ${i + 1}`}
            />
          ))}
        </div>
        <span>{index + 1} / {questions.length}</span>
      </div>

      <div className="vb-stage">
        <div className="vb-skill">tests: {q.skill}</div>
        <h1 className="vb-question">{q.text}</h1>

        {!revealed ? (
          <div className="vb-think">
            <p>Which of your stories would you tell? Think of one first.</p>
            <button className="vb-reveal" onClick={() => setRevealed(true)}>Show my Matches</button>
          </div>
        ) : isGap ? (
          <div className="vb-gap">
            <div className="vb-gap-title">You don't have a story for this yet.</div>
            <p>{q.gapSuggestion}</p>
            <button className="vb-reveal">Co-write it now</button>
            <button className="vb-ghost" onClick={() => go(1)}>Skip for now</button>
          </div>
        ) : (
          <div className="vb-matches">
            {q.matches.map((m, rank) => {
              const s = scenarioById(m.scenarioId);
              const picked = picks[q.id] === s.id;
              const used = usedFor(picks, s.id, q.id);
              return (
                <button
                  key={s.id}
                  className={`vb-match ${rank === 0 ? "is-best" : ""} ${picked ? "is-picked" : ""}`}
                  onClick={() => pick(q.id, picked ? undefined : s.id)}
                >
                  {rank === 0 && <span className="vb-best">Best fit</span>}
                  <span className="vb-match-title">
                    {s.title} {s.origin === "demo" && <span className="tag-demo">demo</span>}
                  </span>
                  <span className="vb-match-reason">{m.reason}</span>
                  {used.length > 0 && <span className="vb-used">Already used for Q{questions.indexOf(used[0]) + 1}</span>}
                  <span className="vb-match-cta">{picked ? "✓ I'll tell this one" : "Tell this one"}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="vb-nav">
        <button className="vb-ghost" disabled={index === 0} onClick={() => go(-1)}>Previous</button>
        <button className="vb-next" disabled={index === questions.length - 1} onClick={() => go(1)}>Next question</button>
      </div>
    </div>
  );
}
