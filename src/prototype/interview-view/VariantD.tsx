// PROTOTYPE — Variant D: interviewer chat. The interviewer asks one Question at a time as a message;
// you answer by choosing a Match as a quick reply. You decide when to ask for the next Question.
import { useEffect, useRef, useState } from "react";
import { interview, questions, scenarioById, usedFor, type VariantProps } from "./data";

export function VariantD({ picks, pick }: VariantProps) {
  const [asked, setAsked] = useState(1); // how many Questions have been asked so far
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [asked, picks]);

  return (
    <div className="vd">
      <header className="vd-header">
        <div className="vd-avatar">NL</div>
        <div>
          <div className="vd-name">Practice interviewer</div>
          <div className="vd-sub">{interview.title}</div>
        </div>
        <div className="vd-count">Question {asked} of {questions.length}</div>
      </header>

      <div className="vd-thread">
        {questions.slice(0, asked).map((q, i) => {
          const current = i === asked - 1;
          const picked = picks[q.id] && scenarioById(picks[q.id]!);
          return (
            <div key={q.id} className={`vd-turn ${current ? "is-current" : "is-past"}`}>
              <div className="vd-bubble vd-them">
                <div className="vd-skill">{q.skill}</div>
                {q.text}
              </div>

              {q.matches.length === 0 ? (
                <div className="vd-bubble vd-system">
                  You don't have a story for this yet. {q.gapSuggestion}
                  {current && <div><button className="vd-chip vd-chip-gap">Co-write it with me</button></div>}
                </div>
              ) : picked && !current ? (
                <div className="vd-bubble vd-me">I'd tell: <strong>{picked.title}</strong></div>
              ) : (
                current && (
                  <div className="vd-replies">
                    <div className="vd-replies-label">Which story would you tell?</div>
                    {q.matches.map((m, rank) => {
                      const s = scenarioById(m.scenarioId);
                      const isPicked = picks[q.id] === s.id;
                      const used = usedFor(picks, s.id, q.id);
                      return (
                        <button key={s.id} className={`vd-chip ${isPicked ? "is-picked" : ""}`} onClick={() => pick(q.id, isPicked ? undefined : s.id)}>
                          <span className="vd-chip-title">
                            {rank === 0 && "★ "}{s.title} {s.origin === "demo" && <span className="tag-demo">demo</span>}
                          </span>
                          <span className="vd-chip-reason">{m.reason}</span>
                          {used.length > 0 && <span className="vd-chip-used">already used for Q{questions.indexOf(used[0]) + 1}</span>}
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <footer className="vd-footer">
        {asked < questions.length ? (
          <button className="vd-next" onClick={() => setAsked((n) => n + 1)}>
            {picks[questions[asked - 1].id] || !questions[asked - 1].matches.length ? "Next question" : "Skip — next question"}
          </button>
        ) : (
          <span className="vd-done">That's all the Questions for this Interview.</span>
        )}
      </footer>
    </div>
  );
}
