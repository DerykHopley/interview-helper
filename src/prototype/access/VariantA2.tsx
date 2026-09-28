// PROTOTYPE — Variant A2: checklist. The whole setup on one page as a numbered list, each item with a one-line
// reason, so you can see what's coming and why there are two different secrets. Only the current item is open;
// finished items fold up into a one-line summary. Returning Candidates see the same list with the key item open.
import { useState } from "react";
import { hoursLeft, type Access } from "./access";
import { KeyReveal, StartChoice, StartOverForm, TokenForm, UnlockForm } from "./Forms";
import { Home } from "./Home";

type Item = "token" | "key" | "start";

function Row({ n, title, why, state, summary, children }: {
  n: number; title: string; why: string; state: "done" | "current" | "upcoming" | "danger"; summary?: string; children?: React.ReactNode;
}) {
  return (
    <li className={`a2-row is-${state}`}>
      <div className="a2-num">{state === "done" ? "✓" : n}</div>
      <div className="a2-body">
        <div className="a2-title">{title}{summary && state === "done" && <span className="a2-summary"> · {summary}</span>}</div>
        <div className="a2-why">{why}</div>
        {(state === "current" || state === "danger") && <div className="a2-open">{children}</div>}
      </div>
    </li>
  );
}

export function VariantA2({ access }: { access: Access }) {
  // ?step= and ?lost=1 open a given item (for screenshots)
  const [current, setCurrent] = useState<Item>(() => (new URLSearchParams(location.search).get("step") as Item) ?? "token");
  const [tokenSkipped, setTokenSkipped] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [lost, setLost] = useState(() => new URLSearchParams(location.search).has("lost"));
  const [tokenOpen, setTokenOpen] = useState(false);

  if (access.stage === "unlocked" && !tokenOpen) return <Home access={access} onAddToken={() => setTokenOpen(true)} />;

  const order: Item[] = ["token", "key", "start"];
  const stateOf = (i: Item) => (order.indexOf(i) < order.indexOf(current) ? "done" : i === current ? "current" : "upcoming");
  const tokenSummary = access.token ? `${access.token.label}, ${hoursLeft(access.token)}h left` : tokenSkipped ? "skipped — add it later" : undefined;

  return (
    <div className="a2">
      <div className="a2-col">
        <div className="a2-brand">Interview Helper</div>
        {access.stage === "first-visit" && (
          <>
            <h1 className="a2-h">Set up in three steps</h1>
            <p className="a2-lede">Your stories stay in this browser. Two different things keep them safe and let you use AI.</p>
            <ol className="a2-list">
              <Row n={1} title="Access Token" why="From your teacher or group. Lets the app use AI. Lasts 8 hours." state={stateOf("token")} summary={tokenSummary}>
                <TokenForm access={access} onDone={() => setCurrent("key")} onSkip={() => { setTokenSkipped(true); setCurrent("key"); }} />
              </Row>
              <Row n={2} title="Your Unlock Key" why="Made for you now. Locks your stories on this device. Never expires." state={stateOf("key")} summary="saved">
                <KeyReveal access={access} confirmed={confirmed} setConfirmed={setConfirmed} />
                <button className="ac-primary" disabled={!confirmed} onClick={() => setCurrent("start")}>Continue</button>
              </Row>
              <Row n={3} title="Choose how to start" why="Your own stories, or demo ones to try matching first." state={stateOf("start")}>
                <StartChoice access={access} />
              </Row>
            </ol>
          </>
        )}
        {access.stage === "locked" && (
          <>
            <h1 className="a2-h">Unlock your stories</h1>
            <ol className="a2-list">
              <Row n={1} title="Unlock Key" why="The key you saved when you set up. It never expires." state={lost ? "danger" : "current"}>
                {lost ? <StartOverForm access={access} onCancel={() => setLost(false)} /> : <UnlockForm access={access} onLost={() => setLost(true)} />}
              </Row>
            </ol>
            <div className="a2-status">
              Access Token: {access.token ? <span className="ac-chip is-ok">{access.token.label} · {hoursLeft(access.token)}h left</span> : <span className="ac-chip is-warn">{access.tokenExpired ? "expired" : "none"}</span>}
            </div>
          </>
        )}
        {access.stage === "unlocked" && (
          <>
            <h1 className="a2-h">Add a new Access Token</h1>
            <ol className="a2-list">
              <Row n={1} title="Access Token" why="Ask your teacher or group organiser for a new one. It lasts 8 hours." state="current">
                <TokenForm access={access} onDone={() => setTokenOpen(false)} />
                <button className="ac-link" onClick={() => setTokenOpen(false)}>Not now</button>
              </Row>
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
