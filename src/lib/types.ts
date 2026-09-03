/**
 * The whole domain model for the two-agent spine: a Case shared by two roles, an owner and
 * a partner, who each get a different WebMCP tool set on the same page. Swap this file's
 * shape (and src/lib/store/actions.ts's mutations) for your own domain; everything in
 * src/lib/webmcp and src/lib/store/backend.ts is domain-agnostic and does not change.
 */
export type Role = "owner" | "partner";

/** A source citation. Placeholder here (`dataset: "case-store"`); point it at your real
 *  data source once this is forked into a real domain, the same shape either way. */
export type SourceRef = { dataset: string; query: string; rows: number };

export type CaseItem = {
  id: string;
  text: string;
  by: Role;
  createdAt: string;
};

export type Proposal = {
  id: string;
  by: "partner";
  /** Opaque to the store: `mutate()` never inspects its shape beyond `payload.text`, which
   *  is the one convention this template ships (see accept_change in store/actions.ts).
   *  A real domain fork can carry a structured object here instead of free text. */
  payload: Record<string, unknown>;
  reason: string;
  createdAt: string;
  status: "pending" | "accepted" | "rejected";
};

export type TimelineEvent = {
  at: string;
  by: Role | "system";
  kind: string;
  text: string;
};

export type CaseReport = {
  id: string;
  subject: string;
  description: string;
  at: string;
};

export type CaseState = {
  id: string;
  title: string;
  createdAt: string;
  items: CaseItem[];
  proposals: Proposal[];
  notes: TimelineEvent[];
  reports: CaseReport[];
  /**
   * Per-link capability tokens minted at creation. `role` is derived from which of these a
   * caller presents; it is never trusted as a self-declared label. Stripped from every
   * serialised case (GET, SSE, tool results) except the one-time POST /api/case response,
   * which hands both to the creator.
   */
  ownerKey: string;
  partnerKey: string;
  version: number;
};

export type CaseActionType =
  | "add_item"
  | "propose_change"
  | "accept_change"
  | "add_note"
  | "report";

export type CaseAction = {
  type: CaseActionType;
  /** The capability token from the caller's link. Role is derived from this, never trusted as a label. */
  key: string;
  payload?: Record<string, unknown>;
};

export type CreateCaseInput = {
  title: string;
  /** Seeds the case's first item, attributed to the owner. */
  firstItem: string;
  /** Seeds the case's first timeline note, e.g. context for the partner. */
  note: string;
};
