// PROTOTYPE — Variant K1: answer bar. K's deck with a chat-style composer pinned to the bottom of the screen:
// a text box that grows as you write, with a mic button beside it. The Matches stay visible above it.
import { FlashcardShell, type SlotProps } from "./FlashcardShell";
import { Hand } from "./VariantK";
import { AnswerStats, MicButton, SimulatedBadge } from "./AnswerParts";
import { appendText, useDictation } from "./dictation";
import { scenarioById, type VariantProps } from "./data";

function AnswerBar({ q, picks, answers, setAnswer, answering, setAnswering }: SlotProps) {
  const text = answers[q.id] ?? "";
  const d = useDictation((chunk) => setAnswer(q.id, (prev) => appendText(prev, chunk)));
  const kept = picks[q.id] && scenarioById(picks[q.id]!);
  const open = answering || d.listening;

  return (
    <div className={`k1-bar ${open ? "is-open" : ""}`}>
      {open && (
        <div className="k1-meta">
          <span>{kept ? <>Using <strong>{kept.title}</strong></> : "No story kept yet"}</span>
          <span><SimulatedBadge /> <AnswerStats text={text} /></span>
        </div>
      )}
      <div className="k1-row">
        <textarea
          className="k1-input"
          rows={open ? 4 : 1}
          placeholder={d.listening ? "Listening…" : "Type or say your answer"}
          value={text}
          onChange={(e) => setAnswer(q.id, e.target.value)}
          onFocus={() => setAnswering(true)}
          onBlur={() => !text && setAnswering(false)}
        />
        <MicButton listening={d.listening} onClick={d.toggle} />
      </div>
      {d.interim && <div className="k1-interim">{d.interim}…</div>}
    </div>
  );
}

export function VariantK1(props: VariantProps) {
  return <FlashcardShell {...props} Below={Hand} Overlay={AnswerBar} className="vk-table k1" />;
}
