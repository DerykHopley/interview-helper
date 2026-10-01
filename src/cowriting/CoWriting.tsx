import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { callProblemOf, SHARED_PROBLEM_TEXT, type CallProblem } from "../model-gateway/callProblems";
import { useModelGateway } from "../model-gateway/context";
import { ScenarioForm } from "../scenarios/ScenarioForm";
import type { Scenario } from "../scenarios/scenarioFormat";
import { draftAsScenario, EMPTY_DRAFT, MAX_ANSWER_LENGTH, MAX_ANSWERS, nextTurn, OPENER, PARTS, type Draft, type Exchange } from "./coWriter";

/** What each problem says, and whether its fix is a new Access Token (otherwise: try again). */
const PROBLEMS: Record<CallProblem, { text: string; needsToken?: boolean }> = {
  "no-token": { text: "Co-writing needs an active Access Token.", needsToken: true },
  "expired-token": { text: "Co-writing stopped: your Access Token has expired.", needsToken: true },
  unreachable: { text: SHARED_PROBLEM_TEXT.unreachable },
  "cut-off": { text: SHARED_PROBLEM_TEXT["cut-off"] },
  failed: { text: "The co-writer's reply couldn't be read this time. Try again." },
};

type Props = {
  /** Saves the approved draft as a co-written Scenario. */
  onSave: (scenario: Scenario) => Promise<void>;
  /** The draft was discarded: nothing is saved. */
  onDiscard: () => void;
  onNeedToken: () => void;
  onTokenExpired: () => void;
};

/** Co-writing a Scenario (W5 design): part chips above a chat, a reply box fixed to the bottom of the screen, then a
 * review of the draft at the top of the page. The chat lives in memory only, so discarding it leaves no trace. */
export function CoWriting({ onSave, onDiscard, onNeedToken, onTokenExpired }: Props) {
  const gateway = useModelGateway();
  const [chat, setChat] = useState<Exchange[]>([{ from: "co-writer", text: OPENER }]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [review, setReview] = useState<{ capped: boolean } | null>(null);
  const [text, setText] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [problem, setProblem] = useState<CallProblem | null>(null);
  const newest = useRef<HTMLLIElement>(null);

  // The page follows each new message, and the review starts at the top.
  useEffect(() => newest.current?.scrollIntoView?.({ block: "end", behavior: "smooth" }), [chat.length, problem]);
  useLayoutEffect(() => {
    if (review) document.documentElement.scrollTop = 0;
  }, [review]);

  /** Sends the newest answer (the last message in `sent`) with the chat before it. */
  async function ask(sent: Exchange[]) {
    setWaiting(true);
    setProblem(null);
    try {
      const turn = await nextTurn(gateway, sent.slice(0, -1), sent.at(-1)!.text);
      setChat([...sent, { from: "co-writer", text: turn.message }]);
      setDraft(turn.draft);
      const answers = sent.filter((m) => m.from === "you").length;
      if (turn.ready || answers >= MAX_ANSWERS) setReview({ capped: !turn.ready });
    } catch (e) {
      const found = callProblemOf(e); // including a reply that fails its schema
      if (found === "expired-token") onTokenExpired();
      setProblem(found);
    } finally {
      setWaiting(false);
    }
  }

  function send(event: { preventDefault(): void }) {
    event.preventDefault();
    const answer = text.trim();
    if (!answer || waiting) return;
    const sent: Exchange[] = [...chat, { from: "you", text: answer }];
    setChat(sent);
    setText("");
    void ask(sent);
  }

  if (review) {
    return (
      <div className="cowrite">
        <h2 className="cowrite-review-title">Review your draft</h2>
        <p className="cowrite-review-why">Your own answers, arranged. Edit anything, then approve it to save.</p>
        {review.capped && <p className="notice-info">That's as long as one chat can be, so here's the draft so far.</p>}
        <div className="card">
          <ScenarioForm initial={draftAsScenario(draft)} onSave={onSave} onCancel={onDiscard} saveLabel="Approve and save" cancelLabel="Discard draft" checkNow />
        </div>
      </div>
    );
  }

  const current = PARTS.findIndex((p) => !p.done(draft));
  const { text: problemText, needsToken } = problem ? PROBLEMS[problem] : { text: "", needsToken: false };
  return (
    <div className="cowrite has-reply-box">
      <h2 className="page-title">Co-write a Scenario</h2>
      <ol className="part-chips" aria-label="Parts of the Scenario">
        {PARTS.map((p, i) => {
          const done = p.done(draft);
          return (
            <li key={p.name} className={`part-chip${done ? " is-done" : i === current ? " is-current" : ""}`} aria-current={i === current ? "step" : undefined}>
              {done ? "✓ " : i === current ? "▸ " : ""}
              {p.name}
            </li>
          );
        })}
      </ol>
      <p className="cowrite-promise">
        The AI only asks questions and arranges your answers. It never adds facts, figures or achievements you didn't give
        it.
      </p>
      <ol className="chat" aria-label="Conversation">
        {chat.map((m, i) => (
          <li key={i} ref={i === chat.length - 1 ? newest : undefined} className={`chat-message is-${m.from === "you" ? "you" : "co-writer"}`} data-from={m.from}>
            {m.text}
          </li>
        ))}
      </ol>
      {waiting && (
        <p className="chat-waiting" role="status">
          The co-writer is thinking…
        </p>
      )}
      {problem && (
        <div role="alert" className="notice-warn">
          <p>{problemText}</p>
          <div className="actions">
            {needsToken && (
              <button type="button" className="button-secondary" onClick={onNeedToken}>
                Enter a new token
              </button>
            )}
            <button type="button" className="button-secondary" onClick={() => void ask(chat)}>
              Try again
            </button>
          </div>
        </div>
      )}
      <form className="reply-box" onSubmit={send}>
        <label htmlFor="cowrite-answer" className="visually-hidden">
          Your answer
        </label>
        <textarea
          id="cowrite-answer"
          className="field"
          rows={2}
          maxLength={MAX_ANSWER_LENGTH}
          placeholder="Type your answer"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send(e);
          }}
        />
        <div className="reply-box-actions">
          <button type="button" className="button-link" onClick={onDiscard}>
            Discard chat
          </button>
          <button type="submit" className="button-primary" disabled={!text.trim() || waiting || problem !== null}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
