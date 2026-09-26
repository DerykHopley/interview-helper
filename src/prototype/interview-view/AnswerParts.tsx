// PROTOTYPE — small pieces shared by the answer variants (K1–K3). Layout is each variant's own.
import { spokenTime, speechSupported, wordCount } from "./dictation";

export function MicButton({ listening, onClick, size = 44 }: { listening: boolean; onClick: () => void; size?: number }) {
  return (
    <button
      className={`ans-mic ${listening ? "is-listening" : ""}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      aria-label={listening ? "Stop dictation" : "Speak your answer"}
      title={speechSupported ? undefined : "No speech recognition in this browser — plays a simulated transcript"}
    >
      {listening ? (
        <svg viewBox="0 0 24 24" width={size * 0.42} height={size * 0.42}><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      )}
    </button>
  );
}

export function AnswerStats({ text }: { text: string }) {
  const n = wordCount(text);
  return <span className="ans-stats">{n} {n === 1 ? "word" : "words"} · ≈ {spokenTime(text)} spoken</span>;
}

export function SimulatedBadge() {
  return speechSupported ? null : <span className="ans-sim" title="This browser has no speech recognition">simulated voice</span>;
}
