// Speech to text in this browser (#33): the recording is decoded here, then a speech model in a Web Worker turns it into
// text. No audio leaves the device; the model itself downloads once from Hugging Face and is cached by the browser.
import type { ModelGateway } from "./ModelGateway";
import { SPEECH_MODEL } from "./speechModel";

/** The cache transformers.js keeps downloaded models in. */
const MODEL_CACHE = "transformers-cache";

type Reply = { id: number; progress?: number; text?: string; error?: string };

export function browserTranscriber(): Pick<ModelGateway, "transcribe" | "transcriberDownloaded"> {
  let worker: Worker | null = null;
  let nextId = 0;
  const waiting = new Map<number, { resolve: (text: string) => void; reject: (e: Error) => void; onDownload?: (fraction: number) => void }>();

  // Started on first use, so the app's own load doesn't fetch the model code.
  function theWorker() {
    if (worker) return worker;
    worker = new Worker(new URL("./transcriber.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }: MessageEvent<Reply>) => {
      const job = waiting.get(data.id);
      if (!job) return;
      if (data.progress !== undefined) return job.onDownload?.(data.progress);
      waiting.delete(data.id);
      if (data.error !== undefined) job.reject(new Error(data.error));
      else job.resolve(data.text ?? "");
    };
    return worker;
  }

  return {
    async transcribe(audio, onDownload) {
      const samples = await toMono16k(audio);
      const id = nextId++;
      return new Promise<string>((resolve, reject) => {
        waiting.set(id, { resolve, reject, onDownload });
        theWorker().postMessage({ id, samples }, [samples.buffer]);
      });
    },
    async transcriberDownloaded() {
      try {
        const keys = await (await caches.open(MODEL_CACHE)).keys();
        return keys.some((request) => request.url.includes(SPEECH_MODEL) && request.url.includes(".onnx"));
      } catch {
        return false; // no Cache API here, e.g. a private window that refuses it
      }
    },
  };
}

/** The recording as 16 kHz mono samples, which the speech model expects. */
async function toMono16k(audio: Blob): Promise<Float32Array> {
  const context = new AudioContext({ sampleRate: 16_000 });
  try {
    const decoded = await context.decodeAudioData(await audio.arrayBuffer());
    return decoded.getChannelData(0).slice(); // a copy of its own, so it can be handed to the worker
  } finally {
    await context.close();
  }
}
