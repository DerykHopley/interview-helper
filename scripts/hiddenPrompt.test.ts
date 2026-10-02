import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { askHidden, Cancelled } from "./hiddenPrompt";

/** A terminal, as askHidden uses it: keystrokes in, everything written out. */
function terminal() {
  const input = Object.assign(new EventEmitter(), { isTTY: true, rawMode: false, setRawMode(on: boolean) { this.rawMode = on; return this; }, resume() {}, pause() {} });
  const written: string[] = [];
  const output = { write: (s: string) => (written.push(s), true) };
  const type = (keys: string) => input.emit("data", Buffer.from(keys));
  return { input, output, written, type };
}

describe("asking for the OpenRouter key without showing it (npm run local, #63)", () => {
  it("keeps the question on screen and shows nothing of what's typed", async () => {
    const t = terminal();
    const answer = askHidden("OpenRouter API key (hidden): ", t);
    t.type("sk-or-");
    t.type("secret123\r");

    expect(await answer).toBe("sk-or-secret123");
    const shown = t.written.join("");
    expect(shown).toBe("OpenRouter API key (hidden): \n"); // the question, then a new line, and nothing else
    expect(t.input.rawMode).toBe(false); // the terminal is put back as it was
  });

  it("lets a mistyped character be deleted", async () => {
    const t = terminal();
    const answer = askHidden("Key: ", t);
    t.type("abx\x7fc\r");

    expect(await answer).toBe("abc");
  });

  it("stops cleanly on Ctrl+C or Ctrl+D", async () => {
    for (const key of ["\x03", "\x04"]) {
      const t = terminal();
      const answer = askHidden("Key: ", t);
      t.type(`ab${key}`);

      await expect(answer).rejects.toBeInstanceOf(Cancelled);
      expect(t.input.rawMode).toBe(false);
    }
  });

  it("takes a pasted key and Enter in one go, ignoring arrow keys", async () => {
    const t = terminal();
    const answer = askHidden("Key: ", t);
    t.type("\x1b[Dsk-or-pasted\n");

    expect(await answer).toBe("sk-or-pasted");
  });
});
