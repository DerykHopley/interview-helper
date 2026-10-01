import { useCallback, useMemo, useRef, useState } from "react";
import { AccessChip } from "../access/AccessChip";
import { BackupPage } from "../backup/BackupPage";
import { LEAVE_CHAT } from "../cowriting/CoWriting";
import { gapCount, gapsBySkill, NO_SKILL, type SkillGaps } from "../interviews/gaps";
import { interviewStore } from "../interviews/interviewStore";
import { InterviewScreen } from "../interviews/InterviewScreen";
import { InterviewsHome } from "../interviews/InterviewsHome";
import { JumpMenu } from "../interviews/JumpMenu";
import { useOpenInterview } from "../interviews/useOpenInterview";
import { answeredCount } from "../interviews/answers";
import { FIRST_BATCH } from "../interviews/questionGenerator";
import { useQuestionWriting } from "../interviews/useQuestionWriting";
import { ScenarioBank, type CoWriteStart } from "../scenarios/ScenarioBank";
import type { Question } from "../interviews/interview";
import { rematchAfterSaving } from "../matching/shippedMatching";
import { useModelGateway } from "../model-gateway/context";
import { countOf } from "../text";
import { useAutoLock } from "../vault/useAutoLock";
import type { UnlockedVault } from "../vault/vault";
import { useCancellableEffect } from "../hooks";
import { GapsCard } from "./GapsCard";
import { ScenarioBankCard } from "./ScenarioBankCard";

const TABS = [
  { key: "interviews", label: "Interviews" },
  { key: "scenario-bank", label: "Scenario Bank" },
  { key: "backup", label: "Backup" },
] as const;
type Tab = (typeof TABS)[number]["key"];
/** A tab, or an Interview: at one of its Questions, with that Question's Matches dealt (back from its Gap, #13). */
type View = { tab: Tab } | { interviewId: string; atQuestion?: string };
/** How the Scenario Bank opens: on the hand-written form with a skill, or on a co-writing chat. */
type BankStart = { form: string } | { coWrite: CoWriteStart };

type Props = {
  vault: UnlockedVault;
  onLock: () => void;
  /** An Interview to open first, e.g. the one setup just made from a Pack; otherwise the Interviews tab. */
  startInterviewId?: string | null;
};

/** The unlocked app: the D2 dashboard (Interviews · Scenario Bank · Backup), or one Interview's S3 screen. Both keep
 * the same header end, so the Access chip stays mounted across them. */
