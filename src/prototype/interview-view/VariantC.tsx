// PROTOTYPE — Variant C: coverage board. Questions × Scenarios grid; cell = Match strength, ring = picked.
// Crowded columns show over-used stories; empty rows show Gaps.
import { useState } from "react";
import { interview, questions, scenarios, scenarioById, type VariantProps } from "./data";

export function VariantC({ picks, pick }: VariantProps) {
  const [hover, setHover] = useState<{ q: string; s: string } | null>(null);
  const usesOf = (sid: string) => questions.filter((q) => picks[q.id] === sid).length;
  const hoverMatch = hover && questions.find((q) => q.id === hover.q)!.matches.find((m) => m.scenarioId === hover.s);

  return (
    <div className="vc">
      <header className="vc-header">
        <h1>{interview.title}</h1>
        <p>Rows are Questions, columns are your Scenarios. Darker = stronger Match. Click a cell to pick it.</p>
      </header>

      <div className="vc-scroll">
        <table className="vc-grid">
          <thead>
            <tr>
              <th className="vc-corner">Question</th>
              {scenarios.map((s) => (
                <th key={s.id} className="vc-col">
                  <div className="vc-col-title">{s.title}</div>
                  {s.origin === "demo" && <span className="tag-demo">demo</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((q, i) => {
              const gap = q.matches.length === 0;
              return (
                <tr key={q.id} className={gap ? "vc-row-gap" : ""}>
                  <th className="vc-q">
                    <span className="vc-q-num">Q{i + 1}</span> {q.text}
                    <div className="vc-q-skill">{q.skill}{gap && " · GAP"}</div>
                  </th>
                  {gap ? (
                    <td colSpan={scenarios.length} className="vc-gapcell">
                      No story fits — <button className="vc-link">co-write one</button>
                    </td>
                  ) : (
                    scenarios.map((s) => {
                      const m = q.matches.find((x) => x.scenarioId === s.id);
                      const picked = picks[q.id] === s.id;
                      return (
                        <td key={s.id} className="vc-cell">
                          {m && (
                            <button
                              className={`vc-dot ${picked ? "is-picked" : ""}`}
                              style={{ opacity: 0.25 + m.score * 0.75, transform: `scale(${0.5 + m.score * 0.6})` }}
                              onClick={() => pick(q.id, picked ? undefined : s.id)}
                              onMouseEnter={() => setHover({ q: q.id, s: s.id })}
                              onMouseLeave={() => setHover(null)}
                              aria-label={`${s.title} for ${q.text}`}
                            />
                          )}
                        </td>
                      );
                    })
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th className="vc-q">Times used</th>
              {scenarios.map((s) => {
                const n = usesOf(s.id);
                return (
                  <td key={s.id} className={`vc-uses ${n >= 2 ? "is-heavy" : ""} ${n === 0 ? "is-zero" : ""}`}>
                    {n}{n >= 2 && " ⚠"}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <aside className="vc-hint">
        {hover && hoverMatch ? (
          <>
            <strong>{scenarioById(hover.s).title}</strong> — {Math.round(hoverMatch.score * 100)}% · {hoverMatch.reason}
          </>
        ) : (
          <>Hover a dot to see why it matches.</>
        )}
      </aside>
    </div>
  );
}
