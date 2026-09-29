import type { Interview } from "./interview";

/** The label for a Gap on a Question without a skill (typed Questions may have none). */
export const NO_SKILL = "no skill given";

/** How many Gap Questions each skill has across these Interviews, most first. */
export function gapsBySkill(interviews: Interview[]) {
  const counts = new Map<string, number>();
  for (const question of interviews.flatMap((i) => i.questions)) {
    if (!question.matching?.gap) continue;
    const skill = question.skill ?? NO_SKILL;
    counts.set(skill, (counts.get(skill) ?? 0) + 1);
  }
  return [...counts.entries()].map(([skill, count]) => ({ skill, count })).sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill));
}

export const gapCount = (interview: Interview) => interview.questions.filter((q) => q.matching?.gap).length;
