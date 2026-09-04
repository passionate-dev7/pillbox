/**
 * Domain model for Pill Round: a caregiver (owner) and a pharmacist (partner) share one
 * medication list for one patient. Everything in src/lib/webmcp and src/lib/store/backend.ts
 * outside this file and src/lib/store/actions.ts stays domain-agnostic.
 */
export type Role = "owner" | "partner";

/** A source citation: which dataset, what query, how many rows it returned. */
export type SourceRef = { dataset: string; query: string; rows: number };

export type MedicationStatus = "active" | "held" | "stopped";

export type Medication = {
  id: string;
  generic: string;
  brand?: string;
  dose: string;
  schedule: string;
  prescriber: string;
  by: Role;
  createdAt: string;
  status: MedicationStatus;
};

export type ChangeKind = "hold" | "dose" | "time" | "substitute" | "stop" | "add";

export type ChangeProposal = {
  id: string;
  by: "partner";
  medicationId?: string;
  kind: ChangeKind;
  /** Opaque to the store beyond the fields `accept_change` reads for each `kind` (see
   *  src/lib/store/actions.ts): `dose`/`schedule` for kind "dose"/"time", `generic`/`brand`/
   *  `dose`/`schedule`/`prescriber` for kind "substitute"/"add". */
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

export type SideEffectReport = {
  id: string;
  medicationId?: string;
  description: string;
  onset: string;
  severity: string;
  at: string;
};

export type RoundCard = {
  at: string;
  medications: Medication[];
};

export type CaseState = {
  id: string;
  title: string;
  createdAt: string;
  /** "Dad", 78. No real patient names, no dates of birth, anywhere. */
  patientLabel: string;
  patientAge: number;
  medications: Medication[];
  proposals: ChangeProposal[];
  counsel: TimelineEvent[];
  reports: SideEffectReport[];
  notes: TimelineEvent[];
  roundCards: RoundCard[];
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
  | "add_medication"
  | "propose_change"
  | "accept_change"
  | "add_counsel_note"
  | "add_note"
  | "report_side_effect"
  | "print_round_card";

export type CaseAction = {
  type: CaseActionType;
  /** The capability token from the caller's link. Role is derived from this, never trusted as a label. */
  key: string;
  payload?: Record<string, unknown>;
};

export type CreateCaseMedicationInput = {
  generic: string;
  dose: string;
  schedule: string;
  prescriber: string;
};

export type CreateCaseInput = {
  patientLabel: string;
  patientAge: number;
  medications: CreateCaseMedicationInput[];
};
