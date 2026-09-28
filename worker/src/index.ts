// The Worker: the only server-side code (spec #1). Model endpoints and Access Token checks arrive with #3.
export default {
  fetch(request) {
    const { pathname } = new URL(request.url);
    if (request.method === "GET" && pathname === "/health") return Response.json({ ok: true });
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
