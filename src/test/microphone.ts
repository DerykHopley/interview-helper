import { vi } from "vitest";

/** A stand-in for the browser's MediaRecorder: stopping it hands over one chunk of "audio". */
export class FakeRecorder {
  static started = 0;
  state: "inactive" | "recording" = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  start() {
    this.state = "recording";
    FakeRecorder.started++;
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["audio"], { type: "audio/webm" }) });
    this.onstop?.();
  }
}

/** The microphone's tracks, to tell whether it was turned off. */
let micTracks: { stopped: boolean }[] = [];
export const microphoneOn = () => micTracks.some((t) => !t.stopped);
const aStream = () => {
  const track = { stopped: false, stop: () => void (track.stopped = true) };
  micTracks.push(track);
  return { getTracks: () => [track] };
};

/** A microphone the Candidate allows (or refuses), and recording support, unless told otherwise. `held` keeps the
 * microphone from answering until the test lets it. Pair with `removeMicrophone` after each test. */
export function microphone({ allowed = true, recorder = true, secure = true, held = false }: { allowed?: boolean; recorder?: boolean | "throws"; secure?: boolean; held?: boolean } = {}) {
  FakeRecorder.started = 0;
  micTracks = [];
  if (recorder === "throws") vi.stubGlobal("MediaRecorder", class { constructor() { throw new DOMException("Not supported", "NotSupportedError"); } });
  else vi.stubGlobal("MediaRecorder", recorder ? FakeRecorder : undefined);
  vi.stubGlobal("isSecureContext", secure);
  let answer = () => {};
  const getUserMedia = vi.fn(() =>
    !allowed
      ? Promise.reject(new DOMException("Permission denied", "NotAllowedError"))
      : held
        ? new Promise((resolve) => (answer = () => resolve(aStream())))
        : Promise.resolve(aStream()),
  );
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  return { getUserMedia, answer: () => answer() };
}

export const removeMicrophone = () => void Reflect.deleteProperty(navigator, "mediaDevices");
