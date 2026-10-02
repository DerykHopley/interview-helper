import { useState } from "react";
import { callProblemOf, SHARED_PROBLEM_TEXT, type CallProblem } from "../model-gateway/callProblems";
import { useModelGateway } from "../model-gateway/context";
import type { SavedScenario } from "../scenarios/scenarioBank";
import type { Interview } from "./interview";
import { getReadinessReport, readinessBlockedBy, readinessFingerprint } from "./readiness";

/** Why a Readiness Report couldn't be had just now: a model call problem, or it couldn't be saved. */
export type ReadinessProblem = CallProblem | "not-saved";

/** What each problem says, and whether its fix is a new Access Token (otherwise: Try again). */
export const READINESS_PROBLEMS: Record<ReadinessProblem, { text: string; needsToken?: boolean }> = {
  "no-token": { text: "The Readiness Report needs an active Access Token.", needsToken: true },
  "expired-token": { text: "The Readiness Report stopped: your Access Token has expired.", needsToken: true },
  unreachable: { text: SHARED_PROBLEM_TEXT.unreachable },
  "cut-off": { text: SHARED_PROBLEM_TEXT["cut-off"] },
  failed: { text: "The Readiness Report couldn't be read this time. Try again." },
  "not-saved": { text: "Couldn't save the Readiness Report. Try again." },
};

/** Asking for an Interview's Readiness Report (#56), and saving the latest with the Interview. */
export function useReadinessReport({ interview, onChange, onTokenExpired, accessActive, scenarios }: {
  interview: Interview;
  onChange: (change: (current: Interview) => Interview) => Promise<void>;
  onTokenExpired: () => void;
  accessActive: boolean;
  /** The Candidate's Scenarios, null until read. */
  scenarios: SavedScenario[] | null;
}) {
  const gateway = useModelGateway();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ReadinessProblem | null>(null);
  const blockedBy = readinessBlockedBy(interview, { accessActive, scenariosRead: scenarios !== null });

  /** Asks for a report on the Answers as saved, and keeps it with the Interview. */
  async function ask() {
    if (busy || blockedBy || !scenarios) return;
    setBusy(true);
    setProblem(null);
    const forFingerprint = readinessFingerprint(interview, scenarios); // of what's sent, so a change meanwhile shows
    let report;
    try {
      report = await getReadinessReport(gateway, interview, scenarios);
    } catch (e) {
      const found = callProblemOf(e); // including a reply that fails its schema
      if (found === "expired-token") onTokenExpired();
      setProblem(found);
      return setBusy(false);
    }
    try {
      await onChange((current) => ({ ...current, readinessReport: { report, forFingerprint, gotAt: new Date().toISOString() } }));
    } catch {
      setProblem("not-saved"); // the Vault locked meanwhile, or storage failed
    }
    setBusy(false);
  }

  const saved = interview.readinessReport;
  return {
    ask,
    busy,
    problem,
    blockedBy,
    /** Whether the saved report is on earlier Answers or picks than these. Not known until the Scenarios are read. */
    stale: saved !== undefined && scenarios !== null && saved.forFingerprint !== readinessFingerprint(interview, scenarios),
  };
}
export type ReadinessRequest = ReturnType<typeof useReadinessReport>;
