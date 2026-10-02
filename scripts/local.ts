// `npm run local` (#63): the whole app on this machine in one command, for reviewers. It makes worker/.dev.vars on the
// first run (asking for the OpenRouter API key, making up the signing secret), mints an Access Token for this machine,
// and starts the Worker and the app together, with the token filled in on the app's setup screen. Ctrl+C stops both.
// `npm run dev` and `npm run dev:worker` still run each on its own.
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { MAX_LIFETIME_HOURS, mintAccessToken } from "../worker/src/accessToken";
import { ensureDevVars } from "./devVars";
import { readSigningSecret } from "./signingSecret";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PORTS = { worker: 8787, app: 5173 };

const say = (line: string) => console.log(`[local] ${line}`);
function fail(message: string): never {
  console.error(`[local] ${message}`);
  process.exit(1);
}

/** Reads a line without showing what's typed (the OpenRouter API key). */
function askHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    // No terminal to type into (e.g. a script): take the key from the environment instead.
    return Promise.resolve(process.env.OPENROUTER_API_KEY ?? "");
  }
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(question);
    // Echo nothing while the key is typed; readline has no public option for this.
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = () => {};
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

/** Whether something is already listening on a port, e.g. a dev server started earlier. */
const portInUse = (port: number) =>
  new Promise<boolean>((resolve) => {
    const server = createServer()
      .once("error", () => resolve(true))
      .once("listening", () => server.close(() => resolve(false)))
      .listen(port, "localhost");
  });

/** Runs one of the two servers, with each line of its output labelled. */
function run(name: string, args: string[], env: NodeJS.ProcessEnv = {}): ChildProcess {
  const child = spawn("npx", args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  for (const stream of [child.stdout, child.stderr]) {
    createInterface({ input: stream }).on("line", (line) => console.log(`[${name}] ${line}`));
  }
  return child;
}

try {
  await ensureDevVars({ path: `${ROOT}worker/.dev.vars`, askForKey: () => askHidden("OpenRouter API key (hidden): "), say });
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}

for (const [name, port] of Object.entries(PORTS)) {
  if (await portInUse(port)) fail(`Port ${port} is already in use (the ${name === "app" ? "app" : "Worker"}'s). Stop whatever is running there, e.g. an earlier npm run dev or dev:worker, and try again.`);
}

// A token for this machine, lasting as long as tokens may (7 days), so a review doesn't run out mid-way.
const expiresAt = new Date(Date.now() + MAX_LIFETIME_HOURS * 3_600_000);
const token = await mintAccessToken({ label: "local", expiresAt, secret: readSigningSecret() });

const children = [
  run("worker", ["wrangler", "dev", "--config", "worker/wrangler.jsonc", "--port", String(PORTS.worker)]),
  run("app", ["vite", "--port", String(PORTS.app), "--strictPort"], { VITE_LOCAL_ACCESS_TOKEN: token }),
];

say(`Open http://localhost:${PORTS.app}. Your Access Token is already filled in on the first screen: press Continue.`);
say(`(The token, if you need it: ${token}. It lasts until ${expiresAt.toLocaleString()}.)`);
say("Press Ctrl+C to stop both.");

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
  process.exitCode = code;
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
// If either server stops on its own, stop the other too, rather than leave half the app running.
for (const child of children) child.on("exit", (code) => stop(code ?? 0));
