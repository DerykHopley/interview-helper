import { useMemo, useState } from "react";
import { useCancellableEffect } from "../hooks";
import type { Interview, MatchResult, Question } from "../interviews/interview";
import { withMatchResult } from "../interviews/picks";
import { useDevSettings } from "../dev/devSettings";
import { useModelGateway } from "../model-gateway/context";
import { callProblemOf } from "../model-gateway/callProblems";
import { scenarioBank, type SavedScenario } from "../scenarios/scenarioBank";
import type { UnlockedVault } from "../vault/vault";
import { scenariosFingerprint } from "./findMatches";
import type { MatchProblem, Staleness } from "./MatchesPanel";
import { findShippedMatches, pickedMatchingSetup, shippedMatcher } from "./shippedMatching";

/** Where one Question's Matches are on screen: dealt or not, being found, or why they couldn't be. */
/** `droppedPick` names a pick that re-matching cleared, because it's no longer one of the Matches (#11). */
type QuestionState = { dealt: boolean; finding: boolean; problem: MatchProblem | null; droppedPick: string | null };
const IDLE: QuestionState = { dealt: false, finding: false, problem: null, droppedPick: null };

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
  const picked = pickedMatchingSetup(useDevSettings()); // a Setup picked in the Developer panel (#17) makes a new Matcher
  const { matcher } = useMemo(() => shippedMatcher(gateway, picked), [gateway, picked]);
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
    set(question.id, { dealt: true, finding: true, problem: null, droppedPick: null });
    try {
      const { scenarios: current } = await bank.list();
      setScenarios(current);
      if (current.length === 0) return set(question.id, { problem: "no-scenarios" });
      const result = await findShippedMatches(gateway, question, current);
      const dropped = await save(question.id, result);
      if (dropped) set(question.id, { droppedPick: current.find((s) => s.id === dropped)?.title ?? null });
    } catch (e) {
      const problem = callProblemOf(e); // including a reply that didn't cover every Scenario
      if (problem === "expired-token") onTokenExpired();
      set(question.id, { problem });
    } finally {
      set(question.id, { finding: false });
    }
  }

  /** Saves new Matches on the Question, keeping its pick if it's still one of them. Resolves to the pick it cleared,
   * if any, once saved (from the latest saved Question, not the one on screen). */
  async function save(questionId: string, matchResult: MatchResult): Promise<string | null> {
    let dropped: string | null = null;
    try {
      await update((interview) => ({
        ...interview,
        questions: interview.questions.map((q) => {
          if (q.id !== questionId) return q;
          const next = withMatchResult(q, matchResult);
          dropped = q.pickedScenarioId && !next.pickedScenarioId ? q.pickedScenarioId : null;
          return next;
        }),
      }));
      return dropped;
    } catch {
      set(questionId, { problem: "not-saved" }); // the Vault locked meanwhile, or storage is full
      return null;
    }
  }

  return {
    scenarios,
    stateOf,
    /** Forgets the note about a cleared pick, e.g. once the Candidate picks again. */
    clearDroppedPick: (id: string) => set(id, { droppedPick: null }),
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
