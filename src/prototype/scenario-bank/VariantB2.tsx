// PROTOTYPE — Variant B2: card grid. Every story is a card showing its measurable result up front, filterable by
// skill. Opening one shows it as a full document over the page, where Edit swaps in the form. "New story" opens
// the same overlay with the write-it-myself / co-write choice.
import { useState } from "react";
import { allTags, blank, type Bank, type Scenario } from "./data";
import { NewStoryChoice, OriginBadge, ScenarioForm, ScenarioReader, Tags, confirmDelete } from "./Shared";

type Sheet = { kind: "read" | "edit"; s: Scenario } | { kind: "choose" } | { kind: "new" } | null;

export function VariantB2({ bank }: { bank: Bank }) {
  const params = new URLSearchParams(location.search);
  const [sheet, setSheet] = useState<Sheet>(() => {
    const m = params.get("mode");
    if (m === "read" || m === "edit") return bank.scenarios[0] ? { kind: m, s: bank.scenarios[0] } : null;
    if (m === "choose" || m === "new") return { kind: m };
    return null;
  });
  const [tag, setTag] = useState<string | null>(null);
  const list = bank.scenarios.filter((s) => !tag || s.tags.includes(tag));
  const demo = bank.scenarios.filter((s) => s.origin === "demo").length;

  return (
    <main className="d2-main b2">
      <div className="b2-head">
        <div>
          <h1>Scenario Bank</h1>
          <div className="b2-count">{bank.scenarios.length} stories{demo ? ` · ${demo} demo — ` : ""}{demo > 0 && <button className="sb-link" onClick={bank.removeDemo}>remove all demo</button>}</div>
        </div>
        <button className="sb-primary" onClick={() => setSheet({ kind: "choose" })}>+ New story</button>
      </div>
      <div className="b2-filters">
        <button className={!tag ? "is-on" : ""} onClick={() => setTag(null)}>All</button>
        {allTags(bank.scenarios).map(([t, n]) => <button key={t} className={tag === t ? "is-on" : ""} onClick={() => setTag(t)}>{t} <span>{n}</span></button>)}
      </div>

      {bank.scenarios.length === 0 ? (
        <button className="b2-first" onClick={() => setSheet({ kind: "choose" })}><strong>+ Add your first story</strong><span>A real story from your career, in Situation · Task · Action · Result.</span></button>
      ) : (
        <div className="b2-grid">
          {list.map((s) => (
            <button key={s.id} className={`b2-card ${s.origin === "demo" ? "is-demo" : ""}`} onClick={() => setSheet({ kind: "read", s })}>
              <span className="b2-card-top"><OriginBadge origin={s.origin} />{s.usedIn.length > 0 && <span className="b2-picked">picked in {s.usedIn.length}</span>}</span>
              <span className="b2-title">{s.title}</span>
              <span className="b2-metric">{s.metrics}</span>
              <Tags tags={s.tags} />
            </button>
          ))}
        </div>
      )}

      {sheet && (
        <>
          <div className="b2-scrim" onClick={() => setSheet(null)} />
          <div className="b2-sheet">
            <button className="b2-x" onClick={() => setSheet(null)} aria-label="Close">×</button>
            {sheet.kind === "choose" && (<><h2 className="sb-h">Add a story</h2><NewStoryChoice onHand={() => setSheet({ kind: "new" })} onCancel={() => setSheet(null)} /></>)}
            {sheet.kind === "new" && (<><h2 className="sb-h">New story</h2><ScenarioForm initial={blank()} onSave={(s) => { bank.save(s); setSheet({ kind: "read", s }); }} onCancel={() => setSheet(null)} /></>)}
            {sheet.kind === "edit" && (<><h2 className="sb-h">Edit story</h2><ScenarioForm initial={sheet.s} onSave={(s) => { bank.save(s); setSheet({ kind: "read", s }); }} onCancel={() => setSheet({ kind: "read", s: sheet.s })} /></>)}
            {sheet.kind === "read" && (
              <>
                <h2 className="sb-h b2-doc-title">{sheet.s.title}</h2>
                <ScenarioReader s={sheet.s} />
                <div className="b2-sheet-actions">
                  <button className="sb-primary" onClick={() => setSheet({ kind: "edit", s: sheet.s })}>Edit</button>
                  <button className="sb-link" onClick={() => { if (confirmDelete(sheet.s)) { bank.remove(sheet.s.id); setSheet(null); } }}>Delete</button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </main>
  );
}
