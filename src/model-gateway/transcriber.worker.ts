// The speech model, in its own thread so the page stays responsive while it loads and runs (#33). Messages in:
// { id, load: true } to get the model ready, or { id, samples } (16 kHz mono audio) to transcribe. Out: { progress }
// for everyone waiting while the model downloads, then { id, done: true }, { id, text } or { id, error }.
import { env, pipeline } from "@huggingface/transformers";
import { SPEECH_CACHE, SPEECH_DTYPE, SPEECH_MODEL } from "./speechModel";

env.allowLocalModels = false; // models come from Hugging Face, then the browser's cache
env.cacheKey = SPEECH_CACHE;

type Transcriber = (audio: Float32Array) => Promise<{ text: string } | { text: string }[]>;
let loading: Promise<Transcriber> | null = null;

/** Loads the model once, reporting progress over every file it has heard of, so the share never jumps backwards. */
function load() {
  if (loading) return loading;
  const files = new Map<string, { loaded: number; total: number }>();
  let shown = 0;
  loading = pipeline("automatic-speech-recognition", SPEECH_MODEL, {
    dtype: SPEECH_DTYPE,
    device: "wasm", // works in every browser; measured fast enough (docs/prototypes/voice)
    progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (!p.file || (p.status !== "progress" && p.status !== "initiate")) return;
      const before = files.get(p.file) ?? { loaded: 0, total: 0 };
      files.set(p.file, { loaded: p.loaded ?? before.loaded, total: p.total ?? before.total });
      const all = [...files.values()];
      const total = all.reduce((sum, f) => sum + f.total, 0);
      if (total === 0) return;
      shown = Math.max(shown, Math.min(all.reduce((sum, f) => sum + f.loaded, 0) / total, 0.99));
      self.postMessage({ progress: shown });
    },
  });
  loading.catch(() => (loading = null)); // a failed download can be tried again
  return loading;
}

self.onmessage = async (event: MessageEvent<{ id: number; load?: true; samples?: Float32Array }>) => {
  const { id, samples } = event.data;
  try {
    const transcribe = await load();
    if (!samples) return self.postMessage({ id, done: true });
    const result = await transcribe(samples);
    const text = Array.isArray(result) ? result.map((r) => r.text).join(" ") : result.text;
    self.postMessage({ id, text });
  } catch (e) {
    self.postMessage({ id, error: e instanceof Error ? e.message : String(e) });
  }
};
