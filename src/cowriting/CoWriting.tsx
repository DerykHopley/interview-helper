import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLatest } from "../hooks";
import { callProblemOf, SHARED_PROBLEM_TEXT, type AccessHandlers, type CallProblem } from "../model-gateway/callProblems";
import { useModelGateway } from "../model-gateway/context";
import { ScenarioForm } from "../scenarios/ScenarioForm";
import type { Scenario } from "../scenarios/scenarioFormat";
import { draftAsScenario, draftFor, MAX_ANSWER_LENGTH, MAX_ANSWERS, nextTurn, openerFor, PARTS, type Draft, type Exchange, type Seed } from "./coWriter";

/** What each problem says, and whether its fix is a new Access Token (otherwise: try again). */
const PROBLEMS: Record<CallProblem, { text: string; needsToken?: boolean }> = {
  "no-token": { text: "Co-writing needs an active Access Token.", needsToken: true },
  "expired-token": { text: "Co-writing stopped: your Access Token has expired.", needsToken: true },
  unreachable: { text: SHARED_PROBLEM_TEXT.unreachable },
  "cut-off": { text: SHARED_PROBLEM_TEXT["cut-off"] },
  failed: { text: "The co-writer's reply couldn't be read this time. Try again." },
};

/** What re-matching a Gap's Question found once the Scenario was saved (#13). */
export type RematchOutcome = { gap: true } | { gap: false; title: string; score: number; reason: string; isNew: boolean };

/** Re-matching a Gap's Question after saving: what each problem says, and whether its fix is a new Access Token. */
const REMATCH_PROBLEMS: Record<CallProblem, { text: string; needsToken?: boolean }> = {
  "no-token": { text: "Re-matching needs an active Access Token.", needsToken: true },
  "expired-token": { text: "Re-matching stopped: your Access Token has expired.", needsToken: true },
  unreachable: { text: SHARED_PROBLEM_TEXT.unreachable },
  "cut-off": { text: SHARED_PROBLEM_TEXT["cut-off"] },
  failed: { text: "Matching didn't work this time. Try again." },
};

type Props = {
  /** Saves the approved draft as a co-written Scenario. */
  onSave: (scenario: Scenario) => Promise<void>;
  /** The chat or its draft was discarded: nothing is saved. */
  onDiscard: () => void;
  access: AccessHandlers;
  /** What the chat starts from: a Gap's Question and skill, or a skill (#13). */
  seed?: Seed;
  /** For a chat from a Gap: re-matches its Question once the Scenario is saved, and goes back to it. */
  fromGap?: { rematch: () => Promise<RematchOutcome>; onBack: () => void };
};

/** Asked before a chat is thrown away, here or by leaving it (the dashboard asks the same). */
export const LEAVE_CHAT = "Leave and lose this chat? Nothing from it has been saved.";

/** Co-writing a Scenario (W5 design): part chips above a chat, a reply box fixed to the bottom of the screen, then a
 * review of the draft at the top of the page. The chat lives in memory only, so discarding it leaves no trace. */
