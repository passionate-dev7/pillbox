"use client";

import { useEffect, useState } from "react";
import type { CaseActions } from "@/lib/webmcp/contracts";
import styles from "./tool-form.module.css";

const TOOL_NAME = "report_form";
const TOOL_DESCRIPTION =
  "File a report against this case: a subject and a description. The owner reads the filled form and presses Send; it is never submitted automatically.";

/**
 * The declarative half of the demo: a real <form> carrying `toolname` / `tooldescription` /
 * `toolparamdescription`. The browser synthesises the input schema from the controls and
 * registers the tool itself, so there is no registerTool call here.
 *
 * There is deliberately NO `toolautosubmit`. Without it the agent fills the fields, the browser
 * focuses the submit button, and a human has to press it. That is WebMCP's built-in
 * human-in-the-loop for declarative tools: any write an agent should never be able to send on
 * its own goes through a form shaped like this one, not through registerTool.
 *
 * Render only in the owner session. This is the template's one worked example of a declarative
 * tool; copy this file's shape (not its fields) for your own domain's forms.
 */
export function ReportForm({ actions }: { actions: CaseActions }) {
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
    const subject = String(data.get("subject") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    if (!subject || !description) throw new Error("Both the subject and the description are required.");
    const caseState = await actions.report(subject, description);
    return {
      filed: true,
      subject,
      reportCount: caseState.reports.length,
      note: "The report is on the shared case timeline; the partner can see it.",
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
            setStatus(`Filed report: ${result.subject}.`);
            form.reset();
            return result;
          },
          (error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            setStatus(message);
            throw new Error(`The report was not filed: ${message}`);
          }
        );
        // Hand the structured result straight back to the agent that filled the form,
        // instead of navigating. respondWith is the mechanism Chrome documents today.
        if (native.agentInvoked && native.respondWith) native.respondWith(done);
        else void done.catch(() => undefined);
      }}
    >
      <h2 className="colhead">File a report</h2>

      <label className="mt-3 block text-[0.8125rem] font-semibold">
        Subject
        <input
          name="subject"
          required
          toolparamdescription="A short subject line for the report."
          placeholder="Missing attachment"
          className="mt-1 block w-full rounded-control border border-hair-strong bg-paper px-2.5 py-2 text-[0.9375rem] font-normal focus:border-accent"
        />
      </label>

      <label className="mt-3 block text-[0.8125rem] font-semibold">
        Description
        <textarea
          name="description"
          required
          rows={3}
          toolparamdescription="What happened, in your own words."
          className="mt-1 block w-full rounded-control border border-hair-strong bg-paper px-2.5 py-2 text-[0.9375rem] font-normal focus:border-accent"
        />
      </label>

      <button
        type="submit"
        className={`${styles.submit} mt-4 w-full rounded-control bg-accent px-4 py-2.5 text-[0.9375rem] font-semibold text-paper transition-transform duration-150 active:scale-[0.97]`}
      >
        Send report
      </button>

      {status && <p className="code mt-2 text-[0.6875rem]" aria-live="polite">{status}</p>}
    </form>
  );
}

export default ReportForm;
