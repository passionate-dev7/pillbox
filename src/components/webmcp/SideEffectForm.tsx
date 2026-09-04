"use client";

import { useEffect, useState } from "react";
import styles from "./tool-form.module.css";

const TOOL_NAME = "report_side_effect";
const TOOL_DESCRIPTION =
  "Report a possible side effect for a medication on this round: which medication, what happened, when it started, how severe. The caregiver reads the filled form and presses Send; it is never submitted automatically.";

type ReportSideEffectFn = (
  description: string,
  onset: string,
  severity: string,
  medicationId?: string,
) => Promise<{ reports: unknown[] }>;

/**
 * The declarative half of the demo: a real <form> carrying `toolname` / `tooldescription` /
 * `toolparamdescription`. The browser synthesises the input schema from the controls and
 * registers the tool itself, so there is no registerTool call here.
 *
 * There is deliberately NO `toolautosubmit`. Without it the agent fills the fields, the browser
 * focuses the submit button, and a human has to press it. That is WebMCP's built-in
 * human-in-the-loop for declarative tools.
 *
 * Render only in the caregiver session, per docs/BUILD-CONTRACT.md (report_side_effect is
 * OWNER_ONLY). Takes only the one action method it needs (structural typing) so this component
 * does not couple to the exact shape of CaseActions while the tools agent's contracts.ts lands.
 */
export function SideEffectForm({ reportSideEffect }: { reportSideEffect: ReportSideEffectFn }) {
  const [agentFilled, setAgentFilled] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const onActivated = (event: Event) => {
      if ((event as Event & { toolName?: string }).toolName === TOOL_NAME) setAgentFilled(true);
    };
    const onCancel = (event: Event) => {
      if ((event as Event & { toolName?: string }).toolName === TOOL_NAME) setAgentFilled(false);
    };
    window.addEventListener("toolactivated", onActivated);
    window.addEventListener("toolcancel", onCancel);
    return () => {
      window.removeEventListener("toolactivated", onActivated);
      window.removeEventListener("toolcancel", onCancel);
    };
  }, []);

  async function send(form: HTMLFormElement) {
    const data = new FormData(form);
    const medicationId = String(data.get("medicationId") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const onset = String(data.get("onset") ?? "").trim();
    const severity = String(data.get("severity") ?? "").trim();
    if (!description || !onset || !severity) {
      throw new Error("Description, onset, and severity are required.");
    }
    const caseState = await reportSideEffect(
      description,
      onset,
      severity,
      medicationId || undefined,
    );
    return {
      filed: true,
      description,
      reportCount: caseState.reports.length,
      note: "The report is on the shared round timeline; the pharmacist can see it.",
    };
  }

  return (
    <form
      toolname={TOOL_NAME}
      tooldescription={TOOL_DESCRIPTION}
      className={`${styles.toolForm} ${agentFilled ? styles.agentFilled : ""} p-4`}
      onSubmit={(event) => {
        const native = event.nativeEvent as SubmitEvent;
        event.preventDefault();
        const form = event.currentTarget;
        const done = send(form).then(
          (result) => {
            setAgentFilled(false);
            setStatus(`Filed report: ${result.description}.`);
            form.reset();
            return result;
          },
          (error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            setStatus(message);
            throw new Error(`The report was not filed: ${message}`);
          }
        );
        if (native.agentInvoked && native.respondWith) native.respondWith(done);
        else void done.catch(() => undefined);
      }}
    >
      <h2 className="colhead">Report a Side Effect</h2>

      <label className="mt-3 block text-[0.8125rem] font-semibold">
        Medication (optional)
        <input
          name="medicationId"
          toolparamdescription="The id of the medication this side effect relates to, if known."
          placeholder="med id…"
          className="mt-1 block w-full rounded-control border border-hair-strong bg-canvas px-2.5 py-2 text-[0.9375rem] font-normal focus:border-primary"
        />
      </label>

      <label className="mt-3 block text-[0.8125rem] font-semibold">
        What happened
        <textarea
          name="description"
          required
          rows={3}
          toolparamdescription="A plain description of the side effect observed."
          placeholder="Felt dizzy after the morning dose…"
          className="mt-1 block w-full rounded-control border border-hair-strong bg-canvas px-2.5 py-2 text-[0.9375rem] font-normal focus:border-primary"
        />
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-[0.8125rem] font-semibold">
          Onset
          <input
            name="onset"
            required
            toolparamdescription="When it started, e.g. 'about 30 minutes after the dose'."
            placeholder="30 minutes after dose…"
            className="mt-1 block w-full rounded-control border border-hair-strong bg-canvas px-2.5 py-2 text-[0.9375rem] font-normal focus:border-primary"
          />
        </label>
        <label className="block text-[0.8125rem] font-semibold">
          Severity
          <input
            name="severity"
            required
            toolparamdescription="How severe it was, e.g. 'mild', 'moderate', 'severe'."
            placeholder="mild…"
            className="mt-1 block w-full rounded-control border border-hair-strong bg-canvas px-2.5 py-2 text-[0.9375rem] font-normal focus:border-primary"
          />
        </label>
      </div>

      <button
        type="submit"
        className={`${styles.submit} mt-4 w-full rounded-control bg-primary px-4 py-2.5 text-[0.9375rem] font-semibold text-on-primary transition-transform duration-150 active:scale-[0.97]`}
      >
        Send Report
      </button>

      {status && <p className="code mt-2 text-[0.6875rem]" aria-live="polite">{status}</p>}
    </form>
  );
}

export default SideEffectForm;
