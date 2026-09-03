import { createCase, stripKeys } from "@/lib/store";
import { checkRateLimit, clientIp } from "@/lib/store/ratelimit";
import { bodyTooLarge, tooLargeResponse, rateLimitedResponse, PRIVATE_NO_STORE } from "@/lib/http";

export const dynamic = "force-dynamic";

/** 60 case creations per minute per caller IP. There is no case id yet at this point, so this
 * route only has the IP axis to rate-limit on; per-case limiting starts at the action route. */
const CREATE_RATE_LIMIT = 60;
const CREATE_RATE_WINDOW_SECONDS = 60;

const TITLE_MAX = 120;
const ITEM_MAX = 200;
const NOTE_MAX = 500;

export async function POST(request: Request) {
  const ip = clientIp(request);
  const verdict = await checkRateLimit(`ip:${ip}:case-create`, CREATE_RATE_LIMIT, CREATE_RATE_WINDOW_SECONDS);
  if (!verdict.allowed) {
    return rateLimitedResponse(
      verdict.retryAfterSeconds,
      "Too many cases created from this address. Wait a moment and try again.",
    );
  }

  if (bodyTooLarge(request)) return tooLargeResponse();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const firstItem = String(body.firstItem ?? "").trim();
  const note = String(body.note ?? "").trim();

  if (!title) {
    return Response.json({ error: "Give the case a title." }, { status: 400 });
  }
  if (title.length > TITLE_MAX) {
    return Response.json({ error: `Title is ${title.length} characters, over the ${TITLE_MAX}-character limit.` }, { status: 400 });
  }
  if (firstItem.length > ITEM_MAX) {
    return Response.json({ error: `First item is ${firstItem.length} characters, over the ${ITEM_MAX}-character limit.` }, { status: 400 });
  }
  if (note.length > NOTE_MAX) {
    return Response.json({ error: `Note is ${note.length} characters, over the ${NOTE_MAX}-character limit.` }, { status: 400 });
  }

  const caseState = await createCase({ title, firstItem, note });

  // The one-time exception: the creator's own response carries both capability
  // keys and the two ready-to-share URLs. Every later read of this case (GET,
  // SSE, tool results) strips both keys.
  return Response.json(
    {
      case: stripKeys(caseState),
      ownerKey: caseState.ownerKey,
      partnerKey: caseState.partnerKey,
      ownerUrl: `/c/${caseState.id}?k=${caseState.ownerKey}`,
      partnerUrl: `/c/${caseState.id}?k=${caseState.partnerKey}`,
    },
    { status: 201, headers: PRIVATE_NO_STORE },
  );
}
