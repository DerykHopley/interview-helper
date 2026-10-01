import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLatest } from "../hooks";
import { countOf } from "../text";
import { spokenTime, wordCount } from "./answers";
import type { Question } from "./interview";

/** How long after the Candidate stops typing their Answer is saved. */
const SAVE_AFTER_MS = 600;
/** The box grows while they write, up to this share of the screen, then scrolls. */
const MAX_HEIGHT = 0.4;

type Status = "saved" | "saving" | "unsaved" | "failed";
const STATUS_TEXT: Record<Status, string> = {
  saved: "Saved",
  saving: "Saving…",
  unsaved: "",
  failed: "Couldn't save your answer. Keep typing to try again, or check this browser has storage space.",
};

/** Given a way to save what's typed now, without waiting for the pause (null once the bar has gone): the dashboard's
 * Lock button calls it before closing the Vault. */
export type OnSaveNow = (saveNow: (() => Promise<void>) | null) => void;

type Props = {
  question: Question;
  /** Saves the Answer on the Question; empty text clears it. Rejects when it can't be saved. */
  onSave: (text: string) => Promise<void>;
  onSaveNow?: OnSaveNow;
};

/** The K1 answer bar (#31): a box fixed to the bottom of the Interview screen for the Candidate's Answer to the Question
 * on show. It saves as they type, after a short pause, and when they move to another card or leave, so nothing typed
 * is lost. Mount it once per Question (`key`), so moving on saves what was there. */
export function AnswerBar({ question, onSave, onSaveNow }: Props) {
  const [text, setText] = useState(question.answer?.text ?? "");
  const [status, setStatus] = useState<Status>("saved");
  const box = useRef<HTMLTextAreaElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const requested = useRef(text); // the text last sent to be saved, so the same text isn't saved twice
  const latest = useLatest({ text, onSave });
  const edited = useRef(false); // typed in since this card opened

  // Until the Candidate types here, the box follows the saved Answer: one saved as they left this card may land just
  // after they come back to it.
  const savedText = question.answer?.text ?? "";
  useEffect(() => {
    if (edited.current) return;
    requested.current = savedText;
    setText(savedText);
  }, [savedText]);

  async function save(value: string) {
    if (value === requested.current) return;
    requested.current = value;
    setStatus("saving");
    try {
      await onSave(value);
      setStatus((s) => (requested.current === value && s !== "unsaved" ? "saved" : s));
    } catch {
      requested.current = ""; // so the next change tries again
      setStatus("failed");
    }
  }

  // Saved after a pause in typing.
  useEffect(() => {
    if (text === requested.current) return;
    const timer = setTimeout(() => void save(text), SAVE_AFTER_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `save` reads refs only; re-running on text is the point
  }, [text]);

  // Saved when the card changes or the Interview is left, if the pause hadn't come yet. Locking may already have
  // closed the Vault, so a failure here is let go: nothing is on screen to report it.
  useEffect(
    () => () => {
      const { text: last, onSave: saveNow } = latest.current;
      if (last !== requested.current) saveNow(last).catch(() => {});
    },
    [latest],
  );

  // What's typed can be saved at once, e.g. just before the Candidate locks the app.
  const saveLatest = useLatest(() => save(text));
  useEffect(() => {
    onSaveNow?.(() => saveLatest.current());
    return () => onSaveNow?.(null);
  }, [onSaveNow, saveLatest]);

  // Grows with what's written.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * MAX_HEIGHT)}px`;
  }, [text]);

  // The deck keeps room under its cards as tall as the bar, so the Matches and arrows stay in view above it.
  useEffect(() => {
    const el = bar.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement.style;
    const observer = new ResizeObserver(() => root.setProperty("--answer-bar-space", `${el.offsetHeight + 24}px`));
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.removeProperty("--answer-bar-space");
    };
  }, []);

  const words = wordCount(text);
  return (
    <div className="answer-bar" ref={bar}>
      <label htmlFor={`answer-${question.id}`} className="visually-hidden">
        Your answer
      </label>
      <textarea
        id={`answer-${question.id}`}
        ref={box}
        className="answer-box"
        rows={2}
        placeholder="Type your answer, as you'd say it"
        value={text}
        onChange={(e) => {
          edited.current = true;
          setText(e.target.value);
          if (status !== "failed") setStatus("unsaved");
        }}
      />
      <div className="answer-bar-foot">
        <span className="answer-length">{words > 0 ? `${countOf(words, "word")} · ≈ ${spokenTime(words)} spoken` : "Your answer is saved as you type"}</span>
        <span role="status" aria-label="Answer" className={`answer-status is-${status}`}>
          {STATUS_TEXT[status]}
        </span>
      </div>
    </div>
  );
}
