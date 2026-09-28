// PROTOTYPE — header for the Interview practice screen (K1): back to the dashboard, which Interview this is,
// progress, Access Token status and Lock. Matches the D2 dashboard's top bar so the two screens feel connected.
import { TOKEN_EXPIRED, interview, questions, type Picks } from "./data";

export function InterviewHeader({ picks, answers, onQuestions }: { picks: Picks; answers: Record<string, string>; onQuestions?: () => void }) {
  const [role, company] = interview.title.split(" — ");
  const picked = questions.filter((q) => picks[q.id]).length;
  const gaps = questions.filter((q) => !q.unmatched && !q.matches.length).length;
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
        <span className="ih-bar"><span style={{ width: `${questions.length ? (picked / questions.length) * 100 : 0}%` }} /></span>
        <span>{picked}/{questions.length} picked · {answered} answered · <span className={gaps ? "ih-gaps" : ""}>{gaps} {gaps === 1 ? "Gap" : "Gaps"}</span></span>
      </div>
      {onQuestions && <button className="ih-qs" onClick={onQuestions}>☰<span className="ih-qs-text"> Questions</span></button>}
      <span className={`ih-chip ${TOKEN_EXPIRED ? "is-expired" : ""}`}>{TOKEN_EXPIRED ? "Access expired" : "Access · 6h left"}</span>
      <a className="ih-lock" href="/prototype/access?variant=A2&scenario=returning" title="Lock now">🔒<span className="ih-lock-text"> Lock</span></a>
    </header>
  );
}
