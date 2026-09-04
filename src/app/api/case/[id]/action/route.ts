import { applyAction, ActionError, RoleError } from "@/lib/store/actions";
import { stripKeys } from "@/lib/store";
import { checkRateLimit, clientIp } from "@/lib/store/ratelimit";
import { bodyTooLarge, tooLargeResponse, rateLimitedResponse, PRIVATE_NO_STORE } from "@/lib/http";
import type { CaseActionType } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPES: CaseActionType[] = [
  "add_medication",
  "propose_change",
  "accept_change",
  "add_counsel_note",
  "add_note",
  "report_side_effect",
  "print_round_card",
];

/**
 * 60 requests per minute, checked twice: once per caller IP (stop one client from hammering any
 * case) and once per case id (stop many clients, or many keys on the same case, from hammering
 * one case's write path — the optimistic-concurrency retry in `applyAction` is real work, not
 * free). Either ceiling alone is bypassable (many IPs on one case, or one IP across many cases);
 * together they bound both axes an abusive caller could pick.
 */
const ACTION_RATE_LIMIT = 60;
const ACTION_RATE_WINDOW_SECONDS = 60;

export async function POST(request: Request, ctx: RouteContext<"/api/case/[id]/action">) {
  const { id } = await ctx.params;

  const ip = clientIp(request);
  const ipVerdict = await checkRateLimit(`ip:${ip}:case-action`, ACTION_RATE_LIMIT, ACTION_RATE_WINDOW_SECONDS);
  if (!ipVerdict.allowed) {
    return rateLimitedResponse(
      ipVerdict.retryAfterSeconds,
      "Too many case actions from this address. Wait a moment and try again.",
    );
  }
  const caseVerdict = await checkRateLimit(`case:${id}:action`, ACTION_RATE_LIMIT, ACTION_RATE_WINDOW_SECONDS);
  if (!caseVerdict.allowed) {
    return rateLimitedResponse(
      caseVerdict.retryAfterSeconds,
      "Too many actions on this case right now. Wait a moment and try again.",
    );
  }

  if (bodyTooLarge(request)) return tooLargeResponse();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const type = body.type as CaseActionType;
  if (!TYPES.includes(type)) {
    return Response.json(
      { error: `Unknown action "${String(body.type)}". Use one of: ${TYPES.join(", ")}.` },
      { status: 400 },
    );
  }

  // Role is never read from the body: it is derived, inside applyAction, from
  // which capability key was presented. Any `role` field on the request is
  // ignored so a caller cannot self-declare owner power.
  const key = String(body.key ?? "").trim();
  const payload = (body.payload ?? {}) as Record<string, unknown>;

  try {
    const caseState = await applyAction(id, type, key, payload);
    return Response.json({ case: stripKeys(caseState) }, { headers: PRIVATE_NO_STORE });
  } catch (err) {
    if (err instanceof RoleError) {
      return Response.json({ error: err.message }, { status: 403, headers: PRIVATE_NO_STORE });
    }
    if (err instanceof ActionError) {
      return Response.json({ error: err.message }, { status: err.status, headers: PRIVATE_NO_STORE });
    }
    return Response.json({ error: (err as Error).message }, { status: 500, headers: PRIVATE_NO_STORE });
  }
}
