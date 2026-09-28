// PROTOTYPE — Variant D3: next step. The home screen leads with what to do now: resume the Interview you were
// on, then a short to-do list (fill Gaps, back up, remove demo stories), then all Interviews in a compact list.
// A new Interview starts right on the page — the Job Spec box is always there. On a phone, a bottom tab bar
// switches between Home, Stories and Backup.
import { useState } from "react";
import { gapsText, interviewHref, totalGaps, type Dashboard } from "./data";
import { AccessChip, CreateInterviewForm, LockButton, Progress, StubPage } from "./Shared";

type Tab = "home" | "bank" | "backup";

export function VariantD3({ dash }: { dash: Dashboard }) {
  const [tab, setTab] = useState<Tab>("home");
  const [composer, setComposer] = useState(() => new URLSearchParams(location.search).has("create"));
  const recent = dash.interviews.find((i) => i.lastPractised) ?? dash.interviews[0];
  const gaps = totalGaps(dash.interviews);
  const todos = [
    gaps > 0 && { key: "gaps", title: `Fill ${gapsText(gaps)}`, sub: dash.interviews.flatMap((i) => i.gapSkills).join(", "), action: "Co-write", onClick: () => setTab("bank") },
    !dash.bank.lastExport && dash.bank.scenarios > 0 && { key: "backup", title: "Back up your stories", sub: "Never exported — browsers can clear data", action: "Export", onClick: dash.exportNow },
    dash.bank.demo > 0 && { key: "demo", title: `Remove ${dash.bank.demo} demo story`, sub: "Once you've tried matching", action: "Remove", onClick: dash.removeDemo },
  ].filter(Boolean) as { key: string; title: string; sub: string; action: string; onClick: () => void }[];

  return (
    <div className="d3">
      <header className="d3-bar">
        <span className="d3-brand">Interview Helper</span>
        <nav className="d3-nav">
          {([["home", "Home"], ["bank", "Stories"], ["backup", "Backup"]] as [Tab, string][]).map(([k, label]) => (
            <button key={k} className={tab === k ? "is-on" : ""} onClick={() => setTab(k)}>{label}</button>
          ))}
        </nav>
        <span className="d3-right"><AccessChip dash={dash} /><LockButton /></span>
      </header>

      {tab !== "home" ? (
        <main className="d3-main"><StubPage kind={tab} dash={dash} /></main>
      ) : (
        <main className="d3-main">
          {recent && !composer ? (
            <a className="d3-hero" href={interviewHref()}>
              <span className="d3-eyebrow">{recent.lastPractised ? "Pick up where you left off" : "Your newest Interview"}</span>
              <span className="d3-hero-role">{recent.role}</span>
              <span className="d3-hero-co">{recent.company}</span>
              <Progress picked={recent.picked} total={recent.questions} />
              <span className="d3-hero-meta">{recent.picked}/{recent.questions} picked · {recent.answered} answered{recent.gaps ? ` · ${gapsText(recent.gaps)}` : ""}</span>
              <span className="d3-resume">Resume practising →</span>
            </a>
          ) : (
            <div className="d3-composer">
              <div className="d3-eyebrow">{recent ? "New Interview" : "Start here"}</div>
              <h1 className="d3-h">{recent ? "What job are you preparing for?" : "Paste the Job Spec of a job you're applying for"}</h1>
              <CreateInterviewForm dash={dash} onDone={() => setComposer(false)} onCancel={recent ? () => setComposer(false) : undefined} />
            </div>
          )}

          {todos.length > 0 && (
            <section className="d3-section">
              <h2>To do</h2>
              <ul className="d3-todos">
                {todos.map((t) => (
                  <li key={t.key}>
                    <span><strong>{t.title}</strong><span>{t.sub}</span></span>
                    <button className="db-secondary" onClick={t.onClick}>{t.action}</button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {dash.interviews.length > 0 && (
            <section className="d3-section">
              <div className="d3-section-head">
                <h2>All Interviews</h2>
                {!composer && <button className="db-link" onClick={() => setComposer(true)}>+ New Interview</button>}
              </div>
              <ul className="d3-list">
                {dash.interviews.map((i) => (
                  <li key={i.id}>
                    <a href={interviewHref()}>
                      <strong>{i.role}</strong> <span>{i.company}</span>
                    </a>
                    <span className="d3-list-meta">{dash.generating === i.id ? "Writing Questions…" : `${i.picked}/${i.questions}${i.gaps ? ` · ${gapsText(i.gaps)}` : ""}`}</span>
                    <button className="d3-del" onClick={() => confirm(`Delete the ${i.role} Interview?`) && dash.remove(i.id)} aria-label={`Delete ${i.role}`}>×</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      )}
    </div>
  );
}
