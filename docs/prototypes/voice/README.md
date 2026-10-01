# Voice input — speech model comparison

Question: which speech-to-text approach and model should voice input (#33) use? #33 asks for transcription that runs in the browser, so audio never leaves the device (ADR 0001), and that works in both Firefox and Chrome.

**Outcome:** **Moonshine base** (`onnx-community/moonshine-base-ONNX`, compressed `q8`, about 63 MB, downloaded once), run in the browser with transformers.js. The owner chose it after recording their own answers on the comparison page, on 2026-10-01.

## Approaches considered (2026-10-01)

| Approach | Where the audio goes | Firefox | Cost | Verdict |
|---|---|---|---|---|
| **A. A model in the browser (transformers.js)** | Nowhere | ✓ | Free, after a one-time download | **Chosen.** It keeps #33's privacy promise |
| B. OpenRouter's `/api/v1/audio/transcriptions` (e.g. `openai/whisper-large-v3`, $0.0015 a minute) | To OpenRouter and the model's provider | ✓ | About $0.003 per 2-minute answer | The most accurate. OpenRouter's docs don't say whether its no-storage setting covers transcription. Possible later as a clearly labelled opt-in |
| C. Chrome's on-device speech (`SpeechRecognition.processLocally`, Chrome desktop 135+) | Nowhere | ✗ (behind a flag) | Free | Experimental, and it misses Firefox |
| D. The browser's built-in speech (cloud) | Chrome: to Google | ✗ | Free | Ruled out by ADR 0001 |

## The comparison page

[`index.html`](index.html) runs the four candidate models on the same audio: a recording from the microphone, or a sample clip. For each it shows the download size, the load time, the transcription time and the text. It's a throwaway test page, not part of the app.

**To run it:**
1. Serve this folder on `localhost`, since the microphone only works on `localhost` or HTTPS: `python3 -m http.server 8766 --bind 127.0.0.1 -d docs/prototypes/voice`.
2. Open http://localhost:8766 in Firefox or Chrome. In Chrome, also try the WebGPU option.

It loads transformers.js 4.3.0 from jsDelivr and the models from Hugging Face. Neither works inside a claude.ai Artifact page, which blocks the microphone and outside downloads, so it lives here instead.

**A passage to read**, with the hard parts in it (numbers, names, jargon, a natural pace):
> "As team lead on the booking platform, I noticed our p95 latency had crept up to 1.8 seconds. I profiled the search API with Grafana, found an N+1 query in the Postgres layer, rewrote it as a single join, and added an index. Within two sprints we were down to 600 milliseconds, and the on-call pages dropped from about twelve a week to two."

## Measured (headless Firefox, WASM, the 11-second JFK sample clip)

| Model | Download (q8) | First load, incl. download | Transcribe 11 s | Text |
|---|---|---|---|---|
| Moonshine tiny | 32 MB | 4.8 s | 0.4–0.5 s | perfect |
| Whisper tiny.en | 44 MB | 5.1 s | 1.3–1.4 s | perfect |
| **Moonshine base** | **67 MB** | **7.3 s** | **0.8–0.9 s** | perfect, without punctuation |
| Whisper base.en | 80 MB | 8.6 s | 2.6–2.7 s | perfect |

**The sample clip can't separate them,** because it's clean, slow and famous. The owner's own recordings did: Moonshine base read them best, and it's about three times faster than Whisper base.

**Things to watch for in the real build:**
- **Moonshine base leaves out punctuation.** The Candidate edits the transcript in the answer bar anyway, but the answer will read as one long sentence until they do.
- **The first use downloads about 63 MB.** #33 asks for that to be explained, with its size, before it starts.

## Where the files come from

- **The model files** (about 63 MB) come from **Hugging Face** (`onnx-community/moonshine-base-ONNX`), transformers.js's default, on the first use. The browser then keeps them in its `transformers-cache`, and the app checks that cache to know whether a first use still has to explain the download.
- **The speech engine** (onnxruntime-web's WASM, 26.9 MB) and the transcriber's worker (0.5 MB) are bundled by Vite and served by the app itself. They're loaded only when voice is first used, so the app's own load grew by about 5 kB.
- **For deploying (#30):** Cloudflare Pages caps each file at 25 MiB, and the WASM file is 26.9 MB. At deploy time, either load it from jsDelivr (one transformers.js setting, `env.backends.onnx.wasm.wasmPaths`) or host it, and the model, somewhere without that cap, e.g. R2.

**Decision:** Moonshine base, in the browser, with no audio leaving the device.
