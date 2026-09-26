// PROTOTYPE — Variant J: guess first. Before the card flips you pick, from your whole Scenario bank,
// the story you'd tell. The flip then shows the Matches and whether your guess was one of them.
import { useState } from "react";
import { FlashcardShell, GapBack, type SlotProps } from "./FlashcardShell";
import { questions, scenarios, scenarioById, usedFor, type VariantProps } from "./data";

// The guess has to survive from Below (before flip) to Back (after flip), so it lives outside both slots.
// ?guess=<scenarioId> presets the first Question's guess (for screenshots).
const guesses: Record<string, string | undefined> = { q1: new URLSearchParams(location.search).get("guess") ?? undefined };

function Guess({ q, flipped, flip }: SlotProps) {
  const [guess, setGuess] = useState(guesses[q.id]);
  if (flipped) return null;
  return (
    <div className="vj-guess">
      <div className="vj-prompt">Which story would you tell? Choose before you flip.</div>
      <div className="vj-bank">
        {scenarios.map((s) => (
          <button key={s.id} className={`vj-chip ${guess === s.id ? "is-on" : ""}`} onClick={() => setGuess((guesses[q.id] = s.id))}>
            {s.title}
          </button>
        ))}
        <button className={`vj-chip vj-none ${guess === "none" ? "is-on" : ""}`} onClick={() => setGuess((guesses[q.id] = "none"))}>
          None of them
        </button>
      </div>
      <button className="ve-deal" disabled={!guess} onClick={flip}>Flip and check</button>
    </div>
  );
}

function Back(props: SlotProps) {
  const { q, picks, pick } = props;
  const guess = guesses[q.id];
  const hit = q.matches.findIndex((m) => m.scenarioId === guess);

  const verdict = !q.matches.length
    ? guess === "none" ? "Right — this is a Gap." : "No story fits this one — it's a Gap."
    : hit === 0 ? "Spot on — that's the best Match."
    : hit > 0 ? `Good — that's Match #${hit + 1}.`
    : guess === "none" ? "You do have a story for this."
    : "Not a Match. Here's what fits better.";
  const good = (!q.matches.length && guess === "none") || hit === 0;

  if (!q.matches.length)
    return (
      <div className="vj-wrap">
        <div className={`vj-verdict ${good ? "is-good" : ""}`}>{verdict}</div>
        <GapBack {...props} />
      </div>
    );

  return (
    <div className="ve-back">
      <div className={`vj-verdict ${good ? "is-good" : hit > 0 ? "is-ok" : ""}`}>{verdict}</div>
      <div className="vj-matches">
        {q.matches.map((m, rank) => {
          const s = scenarioById(m.scenarioId);
          const kept = picks[q.id] === s.id;
          const used = usedFor(picks, s.id, q.id);
          return (
            <button key={s.id} className={`vj-match ${kept ? "is-picked" : ""} ${guess === s.id ? "is-guess" : ""}`} onClick={() => pick(q.id, kept ? undefined : s.id)}>
              <span className="vj-rank">{rank + 1}</span>
              <span className="vj-body">
                <span className="vj-title">
                  {s.title} {guess === s.id && <span className="vj-yours">your guess</span>}
                  {used.length > 0 && <span className="vh-used">used Q{questions.indexOf(used[0]) + 1}</span>}
                </span>
                <span className="vj-reason">{m.reason}</span>
              </span>
              <span className="vj-keep">{kept ? "✓" : "Keep"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VariantJ(props: VariantProps) {
  return <FlashcardShell {...props} Back={Back} Below={Guess} tapToFlip={false} backHeight={(q) => Math.max(340, 120 + q.matches.length * 100)} />;
}
