// PROTOTYPE — Variant G: dealt hand. The Question card never flips; tapping it deals the Matches out
// as smaller cards fanned underneath, best in the middle and raised. Tap a card to keep it.
import { FlashcardShell, type SlotProps } from "./FlashcardShell";
import { questions, scenarioById, usedFor, type VariantProps } from "./data";

function Hand({ q, picks, pick, flipped, flip }: SlotProps) {
  if (!flipped) return <button className="vg-deal" onClick={flip}>Deal my Matches</button>;
  if (!q.matches.length)
    return (
      <div className="vg-hand">
        <div className="vg-card vg-empty">
          <div className="vg-label">Gap</div>
          <div className="vg-title">No story in your hand</div>
          <p className="vg-reason">{q.gapSuggestion}</p>
          <button className="ve-keep">Co-write it</button>
        </div>
      </div>
    );

  // Order for the fan: 2nd, best, 3rd — so the best card sits in the middle.
  const ranked = q.matches.map((m, rank) => ({ m, rank }));
  const fan = ranked.length === 1 ? ranked : [ranked[1], ranked[0], ...ranked.slice(2)];
  const mid = (fan.length - 1) / 2;

  return (
    <div className="vg-hand">
      {fan.map(({ m, rank }, i) => {
        const s = scenarioById(m.scenarioId);
        const kept = picks[q.id] === s.id;
        const used = usedFor(picks, s.id, q.id);
        const tilt = (i - mid) * 7;
        return (
          <button
            key={s.id}
            className={`vg-card ${rank === 0 ? "is-best" : ""} ${kept ? "is-picked" : ""}`}
            style={{ transform: `rotate(${tilt}deg) translateY(${rank === 0 ? -14 : Math.abs(i - mid) * 10}px)` }}
            onClick={() => pick(q.id, kept ? undefined : s.id)}
          >
            <div className="vg-label">{rank === 0 ? "Best fit" : `#${rank + 1}`} · {Math.round(m.score * 100)}%</div>
            <div className="vg-title">{s.title} {s.origin === "demo" && <span className="tag-demo">demo</span>}</div>
            <p className="vg-reason">{m.reason}</p>
            {used.length > 0 && <div className="vg-used">Used for Q{questions.indexOf(used[0]) + 1}</div>}
            <div className="vg-cta">{kept ? "✓ Kept" : "Tap to keep"}</div>
          </button>
        );
      })}
    </div>
  );
}

export function VariantG(props: VariantProps) {
  return <FlashcardShell {...props} Below={Hand} />;
}
