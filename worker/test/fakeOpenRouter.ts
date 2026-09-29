import { vi } from "vitest";

type Handler = (request: Request) => Response | Promise<Response>;

/** An outbound request as the fake saw it. Bodies are read at once: the Workers runtime won't let the test read
 * a stream the Worker created. */
export type SentRequest = { url: string; headers: Headers; text: string; json: () => unknown };

/**
 * Fakes OpenRouter's HTTP. The Worker runs in the same isolate as the tests, so stubbing `fetch` catches every
 * outbound request. Requests to OpenRouter are recorded and answered by `handler`; anything else fails the test.
 */
export function fakeOpenRouter(handler: Handler = () => new Response("No OpenRouter reply scripted", { status: 500 })) {
  const requests: SentRequest[] = [];
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const request = new Request(input, init);
    if (new URL(request.url).hostname !== "openrouter.ai") throw new Error(`Unexpected outbound request to ${request.url}`);
    const text = await request.clone().text();
    requests.push({ url: request.url, headers: new Headers(request.headers), text, json: () => JSON.parse(text) as unknown });
    return handler(request);
  });
  return { requests, restore: () => spy.mockRestore() };
}
