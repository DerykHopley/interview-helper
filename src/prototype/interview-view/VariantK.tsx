// PROTOTYPE — Variant K: dark table. G's dealt hand, but dealing dims the room to a dark card table
// so the fanned Matches stand out, the way H's dark card back does.
import { FlashcardShell } from "./FlashcardShell";
import { Hand } from "./VariantG";
import type { VariantProps } from "./data";

export function VariantK(props: VariantProps) {
  return <FlashcardShell {...props} Below={Hand} flippedClass="vk-table" />;
}
