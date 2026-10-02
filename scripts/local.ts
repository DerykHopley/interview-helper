// `npm run local` (#63): the whole app on this machine in one command, for reviewers. It sets up worker/.dev.vars on
// the first run (asking for the OpenRouter API key, making up the signing secret), mints an Access Token for this
// machine, and starts the Worker and the app together, with the token filled in on the app. Ctrl+C stops both.
// `npm run dev` and `npm run dev:worker` still run each on its own.
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { connect } from "node:net";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { MAX_LIFETIME_HOURS } from "../worker/src/accessToken";
import { devVarsValue, ensureDevVars } from "./devVars";
import { askHidden } from "./hiddenPrompt";
import { DEV_VARS } from "./signingSecret";
import { mintFor } from "./tokens";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PORTS = { worker: 8787, app: 5173 };

const say = (line: string) => console.log(`[local] ${line}`);
function fail(message: string): never {
  console.error(`[local] ${message}`);
  process.exit(1);
}
const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** The key, typed without showing it; without a terminal to type into (e.g. a script), from OPENROUTER_API_KEY. */
const askForKey = () =>
  process.stdin.isTTY ? askHidden("OpenRouter API key (hidden): ", { input: process.stdin, output: process.stdout }) : Promise.resolve(process.env.OPENROUTER_API_KEY ?? "");

/** Whether something already listens on a port, on IPv4 or IPv6 localhost (a server may use only one of them). */
async function portInUse(port: number) {
  const listening = (host: string) =>
    new Promise<boolean>((resolve) => {
      const socket = connect({ port, host });
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
    });
  return (await Promise.all([listening("127.0.0.1"), listening("::1")])).some(Boolean);
}

/** A package's command, run with this Node directly rather than through npx, so it works the same on Windows. */
function binOf(pkg: string, name: string) {
  const { bin } = JSON.parse(readFileSync(join(ROOT, "node_modules", pkg, "package.json"), "utf8")) as { bin: Record<string, string> | string };
  return join(ROOT, "node_modules", pkg, typeof bin === "string" ? bin : bin[name]);
}

// 1. The Worker's secrets, and a token for this machine signed with this machine's secret (never one from the shell,
//    which might be a deployed Worker's).
try {
  await ensureDevVars({ path: DEV_VARS, askForKey, say });
} catch (e) {
  fail(messageOf(e));
}
const secret = devVarsValue(DEV_VARS, "ACCESS_TOKEN_SECRET");
if (!secret) fail("worker/.dev.vars has no ACCESS_TOKEN_SECRET. Delete the file and run npm run local again to make a new one.");
let minted: Awaited<ReturnType<typeof mintFor>>;
try {
  minted = await mintFor("local", MAX_LIFETIME_HOURS, secret); // as long as tokens may last (7 days), so a review doesn't run out
} catch (e) {
  fail(`Couldn't mint an Access Token: ${messageOf(e)}`);
}

// 2. Both ports free.
for (const [name, port] of Object.entries(PORTS)) {
  if (await portInUse(port)) fail(`Port ${port} is already in use (the ${name === "app" ? "app" : "Worker"}'s). Stop whatever is running there, e.g. an earlier npm run dev or dev:worker, and try again.`);
}

// 3. Both servers, each line of their output labelled, and the address once both say they're ready.
const ready = { worker: false, app: false };
const READY_LINE = { worker: /Ready on/i, app: /Local:/ };
let stopping = false;
const children: ChildProcess[] = [];

function stop(code: number) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  process.exitCode = code;
}

function run(name: keyof typeof PORTS, script: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  const child = spawn(process.execPath, [script, ...args], { cwd: ROOT, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  for (const stream of [child.stdout, child.stderr]) {
    createInterface({ input: stream }).on("line", (line) => {
      console.log(`[${name}] ${line}`);
      if (!ready[name] && READY_LINE[name].test(line)) {
        ready[name] = true;
        if (ready.worker && ready.app) announce();
      }
    });
  }
  child.on("error", (e) => {
    say(`The ${name} couldn't start: ${e.message}`);
    stop(1);
  });
  // If either server stops on its own, stop the other too, rather than leave half the app running.
  child.on("exit", (code, signal) => {
    if (!stopping) say(`The ${name} stopped (${signal ?? `exit code ${code}`}), so the other is stopping too.`);
    stop(stopping ? (process.exitCode as number | undefined) ?? 0 : (code ?? 1));
  });
  children.push(child);
}

function announce() {
  say(`Ready: open http://localhost:${PORTS.app}. Your Access Token is filled in for you: press Continue.`);
  say(`(The token, if you need it: ${minted.token}. It lasts until ${minted.expiresAt.toLocaleString()}.)`);
  say("Press Ctrl+C here to stop both.");
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
// If this script itself fails, don't leave the servers running.
process.on("uncaughtException", (e) => {
  say(`Something went wrong: ${e.message}`);
  stop(1);
});
process.on("exit", () => {
  for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
});

run("worker", binOf("wrangler", "wrangler"), ["dev", "--config", "worker/wrangler.jsonc", "--port", String(PORTS.worker)]);
run("app", binOf("vite", "vite"), ["--port", String(PORTS.app), "--strictPort"], { VITE_LOCAL_ACCESS_TOKEN: minted.token });