export function CoWriting({ onSave, onDiscard, access, seed = {}, fromGap }: Props) {
  const gateway = useModelGateway();
  const [chat, setChat] = useState<Exchange[]>(() => [{ from: "co-writer", text: openerFor(seed) }]);
  const [draft, setDraft] = useState<Draft>(() => draftFor(seed));
  const [saved, setSaved] = useState(false); // from a Gap: saved, and re-matching
  const [review, setReview] = useState<{ capped: boolean } | null>(null);
  const [text, setText] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [problem, setProblem] = useState<CallProblem | null>(null);
  const [shownPart, setShownPart] = useState<string | null>(null); // a done chip's name, to show its words
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
      const turn = await nextTurn(gateway, sent.slice(0, -1), sent.at(-1)!.text, draft, seed);
      setChat([...sent, { from: "co-writer", text: turn.message }]);
      setDraft(turn.draft);
      const answers = sent.filter((m) => m.from === "you").length;
      if (turn.ready || answers >= MAX_ANSWERS) setReview({ capped: !turn.ready });
    } catch (e) {
      const found = callProblemOf(e); // including a reply that fails its schema
      if (found === "expired-token") access.onTokenExpired();
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

  async function approve(scenario: Scenario) {
    await onSave(scenario);
    if (fromGap) setSaved(true);
  }

  if (saved && fromGap) return <SavedFromGap question={seed.gap?.question ?? ""} {...fromGap} access={access} />;

  if (review) {
    return (
      <div className="cowrite">
        <h2 className="cowrite-review-title">Review your draft</h2>
        <p className="cowrite-review-why">Your own answers, arranged. Edit anything, then approve it to save.</p>
        {review.capped && <p className="notice-info">That's as long as one chat can be, so here's the draft so far.</p>}
        <div className="card">
          <ScenarioForm initial={draftAsScenario(draft)} onSave={approve} onCancel={onDiscard} saveLabel="Approve and save" cancelLabel="Discard draft" checkNow />
        </div>
      </div>
    );
  }

  const current = PARTS.findIndex((p) => !p.done(draft));
  const { text: problemText, needsToken } = problem ? PROBLEMS[problem] : { text: "", needsToken: false };
  return (
    <div className="cowrite has-reply-box">
      <h2 className="page-title">Co-write a Scenario</h2>
      {seed.gap && (
        <p className="gap-banner">
          For the Gap: “{seed.gap.question}”{seed.skill ? ` · ${seed.skill}` : ""}
        </p>
      )}
      {/* Pinned to the top while the chat scrolls, with a done part's words when its chip is clicked. */}
      <div className="part-bar">
        <ol className="part-chips" aria-label="Parts of the Scenario">
          {PARTS.map((p, i) => {
            const done = p.done(draft);
            return (
              <li key={p.name} className={`part-chip${done ? " is-done" : i === current ? " is-current" : ""}`} aria-current={i === current ? "step" : undefined}>
                {done ? (
                  <button type="button" className="part-chip-button" aria-expanded={shownPart === p.name} onClick={() => setShownPart((n) => (n === p.name ? null : p.name))}>
                    ✓ {p.name}
                  </button>
                ) : (
                  `${i === current ? "▸ " : ""}${p.name}`
                )}
              </li>
            );
          })}
        </ol>
        {shownPart && (
          <section className="part-words" aria-label={`${shownPart} so far`}>
            <p className="label-caps">{shownPart}</p>
            <p className="part-words-text">{PARTS.find((p) => p.name === shownPart)!.words(draft)}</p>
          </section>
        )}
      </div>
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
              <button type="button" className="button-secondary" onClick={access.onNeedToken}>
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
          <button type="button" className="button-link" onClick={() => confirm(LEAVE_CHAT) && onDiscard()}>
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

/** After saving a Scenario co-written from a Gap: its Question is re-matched, and the Candidate sees whether the Gap
 * closed, then goes back to it. */
function SavedFromGap({ question, rematch, onBack, access }: { question: string; access: AccessHandlers } & NonNullable<Props["fromGap"]>) {
  const [outcome, setOutcome] = useState<RematchOutcome | null>(null);
  const [problem, setProblem] = useState<CallProblem | null>(null);

  const run = useLatest(async () => {
    setProblem(null);
    try {
      setOutcome(await rematch());
    } catch (e) {
      const found = callProblemOf(e);
      if (found === "expired-token") access.onTokenExpired();
      setProblem(found);
    }
  });
  // Once: React's StrictMode runs effects twice in development, and each re-match is a paid call.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run.current();
  }, [run]);

  const back = (
    <button type="button" className="button-primary" onClick={onBack}>
      Back to the Question →
    </button>
  );
  const { text: problemText, needsToken } = problem ? REMATCH_PROBLEMS[problem] : { text: "", needsToken: false };
  return (
    <div className="cowrite">
      <p className="notice-ok">✓ Saved to your Scenario Bank</p>
      {!outcome && !problem && (
        <p className="chat-waiting" role="status">
          Re-matching “{question}”…
        </p>
      )}
      {problem && (
        <div role="alert" className="notice-warn">
          <p>{problemText}</p>
          <div className="actions">
            {needsToken && (
              <button type="button" className="button-secondary" onClick={access.onNeedToken}>
                Enter a new token
              </button>
            )}
            <button type="button" className="button-secondary" onClick={() => void run.current()}>
              Try again
            </button>
          </div>
        </div>
      )}
      {outcome && !outcome.gap && (
        <section className="card rematch-outcome is-closed" aria-label="Gap closed">
          <h3 className="card-title">Gap closed.</h3>
          <p>
            {outcome.isNew ? "Your new Scenario is now the best Match for this Question" : "This Question now has Matches. The best"}:{" "}
            <strong>{outcome.title}</strong> · {Math.round(outcome.score)}%
          </p>
          <p className="match-reason-on-card">{outcome.reason}</p>
          <div className="actions">{back}</div>
        </section>
      )}
      {outcome?.gap && (
        <section className="card rematch-outcome" aria-label="Still a Gap">
          <h3 className="card-title">Still a Gap.</h3>
          <p>Your new Scenario is saved, but it isn't a strong enough Match for this Question yet. You can edit it in the Scenario Bank and re-run matching.</p>
          <div className="actions">{back}</div>
        </section>
      )}
    </div>
  );
}
