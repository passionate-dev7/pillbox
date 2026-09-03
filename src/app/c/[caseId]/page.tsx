import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCase, stripKeys } from "@/lib/store";
import { roleForKey } from "@/lib/store/actions";
import { CaseProvider } from "@/components/case/CaseProvider";
import { CaseView } from "@/components/case/CaseView";
import { InvalidLink } from "@/components/case/InvalidLink";

export const dynamic = "force-dynamic";

function keyFrom(sp: Awaited<PageProps<"/c/[caseId]">["searchParams"]>): string {
  const raw = sp.k;
  return String(Array.isArray(raw) ? raw[0] : (raw ?? "")).trim();
}

/** Two open tabs on the same case must be tellable apart from the tab strip alone. */
export async function generateMetadata({ params, searchParams }: PageProps<"/c/[caseId]">): Promise<Metadata> {
  const { caseId } = await params;
  const sp = await searchParams;
  const caseState = await getCase(caseId);
  if (!caseState) return { title: "webmcp-two-agent-spine: no case at this link" };
  const view = roleForKey(caseState, keyFrom(sp)) ?? "invalid link";
  return {
    title: `${caseState.title}, ${view} view`,
    description: `A shared case, owner and partner each with their own WebMCP tool set.`,
  };
}

export default async function CasePage({ params, searchParams }: PageProps<"/c/[caseId]">) {
  const { caseId } = await params;
  const sp = await searchParams;

  const caseState = await getCase(caseId);
  if (!caseState) notFound();

  const key = keyFrom(sp);
  const role = roleForKey(caseState, key);
  // `role=` in the query, if present, is a harmless display hint only; it decides nothing.
  // Authority comes entirely from `k`, checked server-side against the case's own capability
  // keys, so a wrong or missing key can never be upgraded by wishing.
  if (!role) {
    return <InvalidLink />;
  }

  // The owner is the only session handed the partner key, and only because the server just
  // proved they hold the owner key: PartnerLink and share_case need it to hand out a working
  // partner URL. It never reaches GET, SSE, or a tool result for anyone else.
  const partnerKeyForOwner = role === "owner" ? caseState.partnerKey : undefined;

  return (
    <CaseProvider
      caseId={caseId}
      role={role}
      sessionKey={key}
      partnerKey={partnerKeyForOwner}
      initialCase={stripKeys(caseState)}
    >
      <CaseView />
    </CaseProvider>
  );
}
