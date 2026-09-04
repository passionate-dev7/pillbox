import type { CaseActionType, CaseState, ChangeProposal, Role, TimelineEvent } from "@/lib/types";
import { getCase, putCase, StaleWriteError } from "./index";

export class RoleError extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = "RoleError";
  }
}

export class ActionError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ActionError";
    this.status = status;
  }
}

const OWNER_ONLY: CaseActionType[] = [
  "add_medication",
  "accept_change",
  "report_side_effect",
  "print_round_card",
];
const PARTNER_ONLY: CaseActionType[] = ["propose_change", "add_counsel_note"];

/**
 * Free-text ceilings. Crossing one is a 400 with the actual and allowed length in the message,
 * not a silent `.slice()` that drops the tail of what someone typed with no signal it happened.
 */
const GENERIC_MAX = 80;
const DOSE_MAX = 40;
const SCHEDULE_MAX = 80;
const PRESCRIBER_MAX = 80;
const NOTE_MAX = 500;
const COUNSEL_MAX = 500;
const REPORT_DESCRIPTION_MAX = 1000;
const REPORT_SEVERITY_MAX = 40;
const REPORT_ONSET_MAX = 80;
const PROPOSAL_REASON_MAX = 500;

function requireWithinLength(field: string, value: string, max: number): void {
  if (value.length > max) {
    throw new ActionError(
      `${field} is ${value.length} characters, over the ${max}-character limit. Shorten it and try again.`,
    );
  }
}

/**
 * `role` is never a client-supplied label. It is derived from which of the case's
 * two capability tokens (`ownerKey` / `partnerKey`) the caller presented. A key
 * that matches neither is not "partner by default" — it is not authenticated at
 * all, so the caller gets no role and every gated action 403s.
 */
export function roleForKey(caseState: CaseState, key: string): Role | null {
  if (!key) return null;
  if (key === caseState.ownerKey) return "owner";
  if (key === caseState.partnerKey) return "partner";
  return null;
}

export function assertRole(type: CaseActionType, role: Role): void {
  if (OWNER_ONLY.includes(type) && role !== "owner") {
    throw new RoleError(
      `Only the caregiver can ${type.replace(/_/g, " ")}. You are the pharmacist: propose a change instead and the caregiver confirms it.`,
    );
  }
  if (PARTNER_ONLY.includes(type) && role !== "partner") {
    throw new RoleError(
      `Only the pharmacist can ${type.replace(/_/g, " ")}. You are the caregiver: accept or reject the proposals you already have.`,
    );
  }
}

function event(by: Role | "system", kind: string, text: string): TimelineEvent {
  return { at: new Date().toISOString(), by, kind, text };
}

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

type Payload = Record<string, unknown>;

function findMedication(caseState: CaseState, medicationId: string) {
  const med = caseState.medications.find((m) => m.id === medicationId);
  if (!med) {
    throw new ActionError(
      `No medication with id "${medicationId}". Active medications: ${caseState.medications
        .filter((m) => m.status === "active")
        .map((m) => `${m.id} (${m.generic})`)
        .join(", ") || "none"}.`,
    );
  }
  return med;
}

