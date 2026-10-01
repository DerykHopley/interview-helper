import { useMemo, useState } from "react";
import { useCancellableEffect } from "../hooks";
import type { Interview, MatchResult, Question } from "../interviews/interview";
import { useModelGateway } from "../model-gateway/context";
import { callProblemOf } from "../model-gateway/callProblems";
import { scenarioBank, type SavedScenario } from "../scenarios/scenarioBank";
import type { UnlockedVault } from "../vault/vault";
import { scenariosFingerprint } from "./findMatches";
import type { MatchProblem, Staleness } from "./MatchesPanel";
import { findShippedMatches, shippedMatcher } from "./rematch";

/** Where one Question's Matches are on screen: dealt or not, being found, or why they couldn't be. */
type QuestionState = { dealt: boolean; finding: boolean; problem: MatchProblem | null };
const IDLE: QuestionState = { dealt: false, finding: false, problem: null };

/** Finding and dealing a deck's Matches with the shipped Matcher (config), against the Candidate's current
 * Scenarios. Results are saved on each Question through `update`, which applies to the latest saved Interview. */
export function useQuestionMatches(
  vault: UnlockedVault,
  update: (change: (current: Interview) => Interview) => Promise<void>,
  /** A call found the Access Token expired. */
  onTokenExpired: () => void = () => {},
  /** A Question whose Matches are dealt as the deck opens, e.g. one just re-matched from its Gap (#13). */
  dealtOnOpen: string | null = null,
) {
  const gateway = useModelGateway();
  const bank = useMemo(() => scenarioBank(vault), [vault]);
  const { matcher } = useMemo(() => shippedMatcher(gateway), [gateway]);
  const [scenarios, setScenarios] = useState<SavedScenario[] | null>(null); // null until read
  const [states, setStates] = useState<Map<string, QuestionState>>(() => new Map(dealtOnOpen ? [[dealtOnOpen, { ...IDLE, dealt: true }]] : []));

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
      const result = await findShippedMatches(gateway, question, current);
      await save(question.id, result);
    } catch (e) {
      const problem = callProblemOf(e); // including a reply that didn't cover every Scenario
      if (problem === "expired-token") onTokenExpired();
      set(question.id, { problem });
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
    /** What has changed since this Question's Matches were found, if anything: the Scenarios, or how they're matched. */
    staleness(question: Question): Staleness | null {
      const found = question.matchResult;
      if (!found || scenarios === null) return null;
      if (found.scenariosFingerprint !== scenariosFingerprint(scenarios)) return "scenarios";
      return found.matchedWith !== matcher.name ? "matcher" : null;
    },
  };
}
