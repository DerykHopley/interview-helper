import { useEffect, useRef, useState } from "react";
import { useModelGateway } from "../model-gateway/context";

/** A long behavioural answer; recording stops itself here, so a forgotten mic doesn't record forever. */
const MAX_RECORDING_MS = 3 * 60_000;
/** The speech model's download, for the first-use explanation (Moonshine base, q8: docs/prototypes/voice). */
const DOWNLOAD_MB = 63;

type Phase =
  | { kind: "idle" }
  | { kind: "explaining" } // first use: what it will download, before it does
  | { kind: "starting" }
  | { kind: "recording"; startedAt: number }
  | { kind: "transcribing"; downloaded: number | null }; // how much of the model has arrived, on first use

/** Why voice can't be used in this browser at all, or null when it can. */
function unavailable(): string | null {
  if (window.isSecureContext === false) return "Recording needs a secure page (https:// or localhost)";
  if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return "This browser can't record audio";
  return null;
}

/** The answer bar's mic (#33): tap to record, tap to stop. What was said is turned into text by a speech model running
 * in this browser, so no audio leaves the device, and handed to `onTranscript`. */
export function VoiceButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const gateway = useModelGateway();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [problem, setProblem] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const reason = unavailable();

  // While recording: a ticking timer, and a stop at the cap.
  useEffect(() => {
    if (phase.kind !== "recording") return;
    const tick = setInterval(() => setNow(Date.now()), 250);
    const cap = setTimeout(() => recorder.current?.stop(), MAX_RECORDING_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(cap);
    };
  }, [phase.kind]);

  // Leaving the card mid-recording turns the microphone off.
  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  async function press() {
    setProblem(null);
    if (phase.kind === "recording") return recorder.current?.stop();
    if (phase.kind !== "idle") return;
    if (!(await gateway.transcriberDownloaded())) return setPhase({ kind: "explaining" });
    void record();
  }

  async function record() {
    setPhase({ kind: "starting" });
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setPhase({ kind: "idle" });
      return setProblem(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "The microphone was blocked. Allow it for this site in your browser's settings, then try again."
          : "No microphone could be found. Check one is connected, then try again.",
      );
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream.current);
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => void transcribe(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
    recorder.current = rec;
    rec.start();
    const startedAt = Date.now();
    setNow(startedAt);
    setPhase({ kind: "recording", startedAt });
  }

  async function transcribe(audio: Blob) {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    recorder.current = null;
    setPhase({ kind: "transcribing", downloaded: null });
    try {
      const text = (await gateway.transcribe(audio, (fraction) => setPhase({ kind: "transcribing", downloaded: fraction }))).trim();
      if (text) onTranscript(text);
      else setProblem("No speech was heard. Try again, a little closer to the microphone.");
    } catch {
      setProblem("Couldn't turn that into text. Try again, or type your answer.");
    }
    setPhase({ kind: "idle" });
  }

  const recording = phase.kind === "recording";
  const elapsed = recording ? Math.min(now - phase.startedAt, MAX_RECORDING_MS) : 0;
  const clock = `${Math.floor(elapsed / 60_000)}:${String(Math.floor((elapsed % 60_000) / 1000)).padStart(2, "0")}`;
  return (
    <div className="voice">
      {phase.kind === "explaining" && (
        <div className="voice-explain">
          <p>
            Voice needs a one-time download of about {DOWNLOAD_MB} MB. It stays in this browser, and your voice never leaves it.
          </p>
          <div className="actions">
            <button type="button" className="button-primary" onClick={() => void record()}>
              Download and record
            </button>
            <button type="button" className="button-link" onClick={() => setPhase({ kind: "idle" })}>
              Not now
            </button>
          </div>
        </div>
      )}
      {problem && (
        <p role="alert" className="voice-problem">
          {problem}
        </p>
      )}
      <div className="voice-row">
        {reason && <span className="form-hint">{reason}</span>}
        {recording && <span className="voice-clock">Recording {clock}</span>}
        {phase.kind === "transcribing" && (
          <span className="voice-clock">
            {phase.downloaded !== null && phase.downloaded < 1 ? `Downloading the speech model… ${Math.round(phase.downloaded * 100)}%` : "Transcribing…"}
          </span>
        )}
        <button
          type="button"
          className={`voice-mic${recording ? " is-recording" : ""}`}
          aria-label={recording ? "Stop recording" : "Record your answer"}
          disabled={reason !== null || phase.kind === "starting" || phase.kind === "transcribing"}
          onClick={() => void press()}
        >
          {recording ? <span className="voice-stop" aria-hidden="true" /> : <MicIcon />}
        </button>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}
