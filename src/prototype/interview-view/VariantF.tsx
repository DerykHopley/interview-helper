// PROTOTYPE — Variant F: rehearsal desk. One Question; the picked Match's STAR outline laid out as
// speaking notes, with a 2-minute timer. You mark it practised and move on when you're ready.
import { useEffect, useState } from "react";
import { interview, questions, scenarioById, star, usedFor, type VariantProps } from "./data";

export function VariantF({ picks, pick }: VariantProps) {
  const [index, setIndex] = useState(0);
  const [practised, setPractised] = useState<Record<string, boolean>>({});
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const q = questions[index];
  const chosen = picks[q.id] ?? q.matches[0]?.scenarioId; // default to the best Match
  const notes = chosen ? star[chosen] : undefined;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const go = (i: number) => {
    setIndex(i);
    setSeconds(0);
    setRunning(false);
  };
  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="vf">
      <aside className="vf-rail">
        <div className="vf-rail-title">{interview.title}</div>
        {questions.map((x, i) => (
          <button key={x.id} className={`vf-step ${i === index ? "is-current" : ""}`} onClick={() => go(i)}>
            <span className={`vf-step-mark ${practised[x.id] ? "is-done" : ""} ${!x.matches.length ? "is-gap" : ""}`}>
              {practised[x.id] ? "✓" : !x.matches.length ? "!" : i + 1}
            </span>
          </button>
        ))}
      </aside>

      <main className="vf-main">
        <div className="vf-skill">{q.skill}</div>
        <h1 className="vf-q">{q.text}</h1>

        {!q.matches.length ? (
          <div className="vf-gap">
            <strong>Nothing to rehearse — this is a Gap.</strong>
            <p>{q.gapSuggestion}</p>
            <button className="vf-primary">Co-write this Scenario</button>
          </div>
        ) : (
          <>
            <div className="vf-tabs">
              <span className="vf-tabs-label">Your story:</span>
              {q.matches.map((m) => {
                const s = scenarioById(m.scenarioId);
                const used = usedFor(picks, s.id, q.id);
                return (
                  <button key={s.id} className={`vf-tab ${chosen === s.id ? "is-on" : ""}`} onClick={() => pick(q.id, s.id)} title={m.reason}>
                    {s.title} {s.origin === "demo" && <span className="tag-demo">demo</span>}
                    {used.length > 0 && <span className="vf-used"> · used Q{questions.indexOf(used[0]) + 1}</span>}
                  </button>
                );
              })}
            </div>

            {notes && (
              <div className="vf-notes">
                {([["Situation", notes.s], ["Task", notes.t], ["Action", notes.a], ["Result", notes.r]] as const).map(([k, v]) => (
                  <div key={k} className="vf-note">
                    <div className="vf-note-k">{k}</div>
                    <div className="vf-note-v">{v}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="vf-bar">
              <div className={`vf-timer ${seconds > 120 ? "is-over" : ""}`}>{mmss} <span>/ 2:00</span></div>
              <button className="vf-ghost" onClick={() => setRunning((r) => !r)}>{running ? "Pause" : seconds ? "Resume" : "Start answering aloud"}</button>
              <button
                className={`vf-primary ${practised[q.id] ? "is-done" : ""}`}
                onClick={() => {
                  pick(q.id, chosen);
                  setPractised((p) => ({ ...p, [q.id]: true }));
                  setRunning(false);
                }}
              >
                {practised[q.id] ? "✓ Practised" : "I've practised this"}
              </button>
            </div>
          </>
        )}

        <div className="vf-nav">
          <button className="vf-ghost" disabled={index === 0} onClick={() => go(index - 1)}>Previous</button>
          <button className="vf-next" disabled={index === questions.length - 1} onClick={() => go(index + 1)}>Next question</button>
        </div>
      </main>
    </div>
  );
}