function mutate(caseState: CaseState, type: CaseActionType, role: Role, payload: Payload): CaseState {
  const next: CaseState = {
    ...caseState,
    medications: [...caseState.medications],
    proposals: [...caseState.proposals],
    counsel: [...caseState.counsel],
    notes: [...caseState.notes],
    reports: [...caseState.reports],
    roundCards: [...caseState.roundCards],
    version: caseState.version + 1,
  };

  switch (type) {
    case "add_medication": {
      const generic = String(payload.generic ?? "").trim().toLowerCase();
      const dose = String(payload.dose ?? "").trim();
      const schedule = String(payload.schedule ?? "").trim();
      const prescriber = String(payload.prescriber ?? "").trim();
      if (!generic) throw new ActionError("add_medication needs a generic drug name.");
      if (!dose) throw new ActionError("add_medication needs a dose.");
      if (!schedule) throw new ActionError("add_medication needs a schedule.");
      if (!prescriber) throw new ActionError("add_medication needs the prescriber.");
      requireWithinLength("generic name", generic, GENERIC_MAX);
      requireWithinLength("dose", dose, DOSE_MAX);
      requireWithinLength("schedule", schedule, SCHEDULE_MAX);
      requireWithinLength("prescriber", prescriber, PRESCRIBER_MAX);
      next.medications.push({
        id: id("med"),
        generic,
        dose,
        schedule,
        prescriber,
        by: role,
        createdAt: new Date().toISOString(),
        status: "active",
      });
      next.notes.push(event(role, "add_medication", `${role} added ${generic} ${dose} (${prescriber})`));
      return next;
    }

    case "propose_change": {
      const kind = String(payload.kind ?? "");
      const allowedKinds = ["hold", "dose", "time", "substitute", "stop", "add"];
      if (!allowedKinds.includes(kind)) {
        throw new ActionError(`propose_change kind must be one of: ${allowedKinds.join(", ")}.`);
      }
      const reason = String(payload.reason ?? "").trim();
      if (!reason) throw new ActionError("propose_change needs a reason the caregiver can read.");
      requireWithinLength("reason", reason, PROPOSAL_REASON_MAX);
      const medicationId = payload.medicationId ? String(payload.medicationId) : undefined;
      if (kind !== "add" && !medicationId) {
        throw new ActionError(`propose_change kind "${kind}" needs a medicationId.`);
      }
      if (medicationId) findMedication(next, medicationId);
      const changePayload: Record<string, unknown> = {};
      if (kind === "dose") {
        const dose = String(payload.dose ?? "").trim();
        if (!dose) throw new ActionError('propose_change kind "dose" needs a payload.dose.');
        requireWithinLength("dose", dose, DOSE_MAX);
        changePayload.dose = dose;
      } else if (kind === "time") {
        const schedule = String(payload.schedule ?? "").trim();
        if (!schedule) throw new ActionError('propose_change kind "time" needs a payload.schedule.');
        requireWithinLength("schedule", schedule, SCHEDULE_MAX);
        changePayload.schedule = schedule;
      } else if (kind === "substitute" || kind === "add") {
        const generic = String(payload.generic ?? "").trim().toLowerCase();
        const dose = String(payload.dose ?? "").trim();
        const schedule = String(payload.schedule ?? "").trim();
        const prescriber = String(payload.prescriber ?? "").trim();
        if (!generic || !dose || !schedule || !prescriber) {
          throw new ActionError(
            `propose_change kind "${kind}" needs generic, dose, schedule and prescriber.`,
          );
        }
        requireWithinLength("generic name", generic, GENERIC_MAX);
        requireWithinLength("dose", dose, DOSE_MAX);
        requireWithinLength("schedule", schedule, SCHEDULE_MAX);
        requireWithinLength("prescriber", prescriber, PRESCRIBER_MAX);
        changePayload.generic = generic;
        changePayload.dose = dose;
        changePayload.schedule = schedule;
        changePayload.prescriber = prescriber;
      }
      const proposal: ChangeProposal = {
        id: id("p"),
        by: "partner",
        medicationId,
        kind: kind as ChangeProposal["kind"],
        payload: changePayload,
        reason,
        createdAt: new Date().toISOString(),
        status: "pending",
      };
      next.proposals.push(proposal);
      next.notes.push(event(role, "propose_change", `Pharmacist proposed ${kind}: ${reason}`));
      return next;
    }

    case "accept_change": {
      const proposalId = String(payload.proposalId ?? "");
      const decision = payload.decision === "reject" ? "reject" : "accept";
      const proposal = next.proposals.find((p) => p.id === proposalId);
      if (!proposal) {
        throw new ActionError(
          `No proposal with id "${proposalId}". Pending proposals: ${next.proposals.filter((p) => p.status === "pending").map((p) => p.id).join(", ") || "none"}.`,
        );
      }
      if (proposal.status !== "pending") {
        throw new ActionError(`Proposal ${proposalId} was already ${proposal.status}.`);
      }
      next.proposals = next.proposals.map((p) =>
        p.id === proposalId
          ? { ...p, status: decision === "accept" ? ("accepted" as const) : ("rejected" as const) }
          : p,
      );
      if (decision === "accept") {
        applyProposal(next, proposal);
        next.notes.push(event(role, "accept_change", `Caregiver accepted the ${proposal.kind} proposal: ${proposal.reason}`));
      } else {
        next.notes.push(event(role, "reject_change", `Caregiver rejected the ${proposal.kind} proposal: ${proposal.reason}`));
      }
      return next;
    }

    case "add_counsel_note": {
      const text = String(payload.text ?? "").trim();
      if (!text) throw new ActionError("A counsel note needs some text.");
      requireWithinLength("counsel note", text, COUNSEL_MAX);
      const counselNote = event(role, "counsel", text);
      next.counsel.push(counselNote);
      next.notes.push(counselNote);
      return next;
    }

    case "add_note": {
      const text = String(payload.text ?? "").trim();
      if (!text) throw new ActionError("A note needs some text.");
      requireWithinLength("note text", text, NOTE_MAX);
      next.notes.push(event(role, "note", text));
      return next;
    }

    case "report_side_effect": {
      const description = String(payload.description ?? "").trim();
      const onset = String(payload.onset ?? "").trim();
      const severity = String(payload.severity ?? "").trim();
      const medicationId = payload.medicationId ? String(payload.medicationId) : undefined;
      if (!description) throw new ActionError("A side-effect report needs a description.");
      if (!onset) throw new ActionError("A side-effect report needs an onset.");
      if (!severity) throw new ActionError("A side-effect report needs a severity.");
      requireWithinLength("description", description, REPORT_DESCRIPTION_MAX);
      requireWithinLength("onset", onset, REPORT_ONSET_MAX);
      requireWithinLength("severity", severity, REPORT_SEVERITY_MAX);
      if (medicationId) findMedication(next, medicationId);
      next.reports.push({
        id: id("rep"),
        medicationId,
        description,
        onset,
        severity,
        at: new Date().toISOString(),
      });
      next.notes.push(event(role, "report_side_effect", `Caregiver filed a side-effect report: ${description.slice(0, 60)}`));
      return next;
    }

    case "print_round_card": {
      next.roundCards.push({ at: new Date().toISOString(), medications: next.medications });
      next.notes.push(event(role, "print_round_card", "Caregiver printed a round card."));
      return next;
    }
  }
}

