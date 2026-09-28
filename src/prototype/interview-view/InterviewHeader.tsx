// PROTOTYPE — header for the Interview practice screen (K1): back to the dashboard, which Interview this is,
// progress, Access Token status and Lock. Matches the D2 dashboard's top bar so the two screens feel connected.
import { interview, questions, type Picks } from "./data";

export function InterviewHeader({ picks, answers }: { picks: Picks; answers: Record<string, string> }) {
  const [role, company] = interview.title.split(" — ");
  const picked = questions.filter((q) => picks[q.id]).length;
  const gaps = questions.filter((q) => !q.matches.length).length;
  const answered = questions.filter((q) => answers[q.id]?.trim()).length;
  return (
    <header className="ih">
      <a className="ih-back" href="/prototype/dashboard?variant=D2" aria-label="Back to your Interviews">
        <span className="ih-arrow">←</span><span className="ih-back-text">Interviews</span>
      </a>
      <div className="ih-title">
        <strong>{role}</strong>
        <span className="ih-company">{company}</span>
      </div>
      <div className="ih-progress" title={`${picked} of ${questions.length} Questions have a story picked`}>
        <span className="ih-bar"><span style={{ width: `${(picked / questions.length) * 100}%` }} /></span>
        <span>{picked}/{questions.length} picked · {answered} answered · <span className="ih-gaps">{gaps} {gaps === 1 ? "Gap" : "Gaps"}</span></span>
      </div>
      <span className="ih-chip">Access · 6h left</span>
      <a className="ih-lock" href="/prototype/access?variant=A2&scenario=returning" title="Lock now">🔒<span className="ih-lock-text"> Lock</span></a>
    </header>
  );
}
