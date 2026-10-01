// The Scenario picked for each Question (#11): how many are picked, which Questions a Scenario is already used for,
// and keeping picks pointing at Matches that exist.
import type { Interview, MatchResult, Question } from "./interview";
import type { InterviewStore } from "./interviewStore";

export const pickedCount = (interview: Interview) => interview.questions.filter((q) => q.pickedScenarioId).length;

/** The numbers (Q1 = 1) of the other Questions in the Interview this Scenario is picked for. */
export const usedFor = (interview: Interview, scenarioId: string, exceptQuestionId: string) =>
  interview.questions.flatMap((q, i) => (q.id !== exceptQuestionId && q.pickedScenarioId === scenarioId ? [i + 1] : []));

/** A Question with new Matches: its pick is kept if it's still one of them, and cleared otherwise. */
export function withMatchResult(question: Question, matchResult: MatchResult): Question {
  const stillMatched = matchResult.matches.some((m) => m.scenarioId === question.pickedScenarioId);
  return { ...question, matchResult, pickedScenarioId: stillMatched ? question.pickedScenarioId : undefined };
}

/** Where a Scenario is picked: each Interview it's picked in, with the Question numbers. */
export function picksOf(interviews: (Interview & { id: string })[], scenarioId: string) {
  return interviews.flatMap((interview) => {
    const numbers = interview.questions.flatMap((q, i) => (q.pickedScenarioId === scenarioId ? [i + 1] : []));
    return numbers.length ? [{ interview, numbers }] : [];
  });
}

/** Clears every pick of these Scenarios, across all Interviews, e.g. once they're deleted. */
export async function clearPicksOf(store: InterviewStore, scenarioIds: string[]) {
  const ids = new Set(scenarioIds);
  const { interviews } = await store.list();
  for (const { id, questions } of interviews) {
    if (!questions.some((q) => q.pickedScenarioId && ids.has(q.pickedScenarioId))) continue;
    await store.update(id, (current) => ({
      ...current,
      questions: current.questions.map((q) => (q.pickedScenarioId && ids.has(q.pickedScenarioId) ? { ...q, pickedScenarioId: undefined } : q)),
    }));
  }
}
