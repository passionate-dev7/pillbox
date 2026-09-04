"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { findDrug } from "@/lib/index";
import { DEMO_MEDICATIONS } from "@/lib/store/demo";
import type { CaseState } from "@/lib/types";

type DraftMed = {
  key: string;
  generic: string;
  dose: string;
  schedule: string;
  prescriber: string;
};

function emptyRow(): DraftMed {
  return { key: crypto.randomUUID(), generic: "", dose: "", schedule: "", prescriber: "" };
}

/**
 * Home page's case-creation form: a patient label and age, then a growing list of medication
 * rows (generic, dose, schedule, prescriber) with a lightweight autocomplete against the seed
 * drug set. A single button loads the 11-medication demo list from four prescribers, marked
 * SIMULATED so a caregiver never mistakes it for their own father's chart.
 */
export function CreateCase() {
  const router = useRouter();
  const [patientLabel, setPatientLabel] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [rows, setRows] = useState<DraftMed[]>([emptyRow()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestFor, setSuggestFor] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    const row = rows.find((r) => r.key === suggestFor);
    if (!row || row.generic.trim().length < 2) return [];
    return findDrug(row.generic).slice(0, 6);
  }, [rows, suggestFor]);

  const updateRow = useCallback((key: string, patch: Partial<DraftMed>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }, []);

  const removeRow = useCallback((key: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }, []);

  function loadDemo() {
    setRows(
      DEMO_MEDICATIONS.map((m) => ({
        key: crypto.randomUUID(),
        generic: m.generic,
        dose: m.dose,
        schedule: m.schedule,
        prescriber: m.prescriber,
      })),
    );
    if (!patientLabel.trim()) setPatientLabel("Dad");
    if (!patientAge.trim()) setPatientAge("78");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const label = patientLabel.trim();
    const age = Number(patientAge);
    const medications = rows
      .filter((r) => r.generic.trim())
      .map((r) => ({
        generic: r.generic.trim().toLowerCase(),
        dose: r.dose.trim(),
        schedule: r.schedule.trim(),
        prescriber: r.prescriber.trim(),
      }));
    if (!label) {
      setError("Give the patient a label, like \u201cDad\u201d. Never a real name.");
      return;
    }
    if (!Number.isFinite(age) || age <= 0) {
      setError("Enter the patient's age as a number.");
      return;
    }
    if (medications.length === 0) {
      setError("Add at least one medication, or load the demo list.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientLabel: label, patientAge: age, medications }),
      });
      const body = (await res.json()) as { case?: CaseState; ownerUrl?: string; error?: string };
      if (!res.ok || !body.ownerUrl) {
        throw new Error(body.error ?? `Creating the case failed with HTTP ${res.status}.`);
      }
      router.push(body.ownerUrl);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-hair-strong bg-canvas p-4">
      <h2 className="colhead">Start a round</h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr]">
        <label className="block text-[0.8125rem] font-semibold">
          Patient label
          <input
            value={patientLabel}
            onChange={(e) => setPatientLabel(e.target.value)}
            required
            autoComplete="off"
            name="patientLabel"
            placeholder="Dad…"
            className="mt-1 block w-full rounded-control border border-hair-strong bg-canvas px-2.5 py-2 text-[0.9375rem] font-normal focus:border-primary"
          />
        </label>
        <label className="block text-[0.8125rem] font-semibold">
          Age
          <input
            value={patientAge}
            onChange={(e) => setPatientAge(e.target.value)}
            required
            type="number"
            inputMode="numeric"
            name="patientAge"
            min={0}
            max={120}
            placeholder="78…"
            className="num mt-1 block w-full rounded-control border border-hair-strong bg-canvas px-2.5 py-2 text-[0.9375rem] font-normal focus:border-primary"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <h3 className="colhead">Medications</h3>
        <span className="chip-simulated inline-flex items-center bg-canvas-soft px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-ink-mute">
          Simulated
        </span>
      </div>
      <Button type="button" variant="outline" onClick={loadDemo} className="mt-2 w-full">
        Load the demo list (SIMULATED)
      </Button>

      <div className="mt-3 flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.key} className="border border-hair bg-canvas-soft p-3">
            <div className="grid gap-2 sm:grid-cols-[1.3fr_0.8fr_1fr_1fr_auto]">
              <div className="relative">
                <label className="block text-[0.6875rem] font-semibold text-ink-mute">
                  Generic
                  <input
                    value={row.generic}
                    onChange={(e) => updateRow(row.key, { generic: e.target.value })}
                    onFocus={() => setSuggestFor(row.key)}
                    onBlur={() => setTimeout(() => setSuggestFor(null), 120)}
                    autoComplete="off"
                    name={`generic-${row.key}`}
                    placeholder="warfarin…"
                    className="mt-1 block w-full rounded-control border border-hair-strong bg-canvas px-2 py-1.5 text-[0.875rem] focus:border-primary"
                  />
                </label>
                {suggestFor === row.key && suggestions.length > 0 ? (
                  <ul className="absolute z-10 mt-0.5 w-full border border-hair-strong bg-canvas text-[0.8125rem] shadow-none">
                    {suggestions.map((d) => (
                      <li key={d.generic}>
                        <button
                          type="button"
                          className="block w-full px-2 py-1.5 text-left hover:bg-primary-soft"
                          onMouseDown={() => updateRow(row.key, { generic: d.generic })}
                        >
                          {d.generic}
                          {d.brands.length ? (
                            <span className="text-ink-faint"> · {d.brands.join(", ")}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <label className="block text-[0.6875rem] font-semibold text-ink-mute">
                Dose
                <input
                  value={row.dose}
                  onChange={(e) => updateRow(row.key, { dose: e.target.value })}
                  name={`dose-${row.key}`}
                  placeholder="5 mg…"
                  className="mt-1 block w-full rounded-control border border-hair-strong bg-canvas px-2 py-1.5 text-[0.875rem] focus:border-primary"
                />
              </label>
              <label className="block text-[0.6875rem] font-semibold text-ink-mute">
                Schedule
                <input
                  value={row.schedule}
                  onChange={(e) => updateRow(row.key, { schedule: e.target.value })}
                  name={`schedule-${row.key}`}
                  placeholder="Morning…"
                  className="mt-1 block w-full rounded-control border border-hair-strong bg-canvas px-2 py-1.5 text-[0.875rem] focus:border-primary"
                />
              </label>
              <label className="block text-[0.6875rem] font-semibold text-ink-mute">
                Prescriber
                <input
                  value={row.prescriber}
                  onChange={(e) => updateRow(row.key, { prescriber: e.target.value })}
                  name={`prescriber-${row.key}`}
                  placeholder="Dr. Alvarez…"
                  className="mt-1 block w-full rounded-control border border-hair-strong bg-canvas px-2 py-1.5 text-[0.875rem] focus:border-primary"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  aria-label={`Remove medication row ${row.generic || "blank"}`}
                  className="h-[34px] w-full rounded-control border border-hair-strong px-2 text-[0.75rem] text-ink-mute hover:border-tier-out hover:text-tier-out sm:w-auto"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => setRows((prev) => [...prev, emptyRow()])}
        className="mt-3"
      >
        Add another medication
      </Button>

      {error && (
        <p role="alert" aria-live="polite" className="mt-3 text-[0.8125rem] font-medium text-tier-out">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={busy} className="mt-5 w-full">
        {busy ? "Creating…" : "Create Round"}
      </Button>
    </form>
  );
}

export default CreateCase;
