// PROTOTYPE — the flashcard deck. One Question card at a time; swipe left for the next card and right for
// the previous one (touch or mouse drag), or use the faint side arrows or the ← → keys. Tap the card to deal the
// Matches; tap it again to hide them. `Below` renders under the card.
import { useEffect, useRef, useState, type ComponentType, type PointerEvent } from "react";
import { questions, type Question, type VariantProps } from "./data";

export type SlotProps = VariantProps & {
  q: Question;
  flipped: boolean;
  flip: () => void;
  answering: boolean; // the Candidate is writing or speaking their answer to this Question
  setAnswering: (on: boolean) => void;
  index: number;
  goTo: (i: number) => void; // jump straight to a card (index === questions.length is the end card)
};

const SWIPE_DISTANCE = 90; // px past which a release moves to the next/previous card
const LEAVE_MS = 220;

export function FlashcardShell({
  picks,
  pick,
  answers,
  setAnswer,
  Below,
  CardBack,
  Overlay,
  Header,
  EndCard,
  Empty,
  CardMenu,
  className = "",
}: VariantProps & {
  Below: ComponentType<SlotProps>;
  CardBack?: ComponentType<SlotProps>; // replaces the Question card's face while answering; hides `Below`
  Overlay?: ComponentType<SlotProps>; // rendered on top of the page (fixed bars, sheets)
  Header?: ComponentType<SlotProps>; // fixed bar at the top of the page; stays put while cards swipe
  EndCard?: ComponentType<SlotProps>; // an extra card after the last Question
  Empty?: ComponentType; // shown instead of the deck while there are no Questions yet
  CardMenu?: ComponentType<SlotProps>; // small menu in the Question card's corner
  className?: string;
}) {
  // ?q=<n> starts on Question n (for screenshots)
  const [index, setIndex] = useState(() => Math.max(0, Number(new URLSearchParams(location.search).get("q") ?? 1) - 1));
  // ?flipped=1 starts the first card flipped (for screenshots)
  const [flipped, setFlipped] = useState(() => new URLSearchParams(location.search).has("flipped"));
  // ?answering=1 starts with the answer open (for screenshots)
  const [answering, setAnswering] = useState(() => new URLSearchParams(location.search).has("answering"));
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [swiped, setSwiped] = useState(false); // play the enter animation only for cards arriving by swipe
  const drag = useRef<{ x: number; y: number; id: number; active: boolean } | null>(null);
  const suppressClick = useRef(false);

  // The deck can change while open (Questions added, deleted, generated), so clamp to what exists now.
  const last = questions.length - 1 + (EndCard ? 1 : 0);
  const at = Math.max(0, Math.min(index, last));
  const atEnd = !!EndCard && at === questions.length;
  const q = questions[Math.min(at, questions.length - 1)];
  const hasPrev = at > 0;
  const hasNext = at < last;
  const remaining = Math.max(0, questions.length - at - 1);
  const goTo = (i: number) => { setIndex(i); setFlipped(false); setAnswering(false); setSwiped(true); };
  const slot: SlotProps = { picks, pick, answers, setAnswer, q, flipped, flip: () => setFlipped(true), answering, setAnswering, index: at, goTo };
  const onBack = answering && !!CardBack;

  // dir -1 = card leaves to the left = next Question; +1 = leaves to the right = previous.
  const leave = (dir: -1 | 1) => {
    if (animating || (dir === -1 ? !hasNext : !hasPrev)) return;
    setAnimating(true);
    setDx(dir * window.innerWidth);
    setTimeout(() => {
      setIndex(at - dir);
      setSwiped(true);
      setFlipped(false);
      setAnswering(false);
      setAnimating(false);
      setDx(0);
    }, LEAVE_MS);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowRight") leave(-1);
      if (e.key === "ArrowLeft") leave(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onPointerDown = (e: PointerEvent) => {
    // Drags that start in a text box select text; they never swipe.
    if (animating || (e.target as HTMLElement).closest("textarea, input")) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, active: false };
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const mx = e.clientX - d.x;
    if (!d.active) {
      // Only start a swipe once the movement is clearly horizontal, so taps and vertical scrolls still work.
      if (Math.abs(mx) < 10 || Math.abs(mx) < Math.abs(e.clientY - d.y)) return;
      d.active = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    const blocked = mx < 0 ? !hasNext : !hasPrev;
    setDx(blocked ? mx * 0.25 : mx); // rubber-band at the ends of the deck
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.active) return;
    suppressClick.current = true; // the release after a drag shouldn't count as a tap
    setTimeout(() => (suppressClick.current = false));
    if (dx < -SWIPE_DISTANCE && hasNext) leave(-1);
    else if (dx > SWIPE_DISTANCE && hasPrev) leave(1);
    else setDx(0);
  };

  const dragging = drag.current?.active ?? false;
  const motion = dragging ? "none" : `transform ${LEAVE_MS}ms ease-out, opacity ${LEAVE_MS}ms ease-out`;

  if (!questions.length && Empty)
    return (
      <div className={`ve ve-swipe ${Header ? "has-header" : ""} ${className}`}>
        <Empty />
      </div>
    );

  return (
    <div
      className={`ve ve-swipe ${Header ? "has-header" : ""} ${flipped ? "is-dealt" : ""} ${answering ? "is-answering" : ""} ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      {Header && <Header {...slot} />}
      <button className="ve-side ve-side-left" style={{ visibility: hasPrev ? "visible" : "hidden" }} onClick={() => leave(1)} aria-label="Previous Question">‹</button>
      <button className="ve-side ve-side-right" style={{ visibility: hasNext ? "visible" : "hidden" }} onClick={() => leave(-1)} aria-label="Next Question">›</button>

      <div className="ve-deck">
        {Array.from({ length: Math.min(remaining, 3) }).map((_, i) => (
          <div key={i} className="ve-under" style={{ transform: `translate(${(i + 1) * 6}px, ${(i + 1) * 6}px)`, zIndex: 3 - i }} />
        ))}
        {atEnd && EndCard ? (
          <div key="end" className={`ve-card ve-end ${swiped ? "ve-enter" : ""}`} style={{ transform: `translateX(${dx}px) rotate(${dx / 25}deg)`, transition: motion }}>
            <EndCard {...slot} />
          </div>
        ) : (
        <div key={q.id} className={`ve-card ${swiped ? "ve-enter" : ""}`} style={{ transform: `translateX(${dx}px) rotate(${dx / 25}deg)`, transition: motion }}>
          {CardMenu && !onBack && <CardMenu {...slot} />}
          {onBack ? (
            <CardBack key={q.id} {...slot} />
          ) : (
            <div className="ve-front" onClick={() => setFlipped((f) => !f)}>
              <div className="ve-corner">{at + 1}/{questions.length}</div>
              <div className="ve-skill">{q.skill}{q.custom && <span className="ve-own"> · typed by you</span>}</div>
              <div className="ve-q">{q.text}</div>
              <div className="ve-tap">{flipped ? "Tap to hide your Matches" : "Tap to deal your Matches"}</div>
            </div>
          )}
        </div>
        )}
      </div>

      <div className="ve-below" style={{ transform: `translateX(${dx * 0.6}px)`, opacity: Math.max(0, 1 - Math.abs(dx) / 300), transition: motion }}>
        {!onBack && !atEnd && <Below key={q.id} {...slot} />}
      </div>

      {Overlay && !atEnd && <Overlay key={q.id} {...slot} />}

      <div className="ve-tally">
        {questions.filter((x) => picks[x.id]).length} kept · {questions.filter((x) => !x.unmatched && !x.matches.length).length} Gaps
        {at === 0 && <span className="ve-swipe-hint"> · swipe for the next Question</span>}
      </div>
    </div>
  );
}
