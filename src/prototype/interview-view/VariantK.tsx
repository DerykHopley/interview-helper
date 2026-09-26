// PROTOTYPE — Variant K: dark table. The chosen Interview view design (see docs/prototypes/interview-view/README.md).
// A flashcard deck on a dark card table. The Question card stays face up; "Deal my Matches" fans them out
// underneath as tilted, overlapping cards. The kept card (or the best Match) sits in the middle; tap another to keep it\n// and it slides to the middle.
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

  // The middle of the fan holds the kept card, or the best Match if none is kept yet. The others tuck in
  // behind it, alternating left then right in rank order. Cards are positioned absolutely so a card
  // slides to the middle (rather than jumping) when you keep it.
  const focusId = picks[q.id] && q.matches.some((m) => m.scenarioId === picks[q.id]) ? picks[q.id] : q.matches[0].scenarioId;
  const others = q.matches.filter((m) => m.scenarioId !== focusId);
  const slotOf = (scenarioId: string) => {
    if (scenarioId === focusId) return 0;
    const i = others.findIndex((m) => m.scenarioId === scenarioId);
    return i % 2 === 0 ? -(Math.floor(i / 2) + 1) : Math.floor(i / 2) + 1;
  };

  return (
    <div className="vg-hand vg-fan">
      {q.matches.map((m, rank) => {
        const s = scenarioById(m.scenarioId);
        const kept = picks[q.id] === s.id;
        const used = usedFor(picks, s.id, q.id);
        const slot = slotOf(s.id);
        return (
          <button
            key={s.id}
            className={`vg-card ${rank === 0 ? "is-best" : ""} ${kept ? "is-picked" : ""} ${slot === 0 ? "is-focus" : ""}`}
            style={{
              transform: `translateX(calc(-50% + ${slot} * var(--spread))) translateY(${slot === 0 ? -14 : Math.abs(slot) * 10}px) rotate(${slot * 7}deg)`,
              zIndex: 10 - Math.abs(slot),
            }}
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

export function VariantK(props: VariantProps) {
  return <FlashcardShell {...props} Below={Hand} className="vk-table" />;
}
