// PROTOTYPE — Variant A1: card on the table. Continues the Interview view's dark card table: one card at a time,
// dealt from a small stack (welcome → Access Token → Unlock Key → how to start). The Unlock Key card is dark,
// to set it apart as the one secret that's yours. Returning Candidates get a single unlock card.
import { useEffect, useRef, useState } from "react";
import type { Access } from "./access";
import { KeyReveal, StartChoice, StartOverForm, TokenForm, UnlockForm } from "./Forms";
import { Home } from "./Home";

type Step = "welcome" | "token" | "key" | "start";
const STEPS: Step[] = ["welcome", "token", "key", "start"];

export function VariantA1({ access }: { access: Access }) {
  // ?step= and ?lost=1 open a given card (for screenshots)
  const [step, setStep] = useState<Step>(() => (new URLSearchParams(location.search).get("step") as Step) ?? "welcome");
  const [confirmed, setConfirmed] = useState(false);
  const [lost, setLost] = useState(() => new URLSearchParams(location.search).has("lost"));
  const [tokenOpen, setTokenOpen] = useState(false);

  const key = `${access.stage}-${step}-${lost}-${tokenOpen}`;
  // Deal-in animation only when moving between cards, not for the first card on page load.
  const firstKey = useRef(key);
  const [moved, setMoved] = useState(false);
  useEffect(() => { if (key !== firstKey.current) setMoved(true); }, [key]);

  if (access.stage === "unlocked" && !tokenOpen) return <Home access={access} onAddToken={() => setTokenOpen(true)} />;

  let card: React.ReactNode;
  let dark = false;
  let danger = false;
  let remaining = 0;

  if (access.stage === "unlocked") {
    card = (
      <>
        <div className="a1-step">Access</div>
        <h1 className="a1-h">Enter a new Access Token</h1>
        <p className="a1-p">Ask your teacher or group organiser for a new one. It lasts 8 hours.</p>
        <TokenForm access={access} onDone={() => setTokenOpen(false)} />
        <button className="ac-link" onClick={() => setTokenOpen(false)}>Not now</button>
      </>
    );
  } else if (access.stage === "locked") {
    danger = lost;
    card = lost ? (
      <>
        <div className="a1-step">Start over</div>
        <h1 className="a1-h">Start over without your key?</h1>
        <StartOverForm access={access} onCancel={() => setLost(false)} />
      </>
    ) : (
      <>
        <div className="a1-step">Locked</div>
        <h1 className="a1-h">Welcome back</h1>
        <p className="a1-p">Paste your Unlock Key to open your stories.</p>
        <UnlockForm access={access} onLost={() => setLost(true)} />
      </>
    );
  } else {
    remaining = STEPS.length - 1 - STEPS.indexOf(step);
    const n = STEPS.indexOf(step);
    if (step === "welcome")
      card = (
        <>
          <div className="a1-brand">Interview Helper</div>
          <h1 className="a1-h a1-h-big">Practise with your own stories</h1>
          <p className="a1-p">Match interview Questions to real stories from your career. Your stories stay in this browser, locked with a key only you have.</p>
          <button className="ac-primary" onClick={() => setStep("token")}>Get started</button>
        </>
      );
    if (step === "token")
      card = (
        <>
          <div className="a1-step">Step {n} of 3 · Access</div>
          <h1 className="a1-h">Enter your Access Token</h1>
          <p className="a1-p">Your teacher or group organiser gives you this. It lets the app use AI to find Matches, and lasts 8 hours.</p>
          <TokenForm access={access} onDone={() => setStep("key")} onSkip={() => setStep("key")} />
        </>
      );
    if (step === "key") {
      dark = true;
      card = (
        <>
          <div className="a1-step">Step {n} of 3 · Your Unlock Key</div>
          <h1 className="a1-h">This key locks your stories</h1>
          <KeyReveal access={access} confirmed={confirmed} setConfirmed={setConfirmed} />
          <button className="ac-primary" disabled={!confirmed} onClick={() => setStep("start")}>Continue</button>
        </>
      );
    }
    if (step === "start")
      card = (
        <>
          <div className="a1-step">Step {n} of 3 · Your stories</div>
          <h1 className="a1-h">How do you want to start?</h1>
          <StartChoice access={access} />
        </>
      );
  }

  return (
    <div className="a1">
      <div className="a1-deck">
        {Array.from({ length: Math.min(remaining, 3) }).map((_, i) => (
          <div key={i} className="a1-under" style={{ transform: `translate(${(i + 1) * 6}px, ${(i + 1) * 6}px)`, zIndex: 3 - i }} />
        ))}
        <div key={key} className={`a1-card ${moved ? "is-dealt" : ""} ${dark ? "is-dark" : ""} ${danger ? "is-danger" : ""}`}>{card}</div>
      </div>
      {access.stage === "first-visit" && (
        <div className="a1-dots">
          {STEPS.map((s) => <span key={s} className={s === step ? "is-on" : ""} />)}
        </div>
      )}
    </div>
  );
}
