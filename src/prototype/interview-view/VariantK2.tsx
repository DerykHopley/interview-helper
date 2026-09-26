// PROTOTYPE — Variant K2: answer on the card. Once the Matches are dealt, "Answer this Question" turns the
// Question card over to a writing pad (the hand is put away) with the kept story named at the top and a
// large mic button. "Done" turns it back and the hand returns.
import { useState } from "react";
import { FlashcardShell, type SlotProps } from "./FlashcardShell";
import { Hand } from "./VariantK";
import { AnswerStats, MicButton, SimulatedBadge } from "./AnswerParts";
import { appendText, useDictation, wordPreview } from "./dictation";
import { scenarioById, type VariantProps } from "./data";

// Turn-over animation only when the pad is opened by a tap (not on page load).
let animateOpen = false;

function HandAndAnswer(props: SlotProps) {
  const text = props.answers[props.q.id] ?? "";
  return (
    <div className="k2-below">
      <Hand {...props} />
      {props.flipped && props.q.matches.length > 0 && (
        <button className="k2-answer-btn" onClick={() => { animateOpen = true; props.setAnswering(true); }}>
          {text ? <>✎ Your answer: <span className="k2-preview">{wordPreview(text)}</span></> : "✎ Answer this Question"}
        </button>
      )}
    </div>
  );
}

function AnswerPad({ q, picks, answers, setAnswer, setAnswering }: SlotProps) {
  const text = answers[q.id] ?? "";
  const d = useDictation((chunk) => setAnswer(q.id, (prev) => appendText(prev, chunk)));
  const kept = picks[q.id] && scenarioById(picks[q.id]!);
  const [animate] = useState(() => { const a = animateOpen; animateOpen = false; return a; });

  return (
    <div className={`k2-pad ${animate ? "is-turning" : ""}`}>
      <div className="k2-q">{q.text}</div>
      <div className="k2-using">{kept ? <>Using <strong>{kept.title}</strong></> : "No story kept yet — go back and keep one"}</div>
      <textarea
        className="k2-input"
        autoFocus
        placeholder="Write your answer here, or tap the mic and say it."
        value={text}
        onChange={(e) => setAnswer(q.id, e.target.value)}
      />
      {d.interim && <div className="k2-interim">{d.interim}…</div>}
      <div className="k2-foot">
        <MicButton listening={d.listening} onClick={d.toggle} size={52} />
        <div className="k2-status">
          <div>{d.listening ? "Listening — tap to stop" : "Tap to speak"} <SimulatedBadge /></div>
          <AnswerStats text={text} />
        </div>
        <button className="k2-done" onClick={() => { d.stop(); setAnswering(false); }}>Done</button>
      </div>
    </div>
  );
}

export function VariantK2(props: VariantProps) {
  return <FlashcardShell {...props} Below={HandAndAnswer} CardBack={AnswerPad} className="vk-table k2" />;
}
