import { findDrug } from "@/lib/index";

export const dynamic = "force-dynamic";

const QUERY_MAX = 80;

/** GET /api/drug?q=<substring> proxies findDrug for the UI agent's drug-search input. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) {
    return Response.json({ error: "q is required." }, { status: 400 });
  }
  if (q.length > QUERY_MAX) {
    return Response.json({ error: `q is ${q.length} characters, over the ${QUERY_MAX}-character limit.` }, { status: 400 });
  }
  const drugs = findDrug(q);
  return Response.json({ drugs, count: drugs.length }, { headers: { "Cache-Control": "private, no-store" } });
}
