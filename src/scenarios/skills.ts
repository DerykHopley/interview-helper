// Skill tags (GLOSSARY.md, Scenario) are compared ignoring capitals, and shown as the Candidate first wrote them.

/** What makes two skill tags the same skill. */
export const skillKey = (skill: string) => skill.trim().toLowerCase();

/** Each skill once, in the order first written, dropping blanks. */
export function uniqueSkills(skills: string[]) {
  const seen = new Set<string>();
  return skills.map((s) => s.trim()).filter((s) => s && !seen.has(skillKey(s)) && seen.add(skillKey(s)));
}

export const hasSkill = (skills: string[], key: string) => skills.some((s) => skillKey(s) === key);

/** How many Scenarios cover each skill, most first. */
export function skillCounts(scenarios: { skills: string[] }[]) {
  const counts = new Map<string, { key: string; skill: string; count: number }>();
  for (const { skills } of scenarios) {
    for (const skill of uniqueSkills(skills)) {
      const key = skillKey(skill);
      const entry = counts.get(key) ?? { key, skill, count: 0 };
      counts.set(key, { ...entry, count: entry.count + 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill));
}
