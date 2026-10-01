import { useState } from "react";
import { scenariosFingerprint } from "../matching/findMatches";
import { callProblemOf, SHARED_PROBLEM_TEXT, type CallProblem } from "../model-gateway/callProblems";
import { useModelGateway } from "../model-gateway/context";
import type { SavedScenario } from "../scenarios/scenarioBank";
import { getFeedback } from "./feedback";
import type { Interview, Question } from "./interview";

/** Why Feedback couldn't be had just now: a model call problem, or the Feedback couldn't be saved. */
export type FeedbackProblem = CallProblem | "not-saved";

/** What each problem says, and whether its fix is a new Access Token (otherwise: Try again). */
export const FEEDBACK_PROBLEMS: Record<FeedbackProblem, { text: string; needsToken?: boolean }> = {
  "no-token": { text: "Feedback needs an active Access Token.", needsToken: true },
  "expired-token": { text: "Feedback stopped: your Access Token has expired.", needsToken: true },
  unreachable: { text: SHARED_PROBLEM_TEXT.unreachable },
  "cut-off": { text: SHARED_PROBLEM_TEXT["cut-off"] },
  failed: { text: "The feedback couldn't be read this time. Try again." },
  "not-saved": { text: "Couldn't save the Feedback. Try again." },
};

/** One Question's request for Feedback: being fetched, or why it last couldn't be, with the text it was asked for. */
export type FeedbackRequest = { busy: boolean; problem: FeedbackProblem | null; text: string };

/** How a Question's saved Feedback relates to what's on screen now: current, or out of date and why. */
export type FeedbackStaleness = "current" | "answer" | "other-scenario" | "edited-scenario";

/** Asking for Feedback on Answers (#32), per Question, and saving it with the Answer. */
export function useAnswerFeedback({ onChange, onTokenExpired, accessActive, scenarios }: {
  onChange: (change: (current: Interview) => Interview) => Promise<void>;
  onTokenExpired: () => void;
  accessActive: boolean;
  /** The Candidate's Scenarios, null until read. */
  scenarios: SavedScenario[] | null;
}) {
  const gateway = useModelGateway();
  const [requests, setRequests] = useState<Map<string, FeedbackRequest>>(new Map());
  const setRequest = (id: string, request: FeedbackRequest) => setRequests((all) => new Map(all).set(id, request));
  const pickedOf = (question: Question) => scenarios?.find((s) => s.id === question.pickedScenarioId);

  /** Asks for Feedback on the Answer as saved, against the picked Scenario, and saves it with the Answer. */
  async function ask(question: Question, text: string) {
    const scenario = pickedOf(question);
    if (!scenario) return;
    setRequest(question.id, { busy: true, problem: null, text });
    let checklist;
    try {
      checklist = await getFeedback(gateway, question, scenario, text);
    } catch (e) {
      const problem = callProblemOf(e); // including a reply that fails its schema
      if (problem === "expired-token") onTokenExpired();
      return setRequest(question.id, { busy: false, problem, text });
    }
    const feedback = { checklist, forText: text, forScenarioId: scenario.id, forScenarioFingerprint: scenariosFingerprint([scenario]), gotAt: new Date().toISOString() };
    try {
      await onChange((current) => ({
        ...current,
        questions: current.questions.map((q) => (q.id === question.id && q.answer ? { ...q, answer: { ...q.answer, feedback } } : q)),
      }));
      setRequest(question.id, { busy: false, problem: null, text });
    } catch {
      setRequest(question.id, { busy: false, problem: "not-saved", text }); // the Vault locked meanwhile, or storage failed
    }
  }

  return {
    ask,
    requestOf: (questionId: string) => requests.get(questionId),
    /** Why Feedback can't be asked for on this Answer yet, or null when it can. */
    blockedBy(question: Question, text: string): string | null {
      if (!text.trim()) return "Type an answer first";
      if (!question.pickedScenarioId) return "Pick a Match first";
      if (!accessActive) return "Needs an active Access Token";
      if (scenarios === null) return "Reading your Scenarios…";
      return pickedOf(question) ? null : "Pick a Match first"; // the picked one was deleted
    },
    /** Whether the saved Feedback is still about this Answer and the Scenario picked for it. */
    staleness(question: Question): FeedbackStaleness {
      const feedback = question.answer?.feedback;
      if (!feedback) return "current";
      if (feedback.forScenarioId !== question.pickedScenarioId) return "other-scenario";
      const scenario = pickedOf(question);
      if (scenario && feedback.forScenarioFingerprint !== scenariosFingerprint([scenario])) return "edited-scenario";
      return feedback.forText === question.answer?.text ? "current" : "answer";
    },
  };
}
