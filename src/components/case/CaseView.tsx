"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCase } from "./CaseProvider";
import { PartnerLink } from "./PartnerLink";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/ui/Footer";
import { WebMCPTools } from "@/components/webmcp/WebMCPTools";
import { checkInteractions } from "@/lib/index";
import type { ChangeProposal, Medication } from "@/lib/types";

const TIME_SLOTS = ["Morning", "Noon", "Evening", "Bedtime"] as const;

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
      <span className="text-ink-mute">round {state}</span>
    </span>
  );
}

/** A panel on the board: a hairline frame with a stated heading, never a floating card. */
function Panel({
  title,
  meta,
  children,
  testId,
}: {
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <section className="rounded-control border border-hair bg-canvas shadow-[0_1px_2px_rgba(0,0,0,.06)]" data-testid={testId}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-hair bg-canvas-soft px-3 py-1.5">
        <h2 className="colhead">{title}</h2>
        {meta ? <span className="text-[0.6875rem] text-ink-mute">{meta}</span> : null}
      </header>
      {children}
    </section>
  );
}

/** A small rounded chip carrying the app's one chromatic event: emerald. */
function RoleChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-on-primary">
      {children}
    </span>
  );
}

function severityLabel(sev: "boxed" | "contraindicated" | "warning" | "interaction"): {
  word: string;
  textCls: string;
  softCls: string;
} {
  if (sev === "boxed" || sev === "contraindicated")
    return { word: "Boxed", textCls: "text-tier-out", softCls: "bg-tier-out-soft" };
  if (sev === "warning") return { word: "Watch", textCls: "text-tier-watch", softCls: "bg-tier-watch-soft" };
  return { word: "Reliable", textCls: "text-tier-reliable", softCls: "bg-tier-reliable-soft" };
}

