import { useMemo, useState } from "react";
import { AccessChip } from "../access/AccessChip";
import { useCancellableEffect } from "../hooks";
import type { Interview } from "../interviews/interview";
import { interviewStore, type SavedInterview } from "../interviews/interviewStore";
import { InterviewScreen } from "../interviews/InterviewScreen";
import { InterviewsHome } from "../interviews/InterviewsHome";
import { JumpMenu } from "../interviews/JumpMenu";
import { ScenarioBank } from "../scenarios/ScenarioBank";
import { ScenarioBankCard } from "./ScenarioBankCard";
import { useAutoLock } from "../vault/useAutoLock";
import type { UnlockedVault } from "../vault/vault";

const TABS = [
  { key: "interviews", label: "Interviews" },
  { key: "scenario-bank", label: "Scenario Bank" },
] as const;
type Tab = (typeof TABS)[number]["key"];
type View = { tab: Tab } | { interviewId: string };

/** The unlocked app: the D2 dashboard (Interviews · Scenario Bank; #6 adds Backup), or one Interview's S3 screen.
 * Both keep the same header end, so the Access chip stays mounted across them. */
export function Dashboard({ vault, onLock }: { vault: UnlockedVault; onLock: () => void }) {
  useAutoLock(onLock);
  const interviews = useMemo(() => interviewStore(vault), [vault]);
  const [view, setView] = useState<View>({ tab: "interviews" });
  const open = "interviewId" in view ? view.interviewId : null;
  const tab = "tab" in view ? view.tab : null;
  const [opened, setOpened] = useState<SavedInterview | null>(null); // the open Interview, once read
  const [position, setPosition] = useState(0); // which card of its deck is showing

  useCancellableEffect(
    (isCurrent) => {
      setPosition(0);
      if (!open) return setOpened(null);
      interviews.get(open).then(
        (found) => isCurrent() && setOpened(found),
        () => {},
      );
    },
    [interviews, open],
  );

  async function saveOpened(interview: Interview) {
    if (!opened) return;
    await interviews.save(interview, opened.id);
    setOpened({ ...interview, id: opened.id });
  }

  return (
    <>
      <header className="top-bar">
        {open ? (
          <>
            <button type="button" className="button-back" onClick={() => setView({ tab: "interviews" })}>
              ← Interviews
            </button>
            {opened && (
              <>
                <h1 className="top-bar-interview">
                  <span className="interview-role">{opened.role}</span>
                  {opened.company && <span className="interview-company">{opened.company}</span>}
                </h1>
                <p className="top-bar-progress">
                  {opened.questions.length} {opened.questions.length === 1 ? "Question" : "Questions"}
                </p>
              </>
            )}
          </>
        ) : (
          <>
            <h1 className="top-bar-brand">Interview Helper</h1>
            <nav className="tabs" role="tablist" aria-label="Sections">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`tab-${key}`}
                  className="tab"
                  aria-selected={tab === key}
                  aria-controls={`panel-${key}`}
                  onClick={() => setView({ tab: key })}
                >
                  {label}
                </button>
              ))}
            </nav>
          </>
        )}
        <div className="top-bar-end">
          {opened && <JumpMenu questions={opened.questions} current={position} onJump={setPosition} />}
          <AccessChip vault={vault} />
          <button type="button" className="button-lock" onClick={onLock}>
            Lock
          </button>
        </div>
      </header>
      <main className="dashboard">
        {opened && <InterviewScreen key={opened.id} interview={opened} onChange={saveOpened} position={position} onMove={setPosition} />}
        {tab && (
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === "interviews" ? (
              <div className="home-grid">
                <InterviewsHome store={interviews} onOpen={(interviewId) => setView({ interviewId })} />
                <aside className="side-column" aria-label="Status">
                  <ScenarioBankCard vault={vault} onOpen={() => setView({ tab: "scenario-bank" })} />
                </aside>
              </div>
            ) : (
              <ScenarioBank vault={vault} />
            )}
          </div>
        )}
      </main>
    </>
  );
}
