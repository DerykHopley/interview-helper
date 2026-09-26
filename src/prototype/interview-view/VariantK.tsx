// PROTOTYPE — Variant K: dark table. G's dealt hand on a dark card table, so the fanned Matches stand out
// the way H's dark card back does. The table stays dark before and after the flip.
import { FlashcardShell } from "./FlashcardShell";
import { Hand } from "./VariantG";
import type { VariantProps } from "./data";

export function VariantK(props: VariantProps) {
  return <FlashcardShell {...props} Below={Hand} className="vk-table" />;
}
