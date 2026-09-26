// PROTOTYPE — round 3: the flashcard deck from round 2's E, held constant. Each variant only changes how
// Matches are shown: `back` renders on the flipped card, `below` renders under the deck (before and after the flip).
import { useState, type ComponentType } from "react";
import { questions, type Question, type VariantProps } from "./data";

export type SlotProps = VariantProps & { q: Question; flipped: boolean; flip: () => void };

export function FlashcardShell({
  picks,
  pick,
  Back,
  Below,
  tapToFlip = true,
  backHeight = 340,
  flippedClass,
}: VariantProps & {
  Back?: ComponentType<SlotProps>;
  Below?: ComponentType<SlotProps>;
  tapToFlip?: boolean;
  flippedClass?: string; // extra class on the page once flipped
  backHeight?: number | ((q: Question) => number);
}) {
  const [index, setIndex] = useState(0);
  // ?flipped=1 starts the first card flipped (for screenshots)
  const [flipped, setFlipped] = useState(() => new URLSearchParams(location.search).has("flipped"));
  const q = questions[index];
  const deal = (d: number) => {
    setIndex((i) => (i + d + questions.length) % questions.length);
    setFlipped(false);
  };
  const remaining = questions.length - index - 1;
  const showBack = flipped && Back;
  const slot: SlotProps = { picks, pick, q, flipped, flip: () => setFlipped(true) };

  return (
    <div className={`ve ${flipped && flippedClass ? flippedClass : ""}`}>
      <div className="ve-deck" style={{ height: showBack ? (typeof backHeight === "function" ? backHeight(q) : backHeight) : 340 }}>
        {Array.from({ length: Math.min(remaining, 3) }).map((_, i) => (
          <div key={i} className="ve-under" style={{ transform: `translate(${(i + 1) * 6}px, ${(i + 1) * 6}px)`, zIndex: 3 - i }} />
        ))}
        <div className={`ve-card ${showBack ? "is-flipped" : ""} ${showBack && !q.matches.length ? "is-gap" : ""}`}>
          {showBack ? (
            <Back key={q.id} {...slot} />
          ) : (
            <div className="ve-front" onClick={() => tapToFlip && setFlipped(true)} style={{ cursor: tapToFlip ? "pointer" : "default" }}>
              <div className="ve-corner">{index + 1}/{questions.length}</div>
              <div className="ve-skill">{q.skill}</div>
              <div className="ve-q">{q.text}</div>
              {tapToFlip && !flipped && <div className="ve-tap">Tap to flip</div>}
            </div>
          )}
        </div>
      </div>

      {Below && <Below key={q.id} {...slot} />}

      <div className="ve-controls">
        <button className="ve-round" onClick={() => deal(-1)} aria-label="Previous card">↶</button>
        <button className="ve-deal" onClick={() => deal(1)}>Next card</button>
      </div>
      <div className="ve-tally">
        {questions.filter((x) => picks[x.id]).length} kept · {questions.filter((x) => !x.matches.length).length} Gaps
      </div>
    </div>
  );
}

// Shared Gap back — the Gap isn't what round 3 is testing.
export function GapBack({ q }: SlotProps) {
  return (
    <div className="ve-back">
      <div className="ve-label">Gap</div>
      <div className="ve-title">No story fits yet</div>
      <p className="ve-reason">{q.gapSuggestion}</p>
      <button className="ve-keep">Co-write it</button>
    </div>
  );
}
