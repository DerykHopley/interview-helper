// The Worker: the only server-side code (spec #1). Verifies Access Tokens and proxies model calls to OpenRouter.
import { ACCESS_REFUSAL_ERROR, GenerateRequest, type AccessResponse, type AllowedModel, type GenerateResponse, type ModelsResponse, type WorkerError } from "../../shared/workerProtocol";
import { checkAccessToken } from "./accessToken";

const OPENROUTER_CHAT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS = "https://openrouter.ai/api/v1/models";

type Job = keyof Env["JOB_MODELS"];

const error = (code: WorkerError, status: number) => Response.json({ error: code }, { status });

type Access = { label: string; expiresAt: Date };

/** Checks the Access Token on the request. Returns who it belongs to, or the error response to send. */
async function authenticate(request: Request, env: Env): Promise<Access | Response> {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return error("missing_token", 401);
  const access = await checkAccessToken(token, env.ACCESS_TOKEN_SECRET);
  if (!access.ok) return error(ACCESS_REFUSAL_ERROR[access.reason], 401);
  return { label: access.label, expiresAt: access.expiresAt };
}

/** Parses JSON without letting a parse error's message (which quotes the input) escape. */
function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

type UpstreamError = { status: number; code?: unknown; message?: string };

/** The only thing the Worker ever logs: never request or response bodies, never the token (spec #1, story 78–79).
 * A failed call adds OpenRouter's status, error code and message, so a model_unavailable can be told apart. */
const logCall = (access: Access, job: string, model: string, cost: number | null, upstream?: UpstreamError) =>
  console.log(JSON.stringify({ label: access.label, job, model, cost, ...(upstream && { upstream }) }));

/** OpenRouter's code and message from an error object ({ code, message }). Its metadata is left out, since a
 * moderation error quotes the flagged input there, and the message is capped in case one ever quotes it too. */
function upstreamError(status: number, value: unknown): UpstreamError {
  const found = (value ?? {}) as { code?: unknown; message?: unknown };
  const code = typeof found.code === "string" || typeof found.code === "number" ? found.code : undefined;
  const message = typeof found.message === "string" ? found.message.slice(0, 200) : undefined;
  return { status, code, message };
}

async function generate(request: Request, env: Env, access: Access) {
  const body = parseJson(await request.text());
  const parsed = body.ok ? GenerateRequest.safeParse(body.value) : null;
  if (!parsed?.success) return error("bad_request", 400);
  const { job, model: requested, maxTokens, reasoningEffort, temperature, system, messages = [], user, schema } = parsed.data;
  if (!Object.hasOwn(env.JOB_MODELS, job)) return error("unknown_job", 400);
  // The job's default model, or one the request picks (the Developer panel), if it's on the allowed list.
  const model = requested ?? env.JOB_MODELS[job as Job];
  if (!(env.ALLOWED_MODELS as readonly string[]).includes(model)) return error("model_not_allowed", 400);
  // The job's limits bound every call's cost; a request may only lower the cap.
  const settings = env.JOB_SETTINGS[job as Job];
  if (maxTokens !== undefined && maxTokens > settings.max_tokens) return error("settings_not_allowed", 400);

  const upstream = await fetch(OPENROUTER_CHAT, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages, { role: "user", content: user }],
      response_format: { type: "json_schema", json_schema: { name: "reply", strict: true, schema } },
      // Only providers that don't store or train on prompts (spec #1, story 80).
      provider: { data_collection: "deny" },
      usage: { include: true },
      max_tokens: maxTokens ?? settings.max_tokens,
      reasoning: { effort: reasoningEffort ?? settings.reasoning_effort },
      ...(temperature !== undefined && { temperature }),
    }),
  });
  if (!upstream.ok) {
    const failed = parseJson(await upstream.text());
    logCall(access, job, model, null, upstreamError(upstream.status, failed.ok ? (failed.value as { error?: unknown } | null)?.error : null));
    return error("model_unavailable", 502);
  }
  const reply = parseJson(await upstream.text());
  const completion = (reply.ok ? reply.value : null) as {
    choices?: { finish_reason?: string; message?: { content?: string }; error?: unknown }[];
    usage?: { cost?: number; prompt_tokens?: number; completion_tokens?: number };
  } | null;
  const finish = completion?.choices?.[0]?.finish_reason;
  // A reply that ends in an error carries OpenRouter's error on the choice.
  const cost = completion?.usage?.cost ?? null;
  const usage = completion?.usage;
  const tokens = typeof usage?.prompt_tokens === "number" && typeof usage.completion_tokens === "number" ? { input: usage.prompt_tokens, output: usage.completion_tokens } : null;
  logCall(access, job, model, cost, finish === "error" ? upstreamError(upstream.status, completion?.choices?.[0]?.error) : undefined);
  // Ran out of tokens (reasoning counts too): the reply is empty or partial, so say so rather than fail to parse it.
  if (finish === "length") return error("reply_cut_off", 502);
  if (finish === "error") return error("model_unavailable", 502);
  const content = parseJson(completion?.choices?.[0]?.message?.content ?? "");
  if (!content.ok) return error("invalid_model_reply", 502);
  return Response.json({ output: content.value, model, cost, tokens } satisfies GenerateResponse);
}

