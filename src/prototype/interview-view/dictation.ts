// PROTOTYPE — voice to text. Uses the browser's Web Speech API where it exists (Chrome, Edge, Safari, Android
// Chrome). Where it doesn't (e.g. Firefox), it plays a simulated transcript so the design can still be judged.
// Note for the real build: Chrome's recognition sends audio to Google's servers — see the round 12 notes.
import { useEffect, useRef, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpeechRecognitionImpl: any = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
export const speechSupported = !!SpeechRecognitionImpl && window.isSecureContext;

const SIMULATED =
  "At my last company the checkout rewrite was three months behind, so I took over as tech lead. " +
  "I cut the scope down to a strangler rollout and ran a short risk review every morning. " +
  "We shipped three weeks late instead of three months, and checkout errors dropped by forty percent.";

/** Calls `onFinal` with each finished chunk of speech; `interim` is the words still being recognised. */
export function useDictation(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const rec = useRef<{ stop: () => void } | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const stop = () => {
    rec.current?.stop();
    rec.current = null;
    setListening(false);
    setInterim("");
  };

  const start = () => {
    if (listening) return;
    setListening(true);
    if (speechSupported) {
      const r = new SpeechRecognitionImpl();
      r.continuous = true;
      r.interimResults = true;
      r.lang = navigator.language;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      r.onresult = (e: any) => {
        let pending = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const text = e.results[i][0].transcript;
          if (e.results[i].isFinal) onFinalRef.current(text.trim());
          else pending += text;
        }
        setInterim(pending);
      };
      r.onend = () => { setListening(false); setInterim(""); rec.current = null; };
      r.start();
      rec.current = r;
    } else {
      // Simulated: reveal the canned answer word by word, committing a sentence at a time.
      const sentences = SIMULATED.match(/[^.]+\./g)!.map((s) => s.trim());
      let s = 0, w = 0;
      const timer = setInterval(() => {
        const words = sentences[s].split(" ");
        w++;
        if (w < words.length) return setInterim(words.slice(0, w).join(" "));
        onFinalRef.current(sentences[s]);
        setInterim("");
        s++; w = 0;
        if (s >= sentences.length) stop();
      }, 140);
      rec.current = { stop: () => clearInterval(timer) };
    }
  };

  useEffect(() => () => rec.current?.stop(), []);
  return { listening, interim, start, stop, toggle: () => (listening ? stop() : start()) };
}

/** Joins a new dictated chunk onto existing text with sensible spacing. */
export const appendText = (text: string, chunk: string) => (text.trim() ? `${text.replace(/\s+$/, "")} ${chunk}` : chunk);

export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);
/** Rough spoken length at ~130 words per minute. */
export const spokenTime = (text: string) => {
  const s = Math.round((wordCount(text) / 130) * 60);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** The first few words of an answer, for a one-line preview. */
export const wordPreview = (text: string, words = 8) => {
  const all = text.trim().split(/\s+/);
  return all.slice(0, words).join(" ") + (all.length > words ? "…" : "");
};

/** The canned answer, for ?answer=demo screenshots. */
export const DEMO_ANSWER = SIMULATED;
