// PROTOTYPE — Variant D1: decks on the table. Each Interview is a deck of Question cards on the same dark table
// as the practice view; the stack height hints at how many Questions it has. "+ New Interview" is an empty deck
// slot that opens into a Job Spec card. The Scenario Bank and Backup sit at the edge of the table as objects.
import { useState } from "react";
import { gapsText, interviewHref, type Dashboard } from "./data";
import { AccessChip, CreateInterviewForm, LockButton, Progress, StubPage } from "./Shared";

export function VariantD1({ dash }: { dash: Dashboard }) {
  const [creating, setCreating] = useState(() => new URLSearchParams(location.search).has("create"));
  const [page, setPage] = useState<"home" | "bank" | "backup">("home");
  const empty = dash.interviews.length === 0;

  return (
    <div className="d1">
      <header className="d1-bar">
        <button className="d1-brand" onClick={() => setPage("home")}>Interview Helper</button>
        <AccessChip dash={dash} />
        <LockButton />
      </header>

      {page !== "home" ? (
        <div className="d1-page"><button className="db-link" onClick={() => setPage("home")}>← Back to the table</button><StubPage kind={page} dash={dash} /></div>
      ) : creating ? (
        <div className="d1-createcard">
          <div className="d1-card-tag">New Interview</div>
          <h1 className="d1-h">What job are you preparing for?</h1>
          <CreateInterviewForm dash={dash} onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />
        </div>
      ) : (
        <>
          <h1 className="d1-title">{empty ? "Start with a job you're applying for" : "Your Interviews"}</h1>
          <div className="d1-decks">
            {dash.interviews.map((i) => {
              const layers = Math.min(3, Math.ceil(i.questions / 4));
              const busy = dash.generating === i.id;
              return (
                <a key={i.id} className="d1-deck" href={busy ? undefined : interviewHref()}>
                  {Array.from({ length: layers }).map((_, n) => (
                    <span key={n} className="d1-under" style={{ transform: `translate(${(n + 1) * 5}px, ${(n + 1) * 5}px)`, zIndex: 3 - n }} />
                  ))}
                  <span className="d1-face">
                    <span className="d1-company">{i.company}</span>
                    <span className="d1-role">{i.role}</span>
                    {busy ? (
                      <span className="d1-busy">Writing Questions…</span>
                    ) : (
                      <>
                        <Progress picked={i.picked} total={i.questions} />
                        <span className="d1-meta">
                          {i.questions ? `${i.picked}/${i.questions} picked` : "No Questions yet"}
                          {i.gaps > 0 && <span className="d1-gap"> · {gapsText(i.gaps)}</span>}
                        </span>
                        <span className="d1-when">{i.lastPractised ? `Practised ${i.lastPractised}` : "Not practised yet"}</span>
                      </>
                    )}
                  </span>
                  <button className="d1-delete" onClick={(e) => { e.preventDefault(); if (confirm(`Delete the ${i.role} Interview?`)) dash.remove(i.id); }} aria-label={`Delete ${i.role}`}>×</button>
                </a>
              );
            })}
            <button className={`d1-new ${empty ? "is-big" : ""}`} onClick={() => setCreating(true)}>
              <span className="d1-plus">+</span>
              <span>New Interview</span>
              <span className="d1-new-hint">Paste a Job Spec</span>
            </button>
          </div>

          <div className="d1-edge">
            <button className="d1-object d1-bank" onClick={() => setPage("bank")}>
              <span className="d1-obj-label">Scenario Bank</span>
              <span className="d1-obj-main">{dash.bank.scenarios} stories</span>
              <span className="d1-obj-sub">{dash.bank.demo ? `${dash.bank.demo} demo` : "all your own"}</span>
            </button>
            <button className={`d1-object d1-backup ${dash.bank.lastExport ? "" : "is-warn"}`} onClick={() => setPage("backup")}>
              <span className="d1-obj-label">Backup</span>
              <span className="d1-obj-main">{dash.bank.lastExport ? `Exported ${dash.bank.lastExport}` : "Never exported"}</span>
              <span className="d1-obj-sub">Import · Export · Packs</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
