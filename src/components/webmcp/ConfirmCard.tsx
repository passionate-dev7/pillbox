"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getConfirmQueue,
  subscribeConfirms,
  type PendingConfirm,
} from "@/lib/webmcp/confirm";

const EMPTY: PendingConfirm[] = [];

/**
 * The human half of confirm-before-mutate. A mutating tool's `execute` awaits `confirm(...)`,
 * which parks the call here until someone presses a button. Mount once, high in the tree.
 */
export function ConfirmCard() {
  const queue = useSyncExternalStore(subscribeConfirms, getConfirmQueue, () => EMPTY);
  const pending = queue[0];

  if (!pending) return null;
  return <Card key={pending.id} pending={pending} depth={queue.length - 1} />;
}

function Card({ pending, depth }: { pending: PendingConfirm; depth: number }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") pending.reject("dismissed with Escape");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={pending.title}
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:p-6"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-control border border-hair-strong bg-canvas text-ink shadow-[0_1px_2px_rgba(0,0,0,.06)]">
        <div className="flex items-baseline justify-between gap-4 bg-canvas-night px-4 py-2 text-on-dark">
          <span className="code text-[0.6875rem] uppercase tracking-[0.2em]">agent wants to act</span>
          {depth > 0 && (
            <span className="code text-[0.6875rem] text-on-dark/60">{depth} more waiting</span>
          )}
        </div>

        <div className="px-4 py-4">
          <h2 className="plate text-[1.375rem]">{pending.title}</h2>
          <p className="mt-1 text-[1rem]">{pending.summary}</p>

          {pending.details && pending.details.length > 0 && (
            <dl className="code mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 border-t border-hair pt-3 text-[0.8125rem]">
              {pending.details.map((d) => (
                <div key={d.label} className="contents">
                  <dt className="uppercase tracking-wide text-ink-mute">{d.label}</dt>
                  <dd>{d.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {rejecting && (
            <label className="mt-4 block">
              <span className="colhead">Why not? The agent is told this reason.</span>
              <input
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="that transfer is too long for me"
                className="mt-1 w-full rounded-control border border-hair-strong px-2.5 py-2 text-[0.9375rem] focus:border-primary-deep"
                onKeyDown={(e) => {
                  if (e.key === "Enter") pending.reject(reason);
                }}
              />
            </label>
          )}
        </div>

        <div className="flex gap-2 border-t border-hair p-3">
          <button
            type="button"
            onClick={() => pending.resolve()}
            className="flex-1 rounded-control bg-primary px-4 py-3 text-[1rem] font-bold uppercase tracking-wide text-on-primary transition-colors duration-150 hover:bg-primary-deep active:scale-[0.99]"
          >
            {pending.confirmLabel ?? "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => (rejecting ? pending.reject(reason) : setRejecting(true))}
            className="flex-1 rounded-control border border-hair-strong px-4 py-3 text-[1rem] font-bold uppercase tracking-wide hover:border-ink"
          >
            {rejecting ? "Send rejection" : (pending.rejectLabel ?? "Reject")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmCard;
