// The speech model, in its own thread so the page stays responsive while it loads and runs (#33). Messages in:
// { id, samples } (16 kHz mono audio). Out: { id, progress } while the model downloads, then { id, text } or
// { id, error }.
import { env, pipeline } from "@huggingface/transformers";
import { SPEECH_MODEL } from "./speechModel";

env.allowLocalModels = false; // models come from Hugging Face, then the browser's cache

type Transcriber = (audio: Float32Array) => Promise<{ text: string } | { text: string }[]>;
let loading: Promise<Transcriber> | null = null;

self.onmessage = async (event: MessageEvent<{ id: number; samples: Float32Array }>) => {
  const { id, samples } = event.data;
  try {
    // Each file's progress, so the first use can show how much of the model has arrived.
    const files = new Map<string, { loaded: number; total: number }>();
    loading ??= pipeline("automatic-speech-recognition", SPEECH_MODEL, {
      dtype: "q8",
      device: "wasm", // works in every browser; measured fast enough (docs/prototypes/voice)
      progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (p.status !== "progress" || !p.file) return;
        files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 });
        const all = [...files.values()];
        const total = all.reduce((sum, f) => sum + f.total, 0);
        if (total > 0) self.postMessage({ id, progress: all.reduce((sum, f) => sum + f.loaded, 0) / total });
      },
    }) as unknown as Promise<Transcriber>;
    const transcribe = await loading;
    const result = await transcribe(samples);
    const text = Array.isArray(result) ? result.map((r) => r.text).join(" ") : result.text;
    self.postMessage({ id, text });
  } catch (e) {
    loading = null; // a failed download can be tried again
    self.postMessage({ id, error: e instanceof Error ? e.message : String(e) });
  }
};
