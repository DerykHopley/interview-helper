// PROTOTYPE — Variant M: hand on the card. Flip the Question card; the Matches are fanned out
// on its dark back, where H put its list — G's cards, H's placement.
import { FlashcardShell, type SlotProps } from "./FlashcardShell";
import { Hand } from "./VariantG";
import type { VariantProps } from "./data";

function Back(props: SlotProps) {
  return (
    <div className="ve-back vm-back">
      <div className="ve-label">{props.q.text}</div>
      <Hand {...props} onCard />
    </div>
  );
}

export function VariantM(props: VariantProps) {
  return <FlashcardShell {...props} Back={Back} backHeight={340} />;
}
