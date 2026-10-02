// Asks for a secret in the terminal without showing it (the OpenRouter key, for npm run local, #63). It reads key by
// key in raw mode, so the question stays on screen and nothing typed is echoed; Backspace deletes, Enter finishes,
// and Ctrl+C or Ctrl+D stops without saving anything.

/** The person stopped at the question (Ctrl+C or Ctrl+D). */
export class Cancelled extends Error {
  constructor() {
    super("Stopped before a key was entered, so nothing was saved.");
  }
}

type Terminal = {
  input: { setRawMode(on: boolean): unknown; resume(): unknown; pause(): unknown; on(event: "data", listener: (chunk: Buffer) => void): unknown; off(event: "data", listener: (chunk: Buffer) => void): unknown };
  output: { write(text: string): unknown };
};

export function askHidden(question: string, { input, output }: Terminal): Promise<string> {
  output.write(question);
  return new Promise((resolve, reject) => {
    let typed = "";
    const finish = (done: () => void) => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
      output.write("\n");
      done();
    };
    function onData(chunk: Buffer) {
      // eslint-disable-next-line no-control-regex -- the escape sequences arrow keys send are what's being removed
      const keys = chunk.toString("utf8").replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
      for (const key of keys) {
        if (key === "\r" || key === "\n") return finish(() => resolve(typed));
        if (key === "\x03" || key === "\x04") return finish(() => reject(new Cancelled()));
        if (key === "\x7f" || key === "\b") typed = typed.slice(0, -1);
        else if (key >= " ") typed += key;
      }
    }
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}
