// Speech to text in this browser (#33): the recording is decoded here, then a speech model in a Web Worker turns it into
// text. No audio leaves the device; the model itself downloads once from Hugging Face and is cached by the browser.
import { ModelGatewayError, type ModelGateway } from "./ModelGateway";
import { SPEECH_CACHE, SPEECH_MODEL, SPEECH_MODEL_FILES } from "./speechModel";

type Reply = { id?: number; progress?: number; done?: true; text?: string; error?: string };
type Waiting = { resolve: (text: string) => void; reject: (e: Error) => void; onDownload?: (fraction: number) => void };

export function browserTranscriber(): Pick<ModelGateway, "transcribe" | "transcriberDownloaded" | "prepareTranscriber"> {
  let worker: Worker | null = null;
  let nextId = 0;
  const waiting = new Map<number, Waiting>();

  /** Ends everything waiting, e.g. when the worker can't load, so nothing hangs on "Transcribing…". */
  function failAll(reason: string) {
    for (const job of waiting.values()) job.reject(new ModelGatewayError("model_unavailable"));
    waiting.clear();
    worker?.terminate();
    worker = null; // a new one is started on the next use
    console.warn(`The speech model's worker stopped: ${reason}`);
  }

  // Started on first use, so the app's own load doesn't fetch the model code.
  function theWorker() {
    if (worker) return worker;
    worker = new Worker(new URL("./transcriber.worker.ts", import.meta.url), { type: "module" });
    worker.onerror = (e) => failAll(e.message);
    worker.onmessageerror = () => failAll("a message couldn't be read");
    worker.onmessage = ({ data }: MessageEvent<Reply>) => {
      if (data.progress !== undefined) return waiting.forEach((job) => job.onDownload?.(data.progress!));
      const job = data.id === undefined ? undefined : waiting.get(data.id);
      if (!job) return;
      waiting.delete(data.id!);
      if (data.error !== undefined) job.reject(new Error(data.error));
      else job.resolve(data.text ?? "");
    };
    return worker;
  }

  function send(message: { load: true } | { samples: Float32Array }, onDownload?: (fraction: number) => void) {
    const id = nextId++;
    return new Promise<string>((resolve, reject) => {
      waiting.set(id, { resolve, reject, onDownload });
      theWorker().postMessage({ id, ...message }, "samples" in message ? [message.samples.buffer] : []);
    });
  }

  return {
    async transcribe(audio, onDownload) {
      return send({ samples: await toMono16k(audio) }, onDownload);
    },
    async prepareTranscriber(onDownload) {
      await send({ load: true }, onDownload);
    },
    async transcriberDownloaded() {
      try {
        const urls = (await (await caches.open(SPEECH_CACHE)).keys()).map((request) => request.url);
        return SPEECH_MODEL_FILES.every((file) => urls.some((url) => url.includes(SPEECH_MODEL) && url.endsWith(file)));
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
