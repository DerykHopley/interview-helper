// The speech model voice input uses (#33), and what the app needs to know about it. Chosen by comparing it with
// Moonshine tiny and Whisper tiny/base on the owner's own recordings (docs/prototypes/voice).

/** Moonshine base on Hugging Face, compressed to q8. */
export const SPEECH_MODEL = "onnx-community/moonshine-base-ONNX";
export const SPEECH_DTYPE = "q8";
/** Its download, for the first-use explanation. */
export const SPEECH_MODEL_MB = 63;
/** The browser cache the worker keeps the model in (transformers.js `env.cacheKey`). */
export const SPEECH_CACHE = "interview-helper-speech-model";
/** The model's two large files (q8 is "_quantized"): it's downloaded only once both are cached. */
export const SPEECH_MODEL_FILES = ["encoder_model_quantized.onnx", "decoder_model_merged_quantized.onnx"];
