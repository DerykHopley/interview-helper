// PROTOTYPE — Variant A: split pane. Question list on the left with status, selected Question's Matches on the right.
import { useState } from "react";
import { interview, questions, scenarioById, usedFor, type VariantProps } from "./data";

export function VariantA({ picks, pick }: VariantProps) {
  const [selectedId, setSelectedId] = useState(questions[0].id);
  const q = questions.find((x) => x.id === selectedId)!;
  const done = questions.filter((x) => picks[x.id]).length;
  const gaps = questions.filter((x) => !x.matches.length).length;

  return (
    <div className="va">
      <header className="va-header">
        <div>
          <div className="va-crumb">Interviews /</div>
          <h1>{interview.title}</h1>
        </div>
        <div className="va-progress">
          {done}/{questions.length} picked · <span className="va-gap-text">{gaps} Gaps</span>
        </div>
      </header>
      <div className="va-body">
        <nav className="va-list">
          {questions.map((x, i) => {
            const status = !x.matches.length ? "gap" : picks[x.id] ? "picked" : "open";
            return (
              <button key={x.id} className={`va-item ${x.id === selectedId ? "is-selected" : ""}`} onClick={() => setSelectedId(x.id)}>
                <span className={`va-dot va-dot-${status}`} />
                <span className="va-item-text">
                  <span className="va-item-q">{i + 1}. {x.text}</span>
                  <span className="va-item-meta">
                    {x.skill}
                    {status === "picked" && <> · {scenarioById(picks[x.id]!).title}</>}
                    {status === "gap" && <> · Gap</>}
                  </span>
                </span>
              </button>
            );
          })}
          <button className="va-add">+ Add a Question</button>
        </nav>
        <main className="va-detail">
          <div className="va-skill">{q.skill}</div>
          <h2>{q.text}</h2>
          {q.matches.length === 0 ? (
            <div className="va-gapbox">
              <strong>Gap — no Scenario is a good enough Match.</strong>
              <p>{q.gapSuggestion}</p>
              <button className="va-primary">Co-write this Scenario</button>
            </div>
          ) : (
            <>
              <div className="va-section-label">Matches, best first <button className="va-link">Re-run matching</button></div>
              <ol className="va-matches">
                {q.matches.map((m) => {
                  const s = scenarioById(m.scenarioId);
                  const picked = picks[q.id] === s.id;
                  const used = usedFor(picks, s.id, q.id);
                  return (
                    <li key={s.id} className={`va-match ${picked ? "is-picked" : ""}`}>
                      <div className="va-match-main">
                        <div className="va-match-title">
                          {s.title} {s.origin === "demo" && <span className="tag-demo">demo</span>}
                        </div>
                        <div className="va-match-reason">{m.reason}</div>
                        <div className="va-match-result">Result: {s.result}</div>
                        {used.length > 0 && (
                          <div className="va-used">Already used for: {used.map((u) => `“${u.text}”`).join(", ")}</div>
                        )}
                      </div>
                      <button className={picked ? "va-picked-btn" : "va-pick-btn"} onClick={() => pick(q.id, picked ? undefined : s.id)}>
                        {picked ? "✓ Picked" : "Pick"}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
