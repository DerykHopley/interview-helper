// PROTOTYPE — Variant K3: speak first. Under the dealt hand is one big mic button, like being asked the Question
// out loud. Tapping it opens a sheet from the bottom with a running timer and the live transcript, which you can
// then edit. A small keyboard button opens the same sheet for typing instead.
import { useEffect, useState } from "react";
import { FlashcardShell, type SlotProps } from "./FlashcardShell";
import { Hand } from "./VariantK";
import { AnswerStats, MicButton, SimulatedBadge } from "./AnswerParts";
import { appendText, useDictation } from "./dictation";
import { scenarioById, type VariantProps } from "./data";

// The mic under the hand opens the sheet; the sheet owns dictation, so it needs to know to start listening.
let startWithVoice = false;

function HandAndMic(props: SlotProps) {
  const text = props.answers[props.q.id] ?? "";
  const open = (voice: boolean) => {
    startWithVoice = voice;
    props.setAnswering(true);
  };
  return (
    <div className="k3-below">
      <Hand {...props} />
      {props.flipped && props.q.matches.length > 0 && (
        <div className="k3-actions">
          <button className="k3-type" onClick={() => open(false)} aria-label="Type your answer">⌨</button>
          <MicButton listening={false} onClick={() => open(true)} size={68} />
          <div className="k3-label">{text ? "Answer again, or tap ⌨ to edit" : "Tap to answer out loud"}</div>
        </div>
      )}
    </div>
  );
}

function AnswerSheet({ q, picks, answers, setAnswer, answering, setAnswering }: SlotProps) {
  const text = answers[q.id] ?? "";
  const d = useDictation((chunk) => setAnswer(q.id, (prev) => appendText(prev, chunk)));
  const [seconds, setSeconds] = useState(0);
  const kept = picks[q.id] && scenarioById(picks[q.id]!);

  useEffect(() => {
    if (answering && startWithVoice) {
      startWithVoice = false;
      setSeconds(0);
      d.start();
    }
  }, [answering]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!d.listening) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [d.listening]);

  const close = () => { d.stop(); setAnswering(false); };
  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <>
      <div className={`k3-scrim ${answering ? "is-open" : ""}`} onClick={close} />
      <div className={`k3-sheet ${answering ? "is-open" : ""}`}>
        <div className="k3-grip" onClick={close} />
        <div className="k3-head">
          <div>
            <div className="k3-title">Your answer</div>
            <div className="k3-using">{kept ? <>Using <strong>{kept.title}</strong></> : "No story kept yet"}</div>
          </div>
          <div className={`k3-timer ${d.listening ? "is-live" : ""}`}>{d.listening && <span className="k3-dot" />}{mmss}</div>
        </div>
        <textarea
          className="k3-input"
          placeholder={d.listening ? "Listening…" : "Your words will appear here. You can edit them."}
          value={text}
          onChange={(e) => setAnswer(q.id, e.target.value)}
        />
        {d.interim && <div className="k3-interim">{d.interim}…</div>}
        <div className="k3-foot">
          <button className="k3-clear" onClick={() => setAnswer(q.id, "")} disabled={!text}>Clear</button>
          <MicButton listening={d.listening} onClick={d.toggle} size={56} />
          <button className="k3-done" onClick={close}>Done</button>
        </div>
        <div className="k3-stats"><SimulatedBadge /> <AnswerStats text={text} /></div>
      </div>
    </>
  );
}

export function VariantK3(props: VariantProps) {
  return <FlashcardShell {...props} Below={HandAndMic} Overlay={AnswerSheet} className="vk-table k3" />;
}
