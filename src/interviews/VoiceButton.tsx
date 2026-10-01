import { useEffect, useRef, useState } from "react";
import { useLatest } from "../hooks";
import { useModelGateway } from "../model-gateway/context";
import { SPEECH_MODEL_MB } from "../model-gateway/speechModel";

/** A long behavioural answer; recording stops itself here, so a forgotten mic doesn't record forever. */
const MAX_RECORDING_MS = 3 * 60_000;

type Phase =
  | { kind: "idle" }
  | { kind: "explaining" } // first use: what it will download, before it does
  | { kind: "starting" }
  | { kind: "recording"; startedAt: number }
  | { kind: "transcribing" };

/** Why voice can't be used in this browser at all, or null when it can. */
function unavailable(): string | null {
  if (window.isSecureContext === false) return "Recording needs a secure page (https:// or localhost)";
  if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return "This browser can't record audio";
  return null;
}

type Props = {
  /** What was said, while the mic is still on screen. */
  onTranscript: (text: string) => void;
  /** What was said after the Candidate left mid-recording, when it still has somewhere to go (the answer bar: its
   * Question). Without it, a recording cut short by leaving is dropped without being transcribed. */
  onTranscriptAfterLeaving?: (text: string) => void;
};

/** The mic beside the answer bar (#33) and the co-writing reply box (#54): tap to record, tap to stop. What was said
 * is turned into text by a speech model running in this browser, so no audio leaves the device. Leaving turns the
 * microphone off at once. */
export function VoiceButton({ onTranscript, onTranscriptAfterLeaving }: Props) {
  const gateway = useModelGateway();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [problem, setProblem] = useState<{ text: string; retry?: Blob } | null>(null);
  const [download, setDownload] = useState<number | null>(null); // how much of the model has arrived, while it does
  const [now, setNow] = useState(() => Date.now());
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const onScreen = useRef(true);
  const handlers = useLatest({ onTranscript, onTranscriptAfterLeaving });
  const reason = unavailable();

  const micOff = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };

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

  // Leaving: the microphone goes off at once, and a recording under way stops (transcribed only if it has somewhere to go).
  useEffect(() => {
    onScreen.current = true;
    return () => {
      onScreen.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      micOff();
    };
  }, []);

  async function press() {
    setProblem(null);
    if (phase.kind === "recording") return recorder.current?.stop();
    if (phase.kind !== "idle") return;
    try {
      if (!(await gateway.transcriberDownloaded())) return setPhase({ kind: "explaining" });
    } catch {
      return setPhase({ kind: "explaining" }); // can't tell: explain, to be safe
    }
    await record();
  }

  /** Agreeing to the download starts it straight away, while the Candidate records. */
  function agree() {
    gateway.prepareTranscriber((fraction) => onScreen.current && setDownload(fraction)).then(
      () => onScreen.current && setDownload(null),
      () => onScreen.current && setDownload(null), // the recording is kept; transcribing will try again
    );
    void record();
  }

  async function record() {
    setPhase({ kind: "starting" });
    let mic: MediaStream;
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      if (!onScreen.current) return;
      setPhase({ kind: "idle" });
      return setProblem({
        text:
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "The microphone was blocked. Allow it for this site in your browser's settings, then try again."
            : "No microphone could be found. Check one is connected, then try again.",
      });
    }
    stream.current = mic;
    if (!onScreen.current) return micOff(); // the card changed while the microphone was starting
    try {
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(mic);
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        micOff();
        recorder.current = null;
        if (!onScreen.current && !handlers.current.onTranscriptAfterLeaving) return; // nowhere for it to go
        void transcribe(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
      };
      rec.start();
      recorder.current = rec;
    } catch {
      micOff();
      setPhase({ kind: "idle" });
      return setProblem({ text: "This browser couldn't start recording. Try again, or type your answer." });
    }
    const startedAt = Date.now();
    setNow(startedAt);
    setPhase({ kind: "recording", startedAt });
  }

  async function transcribe(audio: Blob) {
    if (onScreen.current) setPhase({ kind: "transcribing" });
    let text: string;
    try {
      text = (await gateway.transcribe(audio, (fraction) => onScreen.current && setDownload(fraction))).trim();
    } catch {
      if (!onScreen.current) return; // left the card, and it couldn't be transcribed: nothing on screen to say so
      setDownload(null);
      setPhase({ kind: "idle" });
      return setProblem({ text: "Couldn't turn that into text. Try again, or type your answer.", retry: audio });
    }
    if (!onScreen.current) return void (text && handlers.current.onTranscriptAfterLeaving?.(text));
    setDownload(null);
    setPhase({ kind: "idle" });
    if (text) handlers.current.onTranscript(text);
    else setProblem({ text: "No speech was heard. Try again, a little closer to the microphone." });
  }

  const recording = phase.kind === "recording";
  const elapsed = recording ? Math.min(now - phase.startedAt, MAX_RECORDING_MS) : 0;
  const clock = `${Math.floor(elapsed / 60_000)}:${String(Math.floor((elapsed % 60_000) / 1000)).padStart(2, "0")}`;
  const downloading = download !== null && `Downloading the speech model… ${Math.round(download * 100)}%`;
  return (
    <div className="voice">
      {phase.kind === "explaining" && (
        <div className="voice-explain">
          <p>
            Voice needs a one-time download of about {SPEECH_MODEL_MB} MB. It stays in this browser, and your voice never leaves it.
          </p>
          <div className="actions">
            <button type="button" className="button-primary" onClick={agree}>
              Download and record
            </button>
            <button type="button" className="button-link" onClick={() => setPhase({ kind: "idle" })}>
              Not now
            </button>
          </div>
        </div>
      )}
      {problem && (
        <div role="alert" className="voice-problem">
          <span>{problem.text}</span>
          {problem.retry && (
            <button
              type="button"
              className="button-link"
              onClick={() => {
                const audio = problem.retry!;
                setProblem(null);
                void transcribe(audio);
              }}
            >
              Try again
            </button>
          )}
        </div>
      )}
      <div className="voice-row">
        {reason && <span className="form-hint">{reason}</span>}
        {recording && <span className="voice-clock">Recording {clock}</span>}
        {(downloading || phase.kind === "transcribing") && <span className="voice-clock">{downloading || "Transcribing…"}</span>}
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
