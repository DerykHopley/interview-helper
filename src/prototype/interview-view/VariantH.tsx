// PROTOTYPE — Variant H: ranked list on the back. Flip once to see every Match at a glance,
// each with a strength bar; tap a row to keep it.
import { FlashcardShell, GapBack, type SlotProps } from "./FlashcardShell";
import { questions, scenarioById, usedFor, type VariantProps } from "./data";

function Back(props: SlotProps) {
  const { q, picks, pick } = props;
  if (!q.matches.length) return <GapBack {...props} />;

  return (
    <div className="ve-back vh-back">
      <div className="ve-label">Your Matches, best first</div>
      <ol className="vh-list">
        {q.matches.map((m) => {
          const s = scenarioById(m.scenarioId);
          const kept = picks[q.id] === s.id;
          const used = usedFor(picks, s.id, q.id);
          return (
            <li key={s.id}>
              <button className={`vh-row ${kept ? "is-picked" : ""}`} onClick={() => pick(q.id, kept ? undefined : s.id)}>
                <span className="vh-check">{kept ? "✓" : ""}</span>
                <span className="vh-body">
                  <span className="vh-title">
                    {s.title} {s.origin === "demo" && <span className="tag-demo">demo</span>}
                    {used.length > 0 && <span className="vh-used">used Q{questions.indexOf(used[0]) + 1}</span>}
                  </span>
                  <span className="vh-reason">{m.reason}</span>
                  <span className="vh-bar"><span style={{ width: `${m.score * 100}%` }} /></span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function VariantH(props: VariantProps) {
  return <FlashcardShell {...props} Back={Back} backHeight={(q) => Math.max(340, 90 + q.matches.length * 100)} />;
}
