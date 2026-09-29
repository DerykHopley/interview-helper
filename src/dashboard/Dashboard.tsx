import { useMemo, useState } from "react";
import { AccessChip } from "../access/AccessChip";
import { interviewStore } from "../interviews/interviewStore";
import { InterviewScreen } from "../interviews/InterviewScreen";
import { InterviewsHome } from "../interviews/InterviewsHome";
import { JumpMenu } from "../interviews/JumpMenu";
import { useOpenInterview } from "../interviews/useOpenInterview";
import { ScenarioBank } from "../scenarios/ScenarioBank";
import { countOf } from "../text";
import { useAutoLock } from "../vault/useAutoLock";
import type { UnlockedVault } from "../vault/vault";
import { ScenarioBankCard } from "./ScenarioBankCard";

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
  const tab = "tab" in view ? view.tab : null;
  const openInterview = useOpenInterview(interviews, "interviewId" in view ? view.interviewId : null);
  const ready = openInterview?.status === "ready" ? openInterview : null;

  return (
    <>
      <header className="top-bar">
        {openInterview ? (
          <>
            <button type="button" className="button-back" onClick={() => setView({ tab: "interviews" })}>
              ← Interviews
            </button>
            {ready && (
              <>
                <h1 className="top-bar-interview">
                  <span className="interview-role">{ready.interview.role}</span>
                  {ready.interview.company && <span className="interview-company">{ready.interview.company}</span>}
                </h1>
                <p className="top-bar-progress">{countOf(ready.interview.questions.length, "Question")}</p>
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
          {ready && <JumpMenu questions={ready.interview.questions} current={ready.position} onJump={ready.move} />}
          <AccessChip vault={vault} />
          <button type="button" className="button-header" onClick={onLock}>
            Lock
          </button>
        </div>
      </header>
      <main className="dashboard">
        {openInterview?.status === "missing" && (
          <p role="alert" className="notice-blocking">
            This Interview couldn't be opened. It may have been deleted, or its data is damaged.
          </p>
        )}
        {ready && (
          <InterviewScreen key={ready.interview.id} interview={ready.interview} onChange={ready.save} position={ready.position} onMove={ready.move} />
        )}
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
