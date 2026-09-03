import type { CaseActionType, CaseState, Proposal, Role, TimelineEvent } from "@/lib/types";
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

const OWNER_ONLY: CaseActionType[] = ["add_item", "accept_change", "report"];
const PARTNER_ONLY: CaseActionType[] = ["propose_change"];

/**
 * Free-text ceilings. Crossing one is a 400 with the actual and allowed length in the message,
 * not a silent `.slice()` that drops the tail of what someone typed with no signal it happened.
 */
const ITEM_MAX = 200;
const NOTE_MAX = 500;
const REPORT_DESCRIPTION_MAX = 1000;
const REPORT_SUBJECT_MAX = 120;
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
      `Only the owner can ${type.replace(/_/g, " ")}. You are the partner: propose a change instead and the owner confirms it.`,
    );
  }
  if (PARTNER_ONLY.includes(type) && role !== "partner") {
    throw new RoleError(
      `Only the partner can ${type.replace(/_/g, " ")}. You are the owner: accept or reject the proposals you already have.`,
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

function mutate(caseState: CaseState, type: CaseActionType, role: Role, payload: Payload): CaseState {
  const next: CaseState = {
    ...caseState,
    items: [...caseState.items],
    proposals: [...caseState.proposals],
    notes: [...caseState.notes],
    reports: [...caseState.reports],
    version: caseState.version + 1,
  };

  switch (type) {
    case "add_item": {
      const text = String(payload.text ?? "").trim();
      if (!text) throw new ActionError("add_item needs some text.");
      requireWithinLength("item text", text, ITEM_MAX);
      next.items.push({ id: id("item"), text, by: role, createdAt: new Date().toISOString() });
      next.notes.push(event(role, "add_item", `${role} added: ${text}`));
      return next;
    }

    case "propose_change": {
      const text = String(payload.text ?? "").trim();
      if (!text) throw new ActionError("propose_change needs the text of the change you are proposing.");
      requireWithinLength("proposed text", text, ITEM_MAX);
      const reason = String(payload.reason ?? "").trim();
      if (!reason) throw new ActionError("propose_change needs a reason the owner can read.");
      requireWithinLength("reason", reason, PROPOSAL_REASON_MAX);
      const proposal: Proposal = {
        id: id("p"),
        by: "partner",
        payload: { text },
        reason,
        createdAt: new Date().toISOString(),
        status: "pending",
      };
      next.proposals.push(proposal);
      next.notes.push(event(role, "propose_change", `Partner proposed: ${text} (${reason})`));
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
        const text = String(proposal.payload.text ?? "").trim();
        if (text) {
          next.items.push({ id: id("item"), text, by: "partner", createdAt: new Date().toISOString() });
        }
        next.notes.push(event(role, "accept_change", `Owner accepted the proposal: ${proposal.reason}`));
      } else {
        next.notes.push(event(role, "reject_change", `Owner rejected the proposal: ${proposal.reason}`));
      }
      return next;
    }

    case "add_note": {
      const text = String(payload.text ?? "").trim();
      if (!text) throw new ActionError("A note needs some text.");
      requireWithinLength("note text", text, NOTE_MAX);
      next.notes.push(event(role, "note", text));
      return next;
    }

    case "report": {
      const subject = String(payload.subject ?? "").trim();
      const description = String(payload.description ?? "").trim();
      if (!subject) throw new ActionError("A report needs a subject line.");
      if (!description) throw new ActionError("A report needs a description.");
      requireWithinLength("subject", subject, REPORT_SUBJECT_MAX);
      requireWithinLength("description", description, REPORT_DESCRIPTION_MAX);
      next.reports.push({ id: id("rep"), subject, description, at: new Date().toISOString() });
      next.notes.push(event(role, "report", `Owner filed a report: ${subject}`));
      return next;
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
        "This link's key does not match this case. Use the owner or partner URL exactly as it was shared; a guessed or edited key is not a valid credential.",
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
