// The Worker: the only server-side code (spec #1). Verifies Access Tokens and proxies model calls to OpenRouter.
import { checkAccessToken } from "./accessToken";

const OPENROUTER_CHAT = "https://openrouter.ai/api/v1/chat/completions";

type Job = keyof Env["JOB_MODELS"];
type GenerateRequest = { job: string; model?: string; system: string; user: string; schema: object };

const error = (code: string, status: number) => Response.json({ error: code }, { status });

type Access = { label: string; expiresAt: Date };

/** Checks the Access Token on the request. Returns who it belongs to, or the error response to send. */
async function authenticate(request: Request, env: Env): Promise<Access | Response> {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return error("missing_token", 401);
  const access = await checkAccessToken(token, env.ACCESS_TOKEN_SECRET);
  if (!access.ok) return error(`${access.reason}_token`, 401);
  return { label: access.label, expiresAt: access.expiresAt };
}

async function generate(request: Request, env: Env, access: Access) {
  const { job, model: requested, system, user, schema } = await request.json<GenerateRequest>();
  if (!(job in env.JOB_MODELS)) return error("unknown_job", 400);
  // The job's default model, or one the request picks (the Developer panel), if it's on the allowed list.
  const model = requested ?? env.JOB_MODELS[job as Job];
  if (!(env.ALLOWED_MODELS as readonly string[]).includes(model)) return error("model_not_allowed", 400);
  const upstream = await fetch(OPENROUTER_CHAT, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: { name: "reply", strict: true, schema } },
      // Only providers that don't store or train on prompts (spec #1, "Prompt-injection hardening" / privacy).
      provider: { data_collection: "deny" },
      usage: { include: true },
    }),
  });
  if (!upstream.ok) return error("model_unavailable", 502);
  const reply = await upstream.json<{ choices?: { message?: { content?: string } }[]; usage?: { cost?: number } }>();
  // The only thing the Worker ever logs: never request or response bodies, never the token (spec #1, story 78–79).
  console.log(JSON.stringify({ label: access.label, job, model, cost: reply.usage?.cost ?? null }));
  try {
    return Response.json({ output: JSON.parse(reply.choices?.[0]?.message?.content ?? "") as unknown });
  } catch {
    return error("invalid_model_reply", 502);
  }
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
    if (request.method === "GET" && pathname === "/v1/access") return Response.json({ label: auth.label, expiresAt: auth.expiresAt.toISOString() });
    if (request.method === "POST" && pathname === "/v1/generate") return generate(request, env, auth);
  }
  return new Response("Not found", { status: 404 });
}

export default {
  async fetch(request, env) {
    return withCors(await route(request, env), request, env);
  },
} satisfies ExportedHandler<Env>;