export function Dashboard({ vault, onLock, startInterviewId = null }: Props) {
  useAutoLock(onLock);
  const interviews = useMemo(() => interviewStore(vault), [vault]);
  const [view, setViewState] = useState<View>(startInterviewId ? { interviewId: startInterviewId } : { tab: "interviews" });
  const coWritingOpen = useRef(false); // a co-writing chat lives in memory only, so leaving it asks first
  const answerSaveNow = useRef<(() => Promise<void>) | null>(null); // the answer being typed, saved before locking
  const onAnswerSaveNow = useCallback((saveNow: (() => Promise<void>) | null) => void (answerSaveNow.current = saveNow), []);
  /** Locks, after saving an answer typed in the last moment (the auto-lock only comes after 15 quiet minutes). */
  const lock = async () => {
    await answerSaveNow.current?.().catch(() => {}); // the answer bar has already said if it failed
    onLock();
  };
  /** Shows a tab or an Interview; `start` opens the Scenario Bank on the form or a co-writing chat. */
  const setView = (next: View, start: BankStart | null = null) => {
    if (coWritingOpen.current && !confirm(LEAVE_CHAT)) return;
    coWritingOpen.current = false;
    setBankStart(start);
    setViewState(next);
  };
  const onCoWritingChange = useCallback((open: boolean) => void (coWritingOpen.current = open), []);
  const tab = "tab" in view ? view.tab : null;
  const atQuestion = "interviewId" in view ? (view.atQuestion ?? null) : null;
  const openInterview = useOpenInterview(interviews, "interviewId" in view ? view.interviewId : null, atQuestion);
  const ready = openInterview?.status === "ready" ? openInterview : null;
  const [accessRequests, setAccessRequests] = useState(0); // each one opens the Access Token panel
  const [bankStart, setBankStart] = useState<BankStart | null>(null);
  const [gaps, setGaps] = useState<SkillGaps>([]);
  const [accessActive, setAccessActive] = useState(false);
  const [expiredReports, setExpiredReports] = useState(0); // each one tells the Access chip the token has expired
  const reportTokenExpired = () => setExpiredReports((n) => n + 1);
  const writing = useQuestionWriting(interviews, reportTokenExpired);
  const gateway = useModelGateway();
  /** Co-writing from a Gap's Question (#13): re-matched once the Scenario is saved, then shown again with its Matches. */
  const fromGap = (interviewId: string, question: Question): CoWriteStart => ({
    seed: { skill: question.skill, gap: { question: question.text } },
    fromGap: {
      rematch: (newScenarioId) => rematchAfterSaving(gateway, vault, { interviewId, questionId: question.id, newScenarioId }),
      onBack: () => setView({ interviewId, atQuestion: question.id }),
    },
  });

  // Gaps by skill, for the Interviews tab's Gaps card and the Scenario Bank's "Not covered yet": read afresh from the
  // Interviews' saved Gaps each time a tab opens.
  useCancellableEffect(
    (isCurrent) => {
      if (!tab) return;
      interviews.list().then(
        (result) => isCurrent() && setGaps(gapsBySkill(result.interviews)),
        () => {},
      );
    },
    [interviews, tab],
  );
  const openGaps = ready ? gapCount(ready.interview) : 0;

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
                <p className="top-bar-progress">
                  {[
                    countOf(ready.interview.questions.length, "Question"),
                    answeredCount(ready.interview) > 0 && `${answeredCount(ready.interview)} answered`,
                    openGaps > 0 && countOf(openGaps, "Gap"),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
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
          {ready && <JumpMenu questions={ready.interview.questions} current={ready.position} onJump={ready.move} />}
          <AccessChip vault={vault} openRequests={accessRequests} expiredReports={expiredReports} onActiveChange={setAccessActive} />
          <button type="button" className="button-header" onClick={() => void lock()}>
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
          <InterviewScreen
            key={ready.interview.id}
            interview={ready.interview}
            onChange={ready.update}
            position={ready.position}
            onMove={ready.move}
            vault={vault}
            onNeedToken={() => setAccessRequests((n) => n + 1)}
            onTokenExpired={reportTokenExpired}
            writing={writing.stateOf(ready.interview.id)}
            accessActive={accessActive}
            onWrite={(batch) => writing.write(ready.interview.id, batch)}
            onOpenScenarioBank={() => setView({ tab: "scenario-bank" })}
            dealtOnOpen={atQuestion}
            onAnswerSaveNow={onAnswerSaveNow}
            onWriteScenario={(question) =>
              setView(
                { tab: "scenario-bank" },
                // Co-writing needs an active Access Token; without one, the hand-written form.
                accessActive ? { coWrite: fromGap(ready.interview.id, question) } : { form: question.skill ?? "" },
              )
            }
          />
        )}
        {tab && (
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === "interviews" ? (
              <div className="home-grid">
                <InterviewsHome
                  store={interviews}
                  onOpen={(interviewId) => setView({ interviewId })}
                  accessActive={accessActive}
                  onTokenExpired={reportTokenExpired}
                  onCreated={(interviewId, generate) => {
                    if (generate) writing.write(interviewId, FIRST_BATCH);
                    setView({ interviewId });
                  }}
                />
                <aside className="side-column" aria-label="Status">
                  <ScenarioBankCard vault={vault} onOpen={() => setView({ tab: "scenario-bank" })} />
                  <GapsCard gaps={gaps} />
                </aside>
              </div>
            ) : tab === "scenario-bank" ? (
              <ScenarioBank
                vault={vault}
                gapSkills={gaps.map((g) => g.skill).filter((s) => s !== NO_SKILL)}
                startNew={bankStart && "form" in bankStart ? bankStart.form : null}
                startCoWriting={bankStart && "coWrite" in bankStart ? bankStart.coWrite : null}
                access={{ active: accessActive, onNeedToken: () => setAccessRequests((n) => n + 1), onTokenExpired: reportTokenExpired }}
                onCoWritingChange={onCoWritingChange}
              />
            ) : (
              <BackupPage vault={vault} onPackAdded={(interviewId) => setView({ interviewId })} />
            )}
          </div>
        )}
      </main>
    </>
  );
}
