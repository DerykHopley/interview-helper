// PROTOTYPE — Variant D2: classic dashboard. Tabs across the top (Interviews · Scenario Bank · Backup), the
// Interviews as a sortable-looking table (rows become cards on a phone), and a side column of status cards:
// Scenario Bank, backup, Gaps. "New Interview" opens a drawer from the right (full screen on a phone).
import { useState, type ReactNode } from "react";
import { interviewHref, totalGaps, type Dashboard } from "./data";
import { AccessChip, CreateInterviewForm, LockButton, Progress, StubPage } from "./Shared";

type Tab = "interviews" | "bank" | "backup";

export type D2Tab = Tab;

/** `bankPage` / `backupPage` replace those tabs' placeholders (used by the Scenario Bank and Backup prototypes). */
export function VariantD2({ dash, initialTab = "interviews", bankPage, backupPage }: { dash: Dashboard; initialTab?: Tab; bankPage?: ReactNode; backupPage?: ReactNode }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [drawer, setDrawer] = useState(() => new URLSearchParams(location.search).has("create"));
  const gaps = totalGaps(dash.interviews);

  return (
    <div className="d2">
      <header className="d2-bar">
        <span className="d2-brand">Interview Helper</span>
        <nav className="d2-tabs">
          {([["interviews", "Interviews"], ["bank", "Scenario Bank"], ["backup", "Backup"]] as [Tab, string][]).map(([k, label]) => (
            <button key={k} className={tab === k ? "is-on" : ""} onClick={() => setTab(k)}>{label}</button>
          ))}
        </nav>
        <span className="d2-right"><AccessChip dash={dash} /><LockButton /></span>
      </header>

      {tab === "bank" && bankPage ? (
        bankPage
      ) : tab === "backup" && backupPage ? (
        backupPage
      ) : tab !== "interviews" ? (
        <main className="d2-main"><StubPage kind={tab} dash={dash} /></main>
      ) : (
        <main className="d2-main d2-grid">
          <section>
            <div className="d2-head">
              <h1>Interviews</h1>
              <button className="db-primary" onClick={() => setDrawer(true)}>+ New Interview</button>
            </div>
            {dash.interviews.length === 0 ? (
              <div className="d2-empty">
                <strong>No Interviews yet.</strong> Create one by pasting the Job Spec of a job you're applying for.
                <button className="db-primary" onClick={() => setDrawer(true)}>+ New Interview</button>
              </div>
            ) : (
              <div className="d2-table" role="table">
                <div className="d2-row d2-th" role="row"><span>Role</span><span>Questions</span><span>Picked</span><span>Gaps</span><span>Last practised</span><span /></div>
                {dash.interviews.map((i) => (
                  <div key={i.id} className="d2-row" role="row">
                    <a className="d2-role" href={interviewHref()}><strong>{i.role}</strong><span>{i.company}</span></a>
                    <span data-label="Questions">{dash.generating === i.id ? <em className="d2-busy">Writing…</em> : i.questions || "—"}</span>
                    <span data-label="Picked" className="d2-picked"><Progress picked={i.picked} total={i.questions} /> {i.picked}/{i.questions}</span>
                    <span data-label="Gaps" className={i.gaps ? "d2-gap" : ""}>{i.gaps || "—"}</span>
                    <span data-label="Last practised">{i.lastPractised ?? "Never"}</span>
                    <span className="d2-actions">
                      <a className="db-secondary" href={interviewHref()}>Practise</a>
                      <button className="d2-del" onClick={() => confirm(`Delete the ${i.role} Interview?`) && dash.remove(i.id)} aria-label={`Delete ${i.role}`}>Delete</button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="d2-side">
            <div className="d2-card">
              <div className="d2-card-h">Scenario Bank</div>
              <div className="d2-big">{dash.bank.scenarios} <span>stories</span></div>
              {dash.bank.demo > 0 && <div className="d2-small">{dash.bank.demo} demo · <button className="db-link" onClick={dash.removeDemo}>Remove demo</button></div>}
              <button className="db-secondary" onClick={() => setTab("bank")}>Open Scenario Bank</button>
            </div>
            <div className={`d2-card ${dash.bank.lastExport ? "" : "is-warn"}`}>
              <div className="d2-card-h">Backup</div>
              <div className="d2-small">{dash.bank.lastExport ? `Last export ${dash.bank.lastExport}.` : "Never exported. If this browser clears its data, your stories are gone."}</div>
              <button className="db-secondary" onClick={dash.exportNow}>Export now</button>
            </div>
            {gaps > 0 && (
              <div className="d2-card">
                <div className="d2-card-h">Gaps</div>
                <div className="d2-small">{gaps} Questions have no good story yet.</div>
                <div className="d2-skills">{dash.interviews.flatMap((i) => i.gapSkills).map((s) => <span key={s}>{s}</span>)}</div>
              </div>
            )}
          </aside>
        </main>
      )}

      {drawer && (
        <>
          <div className="d2-scrim" onClick={() => setDrawer(false)} />
          <div className="d2-drawer">
            <div className="d2-drawer-head"><h2>New Interview</h2><button className="d2-x" onClick={() => setDrawer(false)} aria-label="Close">×</button></div>
            <CreateInterviewForm dash={dash} onDone={() => setDrawer(false)} onCancel={() => setDrawer(false)} />
          </div>
        </>
      )}
    </div>
  );
}
