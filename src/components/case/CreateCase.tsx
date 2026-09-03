"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/**
 * The home page's plain form: title, plus the two free-text fields that seed the case (an
 * opening item and a note for whoever opens the partner link). Not a declarative WebMCP form —
 * `report_form` in the case view is this template's one worked example of that pattern. A fork
 * that wants case creation itself to be agent-fillable can give this the same `toolname` /
 * `toolparamdescription` treatment as `ReportForm.tsx`.
 */
export function CreateCase() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [firstItem, setFirstItem] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Give the case a title.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), firstItem: firstItem.trim(), note: note.trim() }),
      });
      const body = (await res.json()) as { ownerUrl?: string; error?: string };
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
    <form onSubmit={submit} className="border border-hair-strong bg-paper p-4">
      <h2 className="colhead">Start a case</h2>

      <label className="mt-3 block text-[0.8125rem] font-semibold">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Q3 renewal for Acme"
          className="mt-1 block w-full rounded-control border border-hair-strong bg-paper px-2.5 py-2 text-[0.9375rem] font-normal focus:border-accent"
        />
      </label>

      <label className="mt-3 block text-[0.8125rem] font-semibold">
        First item
        <input
          value={firstItem}
          onChange={(e) => setFirstItem(e.target.value)}
          placeholder="Confirm seat count before renewal"
          className="mt-1 block w-full rounded-control border border-hair-strong bg-paper px-2.5 py-2 text-[0.9375rem] font-normal focus:border-accent"
        />
      </label>

      <label className="mt-3 block text-[0.8125rem] font-semibold">
        Note for whoever you share this with
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Context the other person needs before they open this"
          className="mt-1 block w-full rounded-control border border-hair-strong bg-paper px-2.5 py-2 text-[0.9375rem] font-normal focus:border-accent"
        />
      </label>

      {error && (
        <p role="alert" className="mt-3 text-[0.8125rem] font-medium text-tier-unreliable">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={busy} className="mt-4 w-full">
        {busy ? "Creating…" : "Create case"}
      </Button>
    </form>
  );
}

export default CreateCase;