/** A pill carrying a severity word, tiered by colour: the flag panel's signature element. */
function SeverityPill({ sev }: { sev: "boxed" | "contraindicated" | "warning" | "interaction" }) {
  const tier = severityLabel(sev);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.06em] ${tier.softCls} ${tier.textCls}`}
    >
      {tier.word}
    </span>
  );
}

/** Status colour for a medication row's left stripe and status word. */
function statusTier(status: Medication["status"]): { stripe: string; textCls: string } {
  if (status === "active") return { stripe: "bg-tier-reliable", textCls: "text-tier-reliable" };
  if (status === "held") return { stripe: "bg-tier-watch", textCls: "text-tier-watch" };
  return { stripe: "bg-tier-held", textCls: "text-tier-held" };
}

export function CaseView() {
  const { caseState, role, actions, partnerKey, stream, error } = useCase();

  const [busy, setBusy] = useState<string | null>(null);
  const [proposeKind, setProposeKind] = useState<ChangeProposal["kind"]>("hold");
  const [proposeMedId, setProposeMedId] = useState("");
  const [proposeValue, setProposeValue] = useState("");
  const [proposeReason, setProposeReason] = useState("");
  const [counselText, setCounselText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [newMed, setNewMed] = useState({ generic: "", dose: "", schedule: "", prescriber: "" });

  const pending = caseState.proposals.filter((p) => p.status === "pending");
  const activeGenerics = caseState.medications
    .filter((m) => m.status === "active")
    .map((m) => m.generic);
  const flags = useMemo(() => checkInteractions(activeGenerics), [activeGenerics]);

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
      {/* Header band: the app's one dark surface, per round. Signature move #1. */}
      <div className="border-b border-hair-strong bg-canvas-night text-on-dark" data-testid="header-band">
        <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-4 sm:px-8">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link href="/" className="text-[0.9375rem] font-bold text-on-dark/70 hover:text-primary">
              Pill Round
            </Link>
            <span className="text-on-dark/30" aria-hidden>
              /
            </span>
            <h1 className="plate text-[1.375rem] sm:text-[1.625rem]">
              {caseState.patientLabel}, age <span className="num">{caseState.patientAge}</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RoleChip>{role === "owner" ? "Caregiver" : "Pharmacist"}</RoleChip>
            <StreamDot state={stream} />
            <span className="code num text-[0.6875rem] text-on-dark/45">v{caseState.version}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1360px] px-4 pb-16 sm:px-8">
        {role === "partner" ? (
          <div className="border-b border-hair py-4" data-testid="role-banner">
            <p className="colhead">You Are the Pharmacist</p>
            <p className="mt-1.5 max-w-xl text-[0.8125rem] leading-snug text-ink-mute">
              You can propose a change and add counsel notes. The accept tool is not registered in
              this window, and the server refuses an accept from this session.
            </p>
          </div>
        ) : null}

        {role === "owner" ? (
          <div className="border-b border-hair py-4" data-testid="role-banner">
            <p className="colhead">You Are the Caregiver</p>
            <p className="mt-1.5 max-w-xl text-[0.8125rem] leading-snug text-ink-mute">
              You add medications directly and accept any proposal. Your agent holds
              add_medication, accept_change, print_round_card and report_side_effect; the
              pharmacist&rsquo;s never does.
            </p>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            aria-live="polite"
            className="mt-3 rounded-control border border-tier-out bg-tier-out-soft px-3 py-2 text-[0.8125rem] font-medium text-tier-out"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* ------------------------------- left column ------------------------------- */}
          <section aria-label="Medications and flags" className="flex flex-col gap-5">
            <Panel
              title="Medication List"
              meta={<span className="num">{caseState.medications.length} meds</span>}
            >
              {role === "owner" ? (
                <form
                  className="flex flex-wrap gap-2 border-b border-hair bg-canvas-soft px-3 py-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newMed.generic.trim()) return;
                    const med = { ...newMed, generic: newMed.generic.trim().toLowerCase() };
                    setNewMed({ generic: "", dose: "", schedule: "", prescriber: "" });
                    void guard("add-med", () =>
                      actions.addMedication(med.generic, med.dose, med.schedule, med.prescriber),
                    );
                  }}
                >
                  <input
                    value={newMed.generic}
                    onChange={(e) => setNewMed((m) => ({ ...m, generic: e.target.value }))}
                    placeholder="Generic…"
                    aria-label="New medication generic name"
                    className="min-w-0 flex-1 rounded-control border border-hair-strong bg-canvas px-2 py-1.5 text-[0.8125rem] focus:border-primary-deep"
                  />
                  <input
                    value={newMed.dose}
                    onChange={(e) => setNewMed((m) => ({ ...m, dose: e.target.value }))}
                    placeholder="Dose…"
                    aria-label="New medication dose"
                    className="w-24 rounded-control border border-hair-strong bg-canvas px-2 py-1.5 text-[0.8125rem] focus:border-primary-deep"
                  />
                  <input
                    value={newMed.schedule}
                    onChange={(e) => setNewMed((m) => ({ ...m, schedule: e.target.value }))}
                    placeholder="Schedule…"
                    aria-label="New medication schedule"
                    className="w-32 rounded-control border border-hair-strong bg-canvas px-2 py-1.5 text-[0.8125rem] focus:border-primary-deep"
                  />
                  <input
                    value={newMed.prescriber}
                    onChange={(e) => setNewMed((m) => ({ ...m, prescriber: e.target.value }))}
                    placeholder="Prescriber…"
                    aria-label="New medication prescriber"
                    className="w-32 rounded-control border border-hair-strong bg-canvas px-2 py-1.5 text-[0.8125rem] focus:border-primary-deep"
                  />
                  <Button type="submit" variant="primary" disabled={busy !== null}>
                    Add
                  </Button>
                </form>
              ) : null}

              {caseState.medications.length === 0 ? (
                <p className="px-3 py-3 text-[0.875rem] text-ink-mute">
                  No medications on this round yet.
                </p>
              ) : (
                /* Signature move #2: each medication is a rounded card with a left status stripe. */
                <ul className="flex flex-col gap-2 p-2.5">
                  {caseState.medications.map((m: Medication) => {
                    const tier = statusTier(m.status);
                    return (
                      <li
                        key={m.id}
                        className={`flex overflow-hidden rounded-control border border-hair shadow-[0_1px_2px_rgba(0,0,0,.06)] ${
                          m.status !== "active" ? "med-held" : ""
                        }`}
                        data-testid={`med-${m.id}`}
                      >
                        <span className={`w-1 shrink-0 ${tier.stripe}`} aria-hidden />
                        <div className="grid w-full grid-cols-2 gap-x-3 gap-y-1 px-3 py-2.5 sm:grid-cols-[1.3fr_0.9fr_0.9fr_0.9fr_auto]">
                          <div>
                            <p className="text-[0.875rem] font-semibold">{m.generic}</p>
                            <p className="text-[0.75rem] text-ink-mute">{m.brand ?? "n/a"}</p>
                          </div>
                          <p className="code num self-center text-[0.8125rem]">{m.dose}</p>
                          <p className="self-center text-[0.8125rem]">{m.schedule}</p>
                          <p className="self-center text-[0.8125rem] text-ink-mute">{m.prescriber}</p>
                          <p className={`colhead self-center sm:text-right ${tier.textCls}`}>{m.status}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel title="Flags" meta={<span className="num">{flags.length}</span>}>
              {flags.length === 0 ? (
                <p className="px-3 py-3 text-[0.875rem] text-ink-mute">
                  No interaction flags found among the active medications.
                </p>
              ) : (
                /* Signature move #3: bordered callout, severity pill, quiet mono FDA sentence. */
                <ul className="flex flex-col gap-2.5 p-2.5">
                  {flags.map((f, i) => (
                    <li
                      key={`${f.a}-${f.b}-${i}`}
                      className="rounded-control border border-hair p-3"
                      data-testid={`flag-${f.a}-${f.b}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="plate text-[0.9375rem]">
                          {f.a} + {f.b}
                        </span>
                        <SeverityPill sev={f.severity} />
                      </div>
                      {f.sentences.map((s, j) => (
                        <div
                          key={j}
                          className="code mt-2 rounded-control bg-canvas-soft px-2.5 py-2 text-[0.75rem] leading-relaxed text-ink-mute"
                        >
                          &ldquo;{s.sentence}&rdquo;{" "}
                          <a
                            href={`https://api.fda.gov/drug/label.json?search=set_id:${s.setId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary-deep underline decoration-dotted"
                          >
                            {s.setId}
                          </a>
                        </div>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </section>

          {/* ------------------------------- right column ------------------------------- */}
          <section aria-label="Proposals, notes and tools" className="flex flex-col gap-5">
            <Panel
              title="Proposals"
              meta={<span className="num">{pending.length} pending</span>}
              testId="proposals-heading"
            >
              {role === "partner" ? (
                <form
                  className="flex flex-col gap-2 border-b border-hair bg-canvas-soft px-3 py-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!proposeReason.trim()) return;
                    const kind = proposeKind;
                    const medicationId = proposeMedId || undefined;
                    const value = proposeValue.trim();
                    const reason = proposeReason.trim();
                    let fields: Record<string, unknown> | undefined;
                    if (kind === "dose" && value) fields = { dose: value };
                    else if (kind === "time" && value) fields = { schedule: value };
                    else if ((kind === "substitute" || kind === "add") && value) {
                      const [generic, dose, schedule, prescriber] = value.split("|").map((s) => s.trim());
                      fields = { generic, dose, schedule, prescriber };
                    }
                    setProposeValue("");
                    setProposeReason("");
                    void guard("propose", () =>
                      actions.proposeChange(kind, reason, medicationId, fields),
                    );
                  }}
                >
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={proposeKind}
                      onChange={(e) => setProposeKind(e.target.value as ChangeProposal["kind"])}
                      aria-label="Kind of change to propose"
                      className="rounded-control border border-hair-strong bg-canvas px-2 py-1.5 text-[0.8125rem] focus:border-primary-deep"
                    >
                      <option value="hold">Hold</option>
                      <option value="dose">Dose</option>
                      <option value="time">Time</option>
                      <option value="substitute">Substitute</option>
                      <option value="stop">Stop</option>
                      <option value="add">Add</option>
                    </select>
                    <select
                      value={proposeMedId}
                      onChange={(e) => setProposeMedId(e.target.value)}
                      aria-label="Target medication"
                      className="min-w-0 flex-1 rounded-control border border-hair-strong bg-canvas px-2 py-1.5 text-[0.8125rem] focus:border-primary-deep"
                    >
                      <option value="">No specific medication…</option>
                      {caseState.medications.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.generic}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    value={proposeValue}
                    onChange={(e) => setProposeValue(e.target.value)}
                    placeholder="New dose or time; for substitute/add use generic|dose|schedule|prescriber…"
                    aria-label="New value for this change"
                    className="rounded-control border border-hair-strong bg-canvas px-2 py-1.5 text-[0.8125rem] focus:border-primary-deep"
                  />
                  <textarea
                    value={proposeReason}
                    onChange={(e) => setProposeReason(e.target.value)}
                    placeholder="Reason for the caregiver…"
                    aria-label="Reason for this proposal"
                    rows={2}
                    className="rounded-control border border-hair-strong bg-canvas px-2 py-1.5 text-[0.8125rem] focus:border-primary-deep"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={busy !== null || !proposeReason.trim()}
                    data-testid="propose-submit"
                  >
                    {busy === "propose" ? "Proposing…" : "Propose Change"}
                  </Button>
                </form>
              ) : null}

              {caseState.proposals.length === 0 ? (
                <p className="px-3 py-3 text-[0.8125rem] text-ink-mute">
                  Nothing proposed yet. The pharmacist proposes a change; the caregiver is the
                  only one who can accept it.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {caseState.proposals.map((p) => (
                    <li
                      key={p.id}
                      className="border-b border-hair last:border-b-0"
                      data-testid={`proposal-${p.id}`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hair bg-canvas-soft px-3 py-2">
                        <span className="plate text-[0.9375rem]">{p.kind}</span>
                        <span
                          className={`colhead ${
                            p.status === "pending"
                              ? "text-tier-watch"
                              : p.status === "accepted"
                                ? "text-tier-reliable"
                                : "text-tier-out"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="px-3 py-2 text-[0.875rem]">{p.reason}</p>
                      {role === "owner" && p.status === "pending" ? (
                        <div className="flex gap-2 px-3 pb-2">
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
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Counsel Notes" meta={<span className="num">{caseState.counsel.length}</span>}>
              {caseState.counsel.length === 0 ? (
                <p className="px-3 py-2.5 text-[0.8125rem] text-ink-mute">
                  No counsel notes yet.
                </p>
              ) : (
                <ol>
                  {[...caseState.counsel].reverse().map((e, i) => (
                    <li key={`${e.at}-${i}`} className="border-b border-hair px-3 py-2 text-[0.8125rem] last:border-b-0">
                      <time className="code num text-[0.6875rem] text-ink-faint" dateTime={e.at}>
                        {new Date(e.at).toLocaleString("en-US", { hour12: false })}
                      </time>
                      <p className="mt-0.5 leading-snug">{e.text}</p>
                    </li>
                  ))}
                </ol>
              )}
              {role === "partner" ? (
                <form
                  className="flex gap-2 border-t border-hair px-3 py-2"
                  onSubmit={(ev) => {
                    ev.preventDefault();
                    if (!counselText.trim()) return;
                    const text = counselText.trim();
                    setCounselText("");
                    void guard("counsel", () => actions.addCounselNote(text));
                  }}
                >
                  <input
                    value={counselText}
                    onChange={(e) => setCounselText(e.target.value)}
                    placeholder="Add a counsel note…"
                    aria-label="Add a counsel note"
                    className="flex-1 rounded-control border border-hair-strong bg-canvas px-2.5 py-1.5 text-[0.8125rem] focus:border-primary-deep"
                  />
                  <Button type="submit" disabled={busy !== null}>
                    Add
                  </Button>
                </form>
              ) : null}
            </Panel>

            {role === "owner" ? (
              <RoundCard medications={caseState.medications} onPrint={() => actions.printRoundCard()} />
            ) : null}

            {role === "owner" ? <PartnerLink caseId={caseState.id} partnerKey={partnerKey} /> : null}

            <Panel title="Timeline" meta={<span className="num">{caseState.notes.length} entries</span>}>
              <ol className="max-h-80 overflow-y-auto" data-testid="timeline">
                {caseState.notes.length === 0 ? (
                  <li className="px-3 py-2.5 text-[0.8125rem] text-ink-mute">
                    Nothing has happened on this round yet.
                  </li>
                ) : (
                  [...caseState.notes].reverse().map((e, i) => (
                    <li
                      key={`${e.at}-${i}`}
                      className="grid grid-cols-[4.25rem_1fr] gap-x-3 border-b border-hair px-3 py-2 text-[0.8125rem] last:border-b-0"
                    >
                      <time className="code num text-[0.6875rem] text-ink-faint" dateTime={e.at}>
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
                  if (!noteText.trim()) return;
                  const text = noteText.trim();
                  setNoteText("");
                  void guard("note", () => actions.addNote(text));
                }}
              >
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note both windows can read…"
                  aria-label="Add a note to the shared timeline"
                  className="flex-1 rounded-control border border-hair-strong bg-canvas px-2.5 py-1.5 text-[0.8125rem] focus:border-primary-deep"
                  data-testid="note-input"
                />
                <Button type="submit" disabled={busy !== null}>
                  Add
                </Button>
              </form>
            </Panel>

            {caseState.reports.length > 0 ? (
              <Panel title="Side-Effect Reports" meta={<span className="num">{caseState.reports.length}</span>}>
                <ul>
                  {caseState.reports.map((r) => (
                    <li key={r.id} className="border-b border-hair px-3 py-2.5 text-[0.8125rem] last:border-b-0">
                      <div className="plate text-[0.9375rem]">{r.description}</div>
                      <p className="mt-0.5 text-ink-mute">
                        onset {r.onset} · severity {r.severity}
                      </p>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}

            <WebMCPTools role={role} caseState={caseState} actions={actions} partnerKey={partnerKey} />
          </section>
        </div>

        <Footer />
      </div>
    </div>
  );
}

/** Latest medication list rendered as a printable grid: medication x time-of-day. Signature move #4. */
function RoundCard({
  medications,
  onPrint,
}: {
  medications: Medication[];
  onPrint: () => void;
}) {
  const active = medications.filter((m) => m.status === "active");
  return (
    <section className="round-card rounded-control border border-hair bg-canvas shadow-[0_1px_2px_rgba(0,0,0,.06)]">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-hair bg-canvas-soft px-3 py-1.5">
        <h2 className="colhead">Round Card</h2>
        <Button type="button" variant="primary" onClick={onPrint} data-testid="print-round-card">
          Print
        </Button>
      </header>
      {active.length === 0 ? (
        <p className="px-3 py-3 text-[0.875rem] text-ink-mute">No active medications to print.</p>
      ) : (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-hair-strong bg-canvas-soft">
              <th scope="col" className="colhead px-3 py-1.5 font-semibold">Medication</th>
              {TIME_SLOTS.map((t) => (
                <th key={t} scope="col" className="colhead px-2 py-1.5 text-center font-semibold">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {active.map((m) => (
              <tr key={m.id} className="border-b border-hair last:border-b-0">
                <td className="px-3 py-2 text-[0.875rem]">
                  {m.generic} <span className="code num text-ink-mute">{m.dose}</span>
                </td>
                {TIME_SLOTS.map((t) => {
                  const applies = m.schedule.toLowerCase().includes(t.toLowerCase());
                  return (
                    <td
                      key={t}
                      className={`round-card-cell border-l border-hair px-2 py-2 text-center text-[0.9375rem] font-bold ${
                        applies ? "bg-primary-soft text-primary-deep" : ""
                      }`}
                    >
                      {applies ? "✓" : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default CaseView;
