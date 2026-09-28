// PROTOTYPE — round 14: K1 with the missing states (finding Matches, token expired, Gap, re-run matching, a new
// Interview's Questions being written). S1 and S2 differ only in where Questions are managed:
//   S1 — a card at the end of the deck (ask for more, add your own) plus a ⋯ menu on each Question card
//   S2 — a "Questions" list from the header (jump to any, delete, add, ask for more) plus the same ⋯ menu
import { useState } from "react";
import { FlashcardShell, type SlotProps } from "./FlashcardShell";
import { Hand } from "./VariantK";
import { AnswerBar } from "./VariantK1";
import { InterviewHeader } from "./InterviewHeader";
import { CardMenu, EndCard, GeneratingCard, QuestionsSheet } from "./StateParts";
import type { VariantProps } from "./data";

export function VariantS1(props: VariantProps) {
  const Header = ({ picks, answers }: SlotProps) => <InterviewHeader picks={picks} answers={answers} />;
  const Empty = () => <><InterviewHeader picks={props.picks} answers={props.answers} /><GeneratingCard /></>;
  return <FlashcardShell {...props} Below={Hand} Overlay={AnswerBar} Header={Header} EndCard={EndCard} CardMenu={CardMenu} Empty={Empty} className="vk-table k1" />;
}

export function VariantS2(props: VariantProps) {
  // ?list=1 opens the Questions list (for screenshots)
  const [sheet, setSheet] = useState(() => new URLSearchParams(location.search).has("list"));
  const Header = ({ picks, answers, index, goTo }: SlotProps) => (
    <>
      <InterviewHeader picks={picks} answers={answers} onQuestions={() => setSheet(true)} />
      {sheet && <QuestionsSheet picks={picks} index={index} goTo={goTo} onClose={() => setSheet(false)} />}
    </>
  );
  const Empty = () => <><InterviewHeader picks={props.picks} answers={props.answers} /><GeneratingCard /></>;
  return <FlashcardShell {...props} Below={Hand} Overlay={AnswerBar} Header={Header} CardMenu={CardMenu} Empty={Empty} className="vk-table k1" />;
}
