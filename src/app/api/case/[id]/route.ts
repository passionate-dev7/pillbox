import { getCase, stripKeysAndSpotlight } from "@/lib/store";
import { PRIVATE_NO_STORE } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: RouteContext<"/api/case/[id]">) {
  const { id } = await ctx.params;
  const caseState = await getCase(id);
  if (!caseState) {
    return Response.json({ error: `No case with id "${id}".` }, { status: 404, headers: PRIVATE_NO_STORE });
  }
  // This is an unauthenticated read: the case id alone is not a secret (it is in both the owner
  // and partner URL), so both capability keys are stripped here. Free text (notes, report
  // descriptions, proposal reasons) gets the same spotlighting the get_case WebMCP tool applies,
  // so a caller reading this over plain fetch() sees the identical untrusted-content boundary a
  // tool call would have shown it. Never cached or stored: it's another person's case.
  return Response.json({ case: stripKeysAndSpotlight(caseState) }, { headers: PRIVATE_NO_STORE });
}
