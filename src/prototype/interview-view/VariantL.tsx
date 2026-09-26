// PROTOTYPE — Variant L: card turns over. Dealing flips the Question card to its dark side (Question still
// readable), and the hand fans out underneath it in cream cards — dark card above, light hand below.
import { FlashcardShell, type SlotProps } from "./FlashcardShell";
import { Hand } from "./VariantG";
import { questions, type VariantProps } from "./data";

function Back({ q }: SlotProps) {
  return (
    <div className="ve-back vl-back">
      <div className="ve-label">Q{questions.indexOf(q) + 1} · {q.skill}</div>
      <div className="vl-q">{q.text}</div>
      <div className="vl-hint">{q.matches.length ? `${q.matches.length} ${q.matches.length === 1 ? "story fits" : "stories fit"} — pick one below` : "No story fits yet"}</div>
    </div>
  );
}

export function VariantL(props: VariantProps) {
  return (
    <div className="vl">
      <FlashcardShell {...props} Back={Back} Below={Hand} backHeight={220} />
    </div>
  );
}
