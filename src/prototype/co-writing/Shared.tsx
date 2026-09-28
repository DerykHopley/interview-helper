// PROTOTYPE — pieces every co-writing variant uses: the reply box, the draft review (edit / approve / discard),
// and what happens after approving (saved, and for a Gap, re-matched).
import { useEffect, useState } from "react";
import { ScenarioForm } from "../scenario-bank/Shared";
import type { Scenario } from "../scenario-bank/data";
import type { Cowrite, Msg, Seed } from "./cowrite";

/** Assistant text is always rendered as plain text (React escapes it) — never as HTML (story 76). */
export function Bubble({ m }: { m: Msg }) {
  return <div className={`cw-msg is-${m.from} ${m.flag ? "is-flag" : ""}`}>{m.flag && <span className="cw-flag">Missing part</span>}{m.text}</div>;
}

export function Reply({ cw, placeholder = "Type your answer" }: { cw: Cowrite; placeholder?: string }) {
  const [text, setText] = useState("");
  if (cw.done) return null;
  const send = () => { cw.send(text); setText(""); };
  return (
    <form className="cw-reply" onSubmit={(e) => { e.preventDefault(); send(); }}>
      <textarea
        className="cw-input"
        rows={2}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
      />
      <div className="cw-reply-actions">
        <button type="button" className="cw-sample" onClick={() => setText(cw.sample())} title="Prototype only">Use sample answer</button>
        <button className="cw-send" disabled={!text.trim()}>Send</button>
      </div>
    </form>
  );
}

type Outcome = "saved" | "discarded" | null;

/** Review the draft: it can be edited, and only an approved draft is saved, with origin "co-written" (story 38–40). */
export function DraftReview({ cw, seed, onRestart }: { cw: Cowrite; seed: Seed; onRestart: () => void }) {
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [saved, setSaved] = useState<Scenario | null>(null);
  if (outcome === "discarded")
    return <div className="cw-outcome"><strong>Draft discarded.</strong> Nothing was saved. <button className="cw-link" onClick={onRestart}>Start again</button></div>;
  if (outcome === "saved" && saved) return <Saved s={saved} seed={seed} onRestart={onRestart} />;
  return (
    <div className="cw-review">
      <div className="cw-review-head">
        <strong>Review your draft</strong>
        <span>Your own answers, arranged. Edit anything, then approve it to save.</span>
      </div>
      <ScenarioForm
        initial={cw.draft}
        onSave={(s) => { setSaved(s); setOutcome("saved"); }}
        onCancel={() => { if (confirm("Discard this draft? Nothing will be saved.")) setOutcome("discarded"); }}
        saveLabel="Approve and save"
        cancelLabel="Discard draft"
      />
    </div>
  );
}

function Saved({ s, seed, onRestart }: { s: Scenario; seed: Seed; onRestart: () => void }) {
  const [matching, setMatching] = useState(seed.kind === "gap");
  useEffect(() => { if (matching) { const t = setTimeout(() => setMatching(false), 1600); return () => clearTimeout(t); } }, [matching]);
  return (
    <div className="cw-outcome is-ok">
      <strong>✓ Saved to your Scenario Bank</strong>
      <span>“{s.title}” · Co-written with AI</span>
      {seed.kind === "gap" && (
        matching ? (
          <div className="cw-rematch">Re-matching “{seed.question}”…</div>
        ) : (
          <div className="cw-rematch is-done">
            <strong>Gap closed.</strong> Your new story is now the best Match for this Question — 88% · “Shows you keeping an old system stable while its replacement was built.”
            <a className="cw-link" href="/?variant=K1&q=6&flipped=1">Back to the Question →</a>
          </div>
        )
      )}
      <div className="cw-outcome-actions">
        <a className="cw-link" href="/prototype/scenario-bank?variant=C4">Open Scenario Bank</a>
        <button className="cw-link" onClick={onRestart}>Write another</button>
      </div>
    </div>
  );
}

export function RulesNote() {
  return <div className="cw-rules">The AI only asks questions and arranges your answers. It never adds facts, figures or achievements you didn't give it.</div>;
}
