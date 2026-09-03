import { randomBytes } from "node:crypto";
import type { CaseState, CreateCaseInput, TimelineEvent } from "@/lib/types";
import { backend, type BackendName } from "./backend";
import { spotlight } from "@/lib/spotlight";

export class StaleWriteError extends Error {
  constructor(
    readonly id: string,
    readonly stored: number,
    readonly attempted: number,
  ) {
    super(
      `Case ${id} was modified by someone else: the store holds version ${stored}, ` +
        `this write is based on version ${attempted - 1}. Re-read the case and retry.`,
    );
    this.name = "StaleWriteError";
  }
}

export function storeBackendName(): BackendName {
  return backend().name;
}

export function storeBackendDetail(): string {
  const b = backend();
  return `${b.name}: ${b.detail}`;
}

export async function getCase(id: string): Promise<CaseState | null> {
  if (!id || !/^[A-Za-z0-9_-]{4,64}$/.test(id)) return null;
  return backend().read(id);
}

/**
 * Optimistic write. `caseState.version` must be exactly one higher than the stored
 * version (or the case must not exist yet and arrive at version 1).
 */
export async function putCase(caseState: CaseState): Promise<CaseState> {
  const existing = await getCase(caseState.id);
  const storedVersion = existing?.version ?? 0;
  if (caseState.version !== storedVersion + 1) {
    throw new StaleWriteError(caseState.id, storedVersion, caseState.version);
  }
  const won = await backend().write(caseState);
  if (!won) {
    throw new StaleWriteError(caseState.id, caseState.version, caseState.version);
  }
  return caseState;
}

export function newCaseId(): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * A per-link capability token, unguessable and unrelated to the case id (which is
 * visible in both the owner and partner URL and is not a secret). `role` is
 * derived from which of these a caller presents; see `src/lib/store/actions.ts`.
 */
export function newCapabilityKey(): string {
  return randomBytes(18).toString("base64url");
}

/** Strip both capability keys before a case is ever serialised to GET, SSE, or a tool result. */
export function stripKeys(caseState: CaseState): CaseState {
  return { ...caseState, ownerKey: "", partnerKey: "" };
}

/**
 * `stripKeys` plus the same spotlighting the `get_case` WebMCP tool applies to free text
 * (`src/lib/webmcp/tools.ts`): notes[].text, reports[].description and proposals[].reason are
 * wrapped in `<untrusted-user-text>` before this case leaves the server. Used by the plain REST
 * reads (`GET /api/case/:id`, the SSE stream) so a caller that talks to this origin over `fetch`
 * instead of `document.modelContext` gets the identical untrusted-content boundary a tool call
 * would have shown it, not the tool's markup stripped bare. Human-facing surfaces (the case page
 * itself, the one-time `POST /api/case` response) use plain `stripKeys` instead, since a person
 * reading their own page should not see the delimiter markup.
 */
export function stripKeysAndSpotlight(caseState: CaseState): CaseState {
  const stripped = stripKeys(caseState);
  return {
    ...stripped,
    notes: stripped.notes.map((n) => ({ ...n, text: spotlight(n.text) })),
    reports: stripped.reports.map((r) => ({ ...r, description: spotlight(r.description) })),
    proposals: stripped.proposals.map((p) => ({ ...p, reason: spotlight(p.reason) })),
  };
}

export async function createCase(args: CreateCaseInput): Promise<CaseState> {
  const now = new Date().toISOString();
  const events: TimelineEvent[] = [
    { at: now, by: "system", kind: "case_created", text: `Case created: ${args.title}.` },
  ];
  if (args.note.trim()) {
    events.push({ at: now, by: "owner", kind: "note", text: args.note.trim() });
  }
  const caseState: CaseState = {
    id: newCaseId(),
    title: args.title,
    createdAt: now,
    items: args.firstItem.trim()
      ? [{ id: `item_${Math.random().toString(36).slice(2, 10)}`, text: args.firstItem.trim(), by: "owner", createdAt: now }]
      : [],
    proposals: [],
    notes: events,
    reports: [],
    ownerKey: newCapabilityKey(),
    partnerKey: newCapabilityKey(),
    version: 1,
  };
  return putCase(caseState);
}

export async function listCaseIds(): Promise<string[]> {
  return backend().listIds();
}
