import { PopupMenu } from "../PopupMenu";
import type { Question } from "./interview";

/** S3's ☰ Questions menu in the header: every Question by number with its status, the current one marked; choosing
 * one jumps to it. Last comes the Readiness Report (#56), always there. */
export function JumpMenu({ questions, current, onJump, reportOpen, onReport }: {
  questions: Question[];
  /** The Question showing, unless the Readiness Report is. */
  current: number;
  onJump: (index: number) => void;
  reportOpen: boolean;
  onReport: () => void;
}) {
  if (questions.length === 0) return null;
  return (
    <PopupMenu
      label="Questions"
      className="jump"
      trigger={{ text: "☰ Questions", className: "button-header" }}
      items={[
        ...questions.map((question, i) => ({
        key: question.id,
        current: !reportOpen && i === current,
        label: (
          <>
            <span className="jump-number">{i + 1}</span>
            <StatusDot question={question} /> {question.text}
          </>
        ),
        onSelect: () => onJump(i),
        })),
        { key: "readiness", current: reportOpen, label: <span className="jump-report">◎ Readiness Report</span>, onSelect: onReport },
      ]}
    />
  );
}

/** ✓ once a Match is picked (#11), ! for a Gap, a circle once matched, a dashed circle before. */
function StatusDot({ question }: { question: Question }) {
  const status = question.pickedScenarioId ? "picked" : question.matchResult?.gap ? "gap" : question.matchResult ? "matched" : "unmatched";
  const label = { picked: "picked", gap: "Gap", matched: "matched", unmatched: "not matched yet" }[status];
  return (
    <span className={`jump-dot is-${status}`} aria-hidden="false">
      <span aria-hidden="true">{status === "picked" ? "✓" : status === "gap" ? "!" : ""}</span>
      <span className="visually-hidden">({label})</span>
    </span>
  );
}
