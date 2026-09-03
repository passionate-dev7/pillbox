"use client";

import { useState } from "react";
import Link from "next/link";
import { useCase } from "./CaseProvider";
import { PartnerLink } from "./PartnerLink";
import { Button } from "@/components/ui/Button";
import { WebMCPTools } from "@/components/webmcp/WebMCPTools";
import { ReportForm } from "@/components/webmcp/ReportForm";

/** A stream is either carrying versions or it is not. Say which, in one glyph and one word. */
function StreamDot({ state }: { state: "connecting" | "open" | "closed" }) {
  const colour =
    state === "open"
      ? "var(--color-tier-reliable)"
      : state === "connecting"
        ? "var(--color-tier-watch)"
        : "var(--color-tier-out)";
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: colour }} aria-hidden />
      <span className="text-ink-soft">case {state}</span>
    </span>
  );
}

/** A panel on the board: a hairline frame with a stated heading, never a floating card. */
function Panel({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-hair-strong bg-paper">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-hair bg-paper-sunk px-3 py-1.5">
        <h2 className="colhead">{title}</h2>
        {meta ? <span className="text-[0.6875rem] text-ink-soft">{meta}</span> : null}
      </header>
      {children}
    </section>
  );
}

export function CaseView() {
  const { caseState, role, actions, partnerKey, stream, error } = useCase();

  const [busy, setBusy] = useState<string | null>(null);
  const [itemText, setItemText] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const pending = caseState.proposals.filter((p) => p.status === "pending");

  const guard = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
    } catch {
      /* error surfaces through the provider's error state */
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      {/* The two roles must be unmistakable from across a room, not from a label. */}
      {role === "partner" ? (
        <div className="border-b border-ink bg-ink text-paper" data-testid="role-banner">
          <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-baseline justify-between gap-x-8 gap-y-2 px-4 py-4 sm:px-8">
            <div>
              <h1 className="plate text-[1.5rem] sm:text-[1.875rem]">Partner view</h1>
              <p className="plate mt-1 text-[1.0625rem] text-paper/80">{caseState.title}</p>
            </div>
            <p className="max-w-sm text-[0.8125rem] leading-snug text-paper/75">
              You are watching someone else&rsquo;s case. You can propose a change and add notes.
              The accept tool is not registered in this window, and the server refuses an accept
              from this session.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[1360px] px-4 pb-24 sm:px-8">
        <header className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-b border-ink py-3">
          <Link href="/" className="plate text-[1.0625rem] hover:text-accent">
            webmcp-two-agent-spine
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <StreamDot state={stream} />
            <span className="code num text-[0.6875rem] text-ink-subtle">v{caseState.version}</span>
          </div>
        </header>

        {role === "owner" ? (
          <div className="border-b border-hair py-4" data-testid="role-banner">
            <p className="colhead">You are the owner</p>
            <h1 className="plate mt-1.5 text-[clamp(1.5rem,3.6vw,2.25rem)] text-balance">{caseState.title}</h1>
            <p className="mt-1.5 max-w-xl text-[0.8125rem] leading-snug text-ink-soft">
              You add items directly and accept any proposal. Your agent holds add_item,
              accept_change, share_case and report_form; the partner&rsquo;s never does.
            </p>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            aria-live="polite"
            className="mt-3 border border-tier-unreliable bg-paper-sunk px-3 py-2 text-[0.8125rem] font-medium text-tier-unreliable"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* ------------------------------- items ------------------------------- */}
          <section aria-label="Items" className="flex flex-col gap-5">
            {role === "owner" ? (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!itemText.trim()) return;
                  const text = itemText.trim();
                  setItemText("");
                  void guard("add-item", () => actions.addItem(text));
                }}
              >
                <input
                  value={itemText}
                  onChange={(e) => setItemText(e.target.value)}
                  placeholder="Add an item…"
                  aria-label="Add an item to the case"
                  className="flex-1 rounded-control border border-hair-strong bg-paper px-2.5 py-2 text-[0.875rem] focus:border-accent"
                  data-testid="item-input"
                />
                <Button type="submit" variant="primary" disabled={busy !== null}>
                  Add
                </Button>
              </form>
            ) : (
              <label className="block">
                <span className="colhead">propose an item, and why</span>
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={itemText}
                    onChange={(e) => setItemText(e.target.value)}
                    placeholder="Item to add…"
                    className="flex-1 rounded-control border border-hair-strong bg-paper px-3 py-2 text-[0.875rem] focus:border-accent"
                    data-testid="propose-text"
                  />
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why the owner should add it…"
                    className="flex-1 rounded-control border border-hair-strong bg-paper px-3 py-2 text-[0.875rem] focus:border-accent"
                    data-testid="propose-reason"
                  />
                  <Button
                    type="button"
                    disabled={busy !== null || !itemText.trim() || !reason.trim()}
                    onClick={() =>
                      guard("propose", async () => {
                        await actions.proposeChange(itemText.trim(), reason.trim());
                        setItemText("");
                        setReason("");
                      })
                    }
                    data-testid="propose-submit"
                  >
                    {busy === "propose" ? "Proposing…" : "Propose"}
                  </Button>
                </div>
              </label>
            )}

            <div className="flex flex-col gap-2">
              <h2 className="colhead">
                {caseState.items.length} item{caseState.items.length === 1 ? "" : "s"}
              </h2>
              {caseState.items.length === 0 ? (
                <p className="border border-hair-strong bg-paper px-3 py-3 text-[0.875rem]">
                  Nothing on this case yet.
                </p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {caseState.items.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-baseline justify-between gap-3 border border-hair-strong bg-paper px-3 py-2.5"
                      data-testid={`item-${it.id}`}
                    >
                      <span className="text-[0.9375rem]">{it.text}</span>
                      <span className="colhead">{it.by}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="colhead" data-testid="proposals-heading">
                {pending.length} pending proposal{pending.length === 1 ? "" : "s"}
              </h2>
              {caseState.proposals.length === 0 ? (
                <p className="text-[0.8125rem] text-ink-soft">
                  Nothing proposed yet. The partner proposes a change; the owner is the only one
                  who can accept it.
                </p>
              ) : (
                caseState.proposals.map((p) => (
                  <div key={p.id} className="border border-hair-strong bg-paper" data-testid={`proposal-${p.id}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hair bg-paper-sunk px-3 py-2">
                      <span className="plate text-[0.9375rem]">{String(p.payload.text ?? "")}</span>
                      <span className="colhead">{p.status}</span>
                    </div>
                    <p className="px-3 py-2 text-[0.875rem]">{p.reason}</p>
                    {role === "owner" && p.status === "pending" ? (
                      <div className="flex gap-2 border-t border-hair px-3 py-2">
                        <Button
                          type="button"
                          variant="primary"
                          disabled={busy !== null}
                          onClick={() => guard(`ok-${p.id}`, () => actions.acceptChange(p.id))}
                          data-testid={`accept-proposal-${p.id}`}
                        >
                          Accept
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          disabled={busy !== null}
                          onClick={() => guard(`no-${p.id}`, () => actions.rejectChange(p.id))}
                          data-testid={`reject-proposal-${p.id}`}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            {role === "owner" ? <PartnerLink caseId={caseState.id} partnerKey={partnerKey} /> : null}
          </section>

          {/* -------------------------------- board -------------------------------- */}
          <section aria-label="Case board" className="flex flex-col gap-5">
            <Panel title="shared timeline" meta={<span className="num">{caseState.notes.length} entries</span>}>
              <ol className="max-h-80 overflow-y-auto" data-testid="timeline">
                {caseState.notes.length === 0 ? (
                  <li className="px-3 py-2.5 text-[0.8125rem] text-ink-soft">
                    Nothing has happened on this case yet.
                  </li>
                ) : (
                  [...caseState.notes].reverse().map((e, i) => (
                    <li
                      key={`${e.at}-${i}`}
                      className="grid grid-cols-[4.25rem_1fr] gap-x-3 border-b border-hair px-3 py-2 text-[0.8125rem] last:border-b-0"
                    >
                      <time className="code num text-[0.6875rem] text-ink-subtle" dateTime={e.at}>
                        {new Date(e.at).toLocaleTimeString("en-US", { hour12: false })}
                      </time>
                      <div className="min-w-0">
                        <span className="colhead">{e.by}</span>
                        <p className="mt-0.5 leading-snug">{e.text}</p>
                      </div>
                    </li>
                  ))
                )}
              </ol>
              <form
                className="flex gap-2 border-t border-hair px-3 py-2"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  if (!note.trim()) return;
                  const text = note.trim();
                  setNote("");
                  void guard("note", () => actions.addNote(text));
                }}
              >
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note both windows can read…"
                  aria-label="Add a note to the shared timeline"
                  className="flex-1 rounded-control border border-hair-strong bg-paper px-2.5 py-1.5 text-[0.8125rem] focus:border-accent"
                  data-testid="note-input"
                />
                <Button type="submit" disabled={busy !== null}>
                  Add
                </Button>
              </form>
            </Panel>

            {caseState.reports.length > 0 ? (
              <Panel title="reports" meta={<span className="num">{caseState.reports.length}</span>}>
                <ul>
                  {caseState.reports.map((r) => (
                    <li key={r.id} className="border-b border-hair px-3 py-2.5 text-[0.8125rem] last:border-b-0">
                      <div className="plate text-[0.9375rem]">{r.subject}</div>
                      <p className="mt-0.5 text-ink-soft">{r.description}</p>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}

            {role === "owner" ? <ReportForm actions={actions} /> : null}

            <WebMCPTools role={role} caseState={caseState} actions={actions} partnerKey={partnerKey} reportForm={false} />
          </section>
        </div>
      </div>
    </div>
  );
}

export default CaseView;
