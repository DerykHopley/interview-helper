// PROTOTYPE — Variant K: dark table. The chosen Interview view design (see docs/prototypes/interview-view/README.md).
// A flashcard deck on a dark card table. The Question card stays face up; "Deal my Matches" fans them out
// underneath as tilted, overlapping cards. The kept card (or the best Match) sits in the middle; tap another to keep it
// and it slides to the middle.
import { FlashcardShell, type SlotProps } from "./FlashcardShell";
import { useEffect } from "react";
import { TOKEN_EXPIRED, finishMatching, questions, rerunMatching, scenarioById, usedFor, type VariantProps } from "./data";

export function Hand({ q, picks, pick, flipped, flip }: SlotProps) {
  // Matches are found the first time a Question is dealt (spec story 65); the "Matcher" takes a moment.
  const finding = flipped && !!q.unmatched && !TOKEN_EXPIRED;
  useEffect(() => {
    if (!finding) return;
    const t = setTimeout(() => finishMatching(q.id), 1300);
    return () => clearTimeout(t);
  }, [finding, q.id]);

  if (!flipped) return <button className="vg-deal" onClick={flip}>{q.unmatched ? "Find my Matches" : "Deal my Matches"}</button>;

  if (q.unmatched && TOKEN_EXPIRED)
    return (
      <div className="vg-hand">
        <div className="vs-notice is-error">
          <div className="vg-label">Matches can't be found</div>
          <div className="vg-title">Your Access Token has expired</div>
          <p className="vg-reason">Finding Matches uses AI, so it needs a current token. Your stories and answers still work.</p>
          <a className="vs-btn" href="/prototype/access?variant=A2&scenario=token-expired">Enter a new token</a>
        </div>
      </div>
    );

  if (finding)
    return (
      <div className="vg-hand vg-fan vs-finding" aria-live="polite">
        {[-1, 0, 1].map((s) => (
          <div key={s} className="vs-ghost" style={{ transform: `translateX(calc(-50% + ${s} * var(--spread))) translateY(${s === 0 ? -14 : 10}px) rotate(${s * 7}deg)`, zIndex: 10 - Math.abs(s) }}>
            <span className="vs-shimmer" /><span className="vs-shimmer is-short" /><span className="vs-shimmer" />
          </div>
        ))}
        <div className="vs-finding-label">Finding your Matches…</div>
      </div>
    );

  if (!q.matches.length)
    return (
      <div className="vg-hand">
        <div className="vs-gap">
          <div className="vs-gap-label">Gap · {q.skill}</div>
          <div className="vs-gap-title">No story fits this Question yet</div>
          {q.gapSuggestion && <p className="vs-gap-text">{q.gapSuggestion}</p>}
          <div className="vs-gap-actions">
            <a className="vs-btn" href="/prototype/co-writing?variant=W5&from=gap">Write a Scenario for this</a>
            <button className="vs-link" onClick={() => rerunMatching(q.id)}>Re-run matching</button>
          </div>
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
  // Centre the fan as a whole, so two cards sit either side of the middle instead of one peeking out on the left.
  const offset = -q.matches.reduce((sum, m) => sum + slotOf(m.scenarioId), 0) / q.matches.length;

  return (
    <div className="vg-hand vg-fan">
      {q.matches.map((m, rank) => {
        const s = scenarioById(m.scenarioId);
        const kept = picks[q.id] === s.id;
        const used = usedFor(picks, s.id, q.id);
        const slot = slotOf(s.id) + offset;
        const focus = s.id === focusId;
        return (
          <button
            key={s.id}
            className={`vg-card ${rank === 0 ? "is-best" : ""} ${kept ? "is-picked" : ""} ${focus ? "is-focus" : ""}`}
            style={{
              transform: `translateX(calc(-50% + ${slot} * var(--spread))) translateY(${focus ? -14 : Math.abs(slot) * 10}px) rotate(${slot * 7}deg)`,
              zIndex: focus ? 10 : 5 - Math.abs(slot),
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
