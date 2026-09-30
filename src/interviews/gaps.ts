import { skillKey } from "../scenarios/skills";
import type { Interview } from "./interview";

/** The label for a Gap on a Question without a skill (typed Questions may have none). */
export const NO_SKILL = "no skill given";

export type SkillGaps = { skill: string; count: number }[];

/** How many Gap Questions each skill has across these Interviews, most first. Skills are grouped ignoring capitals
 * (skillKey), and shown as first written. */
export function gapsBySkill(interviews: Interview[]): SkillGaps {
  const counts = new Map<string, { skill: string; count: number }>();
  for (const question of interviews.flatMap((i) => i.questions)) {
    if (!question.matchResult?.gap) continue;
    const skill = question.skill ?? NO_SKILL;
    const entry = counts.get(skillKey(skill)) ?? { skill, count: 0 };
    counts.set(skillKey(skill), { ...entry, count: entry.count + 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill));
}

export const gapCount = (interview: Interview) => interview.questions.filter((q) => q.matchResult?.gap).length;