/**
 * Mutates `next` in place to apply an accepted proposal's effect, per the kind:
 * hold -> status held; dose/time -> field update; substitute -> old stopped + new added;
 * stop -> stopped; add -> added.
 */
function applyProposal(next: CaseState, proposal: ChangeProposal): void {
  switch (proposal.kind) {
    case "hold": {
      const medicationId = proposal.medicationId!;
      next.medications = next.medications.map((m) =>
        m.id === medicationId ? { ...m, status: "held" as const } : m,
      );
      return;
    }
    case "dose": {
      const medicationId = proposal.medicationId!;
      const dose = String(proposal.payload.dose ?? "");
      next.medications = next.medications.map((m) => (m.id === medicationId ? { ...m, dose } : m));
      return;
    }
    case "time": {
      const medicationId = proposal.medicationId!;
      const schedule = String(proposal.payload.schedule ?? "");
      next.medications = next.medications.map((m) => (m.id === medicationId ? { ...m, schedule } : m));
      return;
    }
    case "substitute": {
      const medicationId = proposal.medicationId!;
      next.medications = next.medications.map((m) =>
        m.id === medicationId ? { ...m, status: "stopped" as const } : m,
      );
      next.medications.push({
        id: id("med"),
        generic: String(proposal.payload.generic ?? ""),
        dose: String(proposal.payload.dose ?? ""),
        schedule: String(proposal.payload.schedule ?? ""),
        prescriber: String(proposal.payload.prescriber ?? ""),
        by: "partner",
        createdAt: new Date().toISOString(),
        status: "active",
      });
      return;
    }
    case "stop": {
      const medicationId = proposal.medicationId!;
      next.medications = next.medications.map((m) =>
        m.id === medicationId ? { ...m, status: "stopped" as const } : m,
      );
      return;
    }
    case "add": {
      next.medications.push({
        id: id("med"),
        generic: String(proposal.payload.generic ?? ""),
        dose: String(proposal.payload.dose ?? ""),
        schedule: String(proposal.payload.schedule ?? ""),
        prescriber: String(proposal.payload.prescriber ?? ""),
        by: "partner",
        createdAt: new Date().toISOString(),
        status: "active",
      });
      return;
    }
  }
}

/**
 * Apply one action with optimistic-concurrency retry. `key` is the capability
 * token from the caller's link; role is derived from it here, never taken from
 * the request body. A key that matches neither `ownerKey` nor `partnerKey`
 * 403s before any mutation runs.
 */
export async function applyAction(
  caseId: string,
  type: CaseActionType,
  key: string,
  payload: Payload = {},
): Promise<CaseState> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    const caseState = await getCase(caseId);
    if (!caseState) throw new ActionError(`No case with id "${caseId}".`, 404);
    const role = roleForKey(caseState, key);
    if (!role) {
      throw new RoleError(
        "This link's key does not match this case. Use the caregiver or pharmacist URL exactly as it was shared; a guessed or edited key is not a valid credential.",
      );
    }
    assertRole(type, role);
    const next = mutate(caseState, type, role, payload);
    try {
      return await putCase(next);
    } catch (err) {
      if (err instanceof StaleWriteError) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  // Every attempt hit a real write conflict (someone else's write won the race each time), not
  // a bug in this request: that is a 409, an agent can re-`get_case` and retry, not a 500 that
  // reads like the server is broken.
  const message =
    lastError instanceof Error
      ? lastError.message
      : "Could not write the case after 4 attempts: another write kept winning the race.";
  throw new ActionError(message, 409);
}
