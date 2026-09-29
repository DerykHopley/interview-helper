import { useMemo, useState } from "react";
import { useCancellableEffect } from "../hooks";
import type { Interview, MatchResult, Question } from "../interviews/interview";
import { useModelGateway } from "../model-gateway/context";
import { ModelGatewayError } from "../model-gateway/ModelGateway";
import { scenarioBank, type SavedScenario } from "../scenarios/scenarioBank";
import type { UnlockedVault } from "../vault/vault";
import { findMatches, scenariosFingerprint } from "./findMatches";
import type { MatchProblem } from "./MatchesPanel";
import { MATCHERS, MATCHING_CONFIG } from "./matchingConfig";

/** Where one Question's Matches are on screen: dealt or not, being found, or why they couldn't be. */
type QuestionState = { dealt: boolean; finding: boolean; problem: MatchProblem | null };
const IDLE: QuestionState = { dealt: false, finding: false, problem: null };

/** How a failed matching call reads to the Candidate. */
function problemOf(e: unknown): MatchProblem {
  if (!(e instanceof ModelGatewayError)) return "failed"; // including a reply that didn't cover every Scenario
  if (e.code === "expired_token") return "expired-token";
  if (e.code === "missing_token" || e.code === "invalid_token") return "no-token";
  if (e.code === "reply_cut_off") return "cut-off";
  return e.code === "worker_unreachable" ? "unreachable" : "failed";
}

/** Finding and dealing a deck's Matches with the shipped Matcher (config), against the Candidate's current
 * Scenarios. Results are saved on each Question through `update`, which applies to the latest saved Interview. */
export function useQuestionMatches(vault: UnlockedVault, update: (change: (current: Interview) => Interview) => Promise<void>) {
  const gateway = useModelGateway();
  const bank = useMemo(() => scenarioBank(vault), [vault]);
  const { gapThreshold, create } = MATCHERS[MATCHING_CONFIG.matcher];
  const matcher = useMemo(() => create(gateway, MATCHING_CONFIG.promptVariant), [create, gateway]);
  const [scenarios, setScenarios] = useState<SavedScenario[] | null>(null); // null until read
  const [states, setStates] = useState<Map<string, QuestionState>>(new Map());

  useCancellableEffect(
    (isCurrent) => {
      bank.list().then(
        ({ scenarios }) => isCurrent() && setScenarios(scenarios),
        () => {},
      );
    },
    [bank],
  );

  const set = (id: string, change: Partial<QuestionState>) =>
    setStates((all) => new Map(all).set(id, { ...(all.get(id) ?? IDLE), ...change }));
  const stateOf = (id: string) => states.get(id) ?? IDLE;

  /** Finds the Question's Matches (again, for a re-run), and saves them on it. */
  async function match(question: Question) {
    set(question.id, { dealt: true, finding: true, problem: null });
    try {
      const { scenarios: current } = await bank.list();
      setScenarios(current);
      if (current.length === 0) return set(question.id, { problem: "no-scenarios" });
      const result = await findMatches({ matcher, gateway, settings: { gapThreshold, shown: MATCHING_CONFIG.shown } }, question, current);
      await save(question.id, result);
    } catch (e) {
      set(question.id, { problem: problemOf(e) });
    } finally {
      set(question.id, { finding: false });
    }
  }

  async function save(questionId: string, matchResult: MatchResult) {
    try {
      await update((interview) => ({ ...interview, questions: interview.questions.map((q) => (q.id === questionId ? { ...q, matchResult } : q)) }));
    } catch {
      set(questionId, { problem: "not-saved" }); // the Vault locked meanwhile, or storage is full
    }
  }

  return {
    scenarios,
    stateOf,
    match: (question: Question) => void match(question),
    /** Deals a Question's Matches: saved ones show at once; otherwise they're found now (the first time). */
    deal(question: Question) {
      if (stateOf(question.id).dealt) return set(question.id, { dealt: false });
      if (question.matchResult) return set(question.id, { dealt: true });
      void match(question);
    },
    /** Whether the Scenarios have changed since this Question's Matches were found. */
    isStale: (question: Question) =>
      !!question.matchResult && scenarios !== null && question.matchResult.scenariosFingerprint !== scenariosFingerprint(scenarios),
  };
}
