import { getCase, stripKeysAndSpotlight } from "@/lib/store";

export const dynamic = "force-dynamic";

const POLL_MS = 2_000;
const MAX_MS = 5 * 60 * 1000;

export async function GET(request: Request, ctx: RouteContext<"/api/case/[id]/stream">) {
  const { id } = await ctx.params;
  const first = await getCase(id);
  if (!first) {
    return Response.json({ error: `No case with id "${id}".` }, { status: 404 });
  }

  const encoder = new TextEncoder();
  let lastVersion = -1;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const started = Date.now();
      let closed = false;

      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      const tick = async () => {
        if (closed) return;
        if (Date.now() - started > MAX_MS) {
          send("end", { reason: "stream reached its 5 minute limit, reconnect to keep watching" });
          close();
          return;
        }
        try {
          const caseState = await getCase(id);
          if (!caseState) {
            send("gone", { id });
            close();
            return;
          }
          if (caseState.version !== lastVersion) {
            lastVersion = caseState.version;
            send("case", stripKeysAndSpotlight(caseState));
          } else {
            controller.enqueue(encoder.encode(`: keepalive v${caseState.version}\n\n`));
          }
        } catch (err) {
          send("error", { message: (err as Error).message });
        }
      };

      const timer = setInterval(tick, POLL_MS);
      request.signal.addEventListener("abort", close);
      await tick();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