/** What the Developer panel (#17) may pick: the allowed models with their live prices and settings, from OpenRouter's
 * models endpoint, and each job's defaults and caps. Without OpenRouter's list it still answers, with no prices. */
async function listModels(env: Env) {
  type Listed = { id: string; pricing?: { prompt?: string; completion?: string }; supported_parameters?: string[] };
  let listed: Listed[] | null = null;
  try {
    const upstream = await fetch(OPENROUTER_MODELS);
    const body = upstream.ok ? parseJson(await upstream.text()) : null;
    const data = body?.ok ? (body.value as { data?: unknown } | null)?.data : null;
    if (Array.isArray(data)) listed = data as Listed[];
  } catch {
    listed = null;
  }
  const perMillion = (price?: string) => (price !== undefined && Number.isFinite(Number(price)) ? Math.round(Number(price) * 1e6 * 1e6) / 1e6 : null);
  const models = (env.ALLOWED_MODELS as readonly string[]).map((id): AllowedModel => {
    const found = listed?.find((m) => m.id === id);
    const input = perMillion(found?.pricing?.prompt);
    const output = perMillion(found?.pricing?.completion);
    const params = found?.supported_parameters ?? [];
    return { id, price: input !== null && output !== null ? { inputPerMillion: input, outputPerMillion: output } : null, temperature: params.includes("temperature"), reasoning: params.includes("reasoning") };
  });
  const jobs = Object.fromEntries(
    (Object.keys(env.JOB_MODELS) as Job[]).map((job) => [job, { model: env.JOB_MODELS[job], maxTokens: env.JOB_SETTINGS[job].max_tokens, reasoningEffort: env.JOB_SETTINGS[job].reasoning_effort }]),
  );
  return Response.json({ models, jobs, pricesAt: listed ? new Date().toISOString() : null } satisfies ModelsResponse);
}

/** CORS for the web app's origin only: every reply to it, including errors, carries the headers so the app can
 * read why a request was refused. */
function withCors(response: Response, request: Request, env: Env) {
  if (request.headers.get("Origin") !== env.ALLOWED_ORIGIN) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", env.ALLOWED_ORIGIN);
  headers.set("Vary", "Origin");
  return new Response(response.body, { status: response.status, headers });
}

async function route(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST", "Access-Control-Max-Age": "86400" },
    });
  }
  if (request.method === "GET" && pathname === "/health") return Response.json({ ok: true });

  if (pathname.startsWith("/v1/")) {
    // Fail closed if a secret is missing (e.g. a deploy before `wrangler secret put`), rather than checking tokens
    // against an empty key.
    if (!env.ACCESS_TOKEN_SECRET || !env.OPENROUTER_API_KEY) return error("worker_not_configured", 500);
    const auth = await authenticate(request, env);
    if (auth instanceof Response) return auth;
    if (request.method === "GET" && pathname === "/v1/access") return Response.json({ label: auth.label, expiresAt: auth.expiresAt.toISOString() } satisfies AccessResponse);
    if (request.method === "POST" && pathname === "/v1/generate") return generate(request, env, auth);
    if (request.method === "GET" && pathname === "/v1/models") return listModels(env);
  }
  return new Response("Not found", { status: 404 });
}

export default {
  async fetch(request, env) {
    let response: Response;
    try {
      response = await route(request, env);
    } catch (e) {
      // Last resort. Log only the error's type: its message could quote a request or reply.
      console.error(JSON.stringify({ error: "internal_error", type: e instanceof Error ? e.name : typeof e }));
      response = error("internal_error", 500);
    }
    return withCors(response, request, env);
  },
} satisfies ExportedHandler<Env>;
