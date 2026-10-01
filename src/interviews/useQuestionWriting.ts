import { useState } from "react";
import { useModelGateway } from "../model-gateway/context";
import { callProblemOf, type CallProblem } from "../model-gateway/callProblems";
import type { InterviewStore } from "./interviewStore";
import { writeQuestions, type Batch } from "./questionGenerator";

/** Why Questions couldn't be written or kept just now. */
export type WriteProblem = CallProblem | "not-saved";

/** Where writing one Interview's Questions is: under way, or why it last failed. */
export type Writing = { active: boolean; problem: WriteProblem | null };
const IDLE: Writing = { active: false, problem: null };

/** Writing Questions for Interviews (#9). It lives with the dashboard, not an Interview's screen, so Questions still
 * arrive and are saved after the Candidate leaves the Interview. They're lost if the app locks or reloads first. */
export function useQuestionWriting(store: InterviewStore, onTokenExpired: () => void) {
  const gateway = useModelGateway();
  const [states, setStates] = useState<Map<string, Writing>>(new Map());
  const set = (id: string, writing: Writing) => setStates((all) => new Map(all).set(id, writing));

  async function write(id: string, batch: Batch) {
    set(id, { active: true, problem: null });
    let added;
    try {
      const interview = await store.get(id);
      if (!interview) return set(id, { active: false, problem: "not-saved" });
      if (!interview.jobSpec) return set(id, { active: false, problem: "failed" }); // a Pack's, without one: not offered
      added = await writeQuestions(gateway, { jobSpec: interview.jobSpec, existing: interview.questions.map((q) => q.text), batch });
    } catch (e) {
      const problem = callProblemOf(e); // including a reply that fails its schema
      if (problem === "expired-token") onTokenExpired();
      return set(id, { active: false, problem });
    }
    try {
      await store.update(id, (latest) => ({ ...latest, questions: [...latest.questions, ...added] }));
      set(id, IDLE);
    } catch {
      set(id, { active: false, problem: "not-saved" }); // the Vault locked meanwhile, or storage is full
    }
  }

  return {
    stateOf: (id: string) => states.get(id) ?? IDLE,
    write: (id: string, batch: Batch) => void write(id, batch),
  };
}
