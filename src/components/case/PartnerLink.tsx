"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** Caregiver only: the URL that opens this round in the pharmacist's session. */
export function PartnerLink({ caseId, partnerKey }: { caseId: string; partnerKey?: string }) {
  const [copied, setCopied] = useState(false);

  if (!partnerKey) {
    return (
      <section className="border border-hair-strong bg-paper">
        <h2 className="colhead border-b border-hair bg-paper-sunk px-3 py-1.5">Pharmacist Link</h2>
        <p className="px-3 py-2.5 text-[0.75rem] leading-snug text-ink-soft">
          The pharmacist key for this round is not available in this session.
        </p>
      </section>
    );
  }

  const path = `/c/${caseId}?k=${partnerKey}`;
  const href = typeof window === "undefined" ? path : `${window.location.origin}${path}`;

  return (
    <section className="border border-hair-strong bg-paper">
      <h2 className="colhead border-b border-hair bg-paper-sunk px-3 py-1.5">Pharmacist Link</h2>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        <code className="code min-w-0 flex-1 break-all text-[0.6875rem] text-ink-soft">{href}</code>
        <Button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(href);
            } catch {
              /* clipboard blocked: the URL is on screen to copy by hand */
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
        <a
          href={path}
          className="inline-flex items-center rounded-control border border-hair-strong bg-paper px-3.5 py-2 text-[0.8125rem] font-semibold transition-colors duration-150 hover:border-ink"
        >
          Open
        </a>
      </div>
      <p className="border-t border-hair px-3 py-2 text-[0.75rem] leading-snug text-ink-soft">
        Whoever opens this gets the pharmacist session. Their agent can propose a change and add
        counsel notes, the accept tool is never registered in that window, and the server rejects
        an accept from a pharmacist even if one is forged.
      </p>
    </section>
  );
}

export default PartnerLink;
