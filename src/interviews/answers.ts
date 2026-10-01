// Answers to an Interview's Questions (#31): how many there are, when the Interview was last practised, and how long an
// Answer would take to say.
import type { Interview } from "./interview";

export const answeredCount = (interview: Interview) => interview.questions.filter((q) => q.answer).length;

/** When an Answer was last saved in the Interview, or null if none ever has been. */
export const lastPractised = (interview: Interview): Date | null => (interview.lastPractisedAt ? new Date(interview.lastPractisedAt) : null);

/** "Today", "Yesterday", "3 Oct" (with the year if it isn't this one), or "—" if never. */
export function practisedLabel(date: Date | null, now = new Date()): string {
  if (!date) return "—";
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAgo = Math.round((day(now) - day(date)) / 86_400_000);
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

/** A calm interview pace, for the answer bar's estimate. */
const WORDS_PER_MINUTE = 130;

export const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** How long this many words take to say, as "m:ss". */
export function spokenTime(words: number): string {
  const seconds = Math.round((words / WORDS_PER_MINUTE) * 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
