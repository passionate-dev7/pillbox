/**
 * Role-as-capability, tested against the real store (in-memory backend, no env vars set) and
 * the actual API route handlers, so a regression here fails a test, not just a judge's curl.
 */
import { describe, expect, it, vi } from "vitest";

// `putCase` is programmable so the retry-exhaustion test can force every attempt in
// `applyAction`'s loop to collide, deterministically, without racing real concurrent writes.
// Defaults to the real implementation; only the one test below overrides it, and restores it
// immediately after.
const { putCaseMock } = vi.hoisted(() => ({ putCaseMock: vi.fn() }));
vi.mock("@/lib/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/store")>();
  putCaseMock.mockImplementation(actual.putCase);
  return { ...actual, putCase: putCaseMock };
});

import { createCase, getCase as storeGetCase, StaleWriteError } from "@/lib/store";
import { applyAction, assertRole, RoleError } from "@/lib/store/actions";
import type { CaseState } from "@/lib/types";
import { GET as getCaseRoute } from "@/app/api/case/[id]/route";
import { GET as streamRoute } from "@/app/api/case/[id]/stream/route";
import { listMedications as listMedicationsToolFactory } from "@/lib/webmcp/tools";

async function buildCase(): Promise<CaseState> {
  return createCase({
    patientLabel: "Dad",
    patientAge: 78,
    medications: [
      { generic: "warfarin", dose: "5 mg", schedule: "once daily, evening", prescriber: "Dr. Alvarez" },
    ],
  });
}

describe("role is derived from the capability key, never a self-declared label", () => {
  it("missing key: 403", async () => {
    const caseState = await buildCase();
    await expect(
      applyAction(caseState.id, "add_medication", "", {
        generic: "x",
        dose: "1 mg",
        schedule: "daily",
        prescriber: "Dr. X",
      }),
    ).rejects.toBeInstanceOf(RoleError);
  });

  it("a guessed key that matches neither capability: 403", async () => {
    const caseState = await buildCase();
    await expect(
      applyAction(caseState.id, "add_medication", "totally-guessed-key", {
        generic: "x",
        dose: "1 mg",
        schedule: "daily",
        prescriber: "Dr. X",
      }),
    ).rejects.toBeInstanceOf(RoleError);
  });

  it("partner key cannot add_medication, accept_change or report_side_effect", async () => {
    const caseState = await buildCase();
    await expect(
      applyAction(caseState.id, "add_medication", caseState.partnerKey, {
        generic: "x",
        dose: "1 mg",
        schedule: "daily",
        prescriber: "Dr. X",
      }),
    ).rejects.toBeInstanceOf(RoleError);
    await expect(
      applyAction(caseState.id, "accept_change", caseState.partnerKey, { proposalId: "p_nope" }),
    ).rejects.toBeInstanceOf(RoleError);
    await expect(
      applyAction(caseState.id, "report_side_effect", caseState.partnerKey, {
        description: "d",
        onset: "today",
        severity: "mild",
      }),
    ).rejects.toBeInstanceOf(RoleError);
  });

  it("owner key cannot propose_change or add_counsel_note", async () => {
    const caseState = await buildCase();
    const medicationId = caseState.medications[0].id;
    await expect(
      applyAction(caseState.id, "propose_change", caseState.ownerKey, {
        kind: "hold",
        medicationId,
        reason: "y",
      }),
    ).rejects.toBeInstanceOf(RoleError);
    await expect(
      applyAction(caseState.id, "add_counsel_note", caseState.ownerKey, { text: "y" }),
    ).rejects.toBeInstanceOf(RoleError);
  });

  it("assertRole throws RoleError for every OWNER_ONLY type given role partner, and every PARTNER_ONLY type given role owner", () => {
    for (const type of ["add_medication", "accept_change", "report_side_effect", "print_round_card"] as const) {
      expect(() => assertRole(type, "partner")).toThrow(RoleError);
    }
    for (const type of ["propose_change", "add_counsel_note"] as const) {
      expect(() => assertRole(type, "owner")).toThrow(RoleError);
    }
  });

  it("the owner key legitimately adds a medication; the partner key legitimately proposes a change", async () => {
    const caseState = await buildCase();
    const added = await applyAction(caseState.id, "add_medication", caseState.ownerKey, {
      generic: "lisinopril",
      dose: "10 mg",
      schedule: "once daily",
      prescriber: "Dr. Chen",
    });
    expect(added.medications).toHaveLength(2);

    const medicationId = added.medications[0].id;
    const proposed = await applyAction(caseState.id, "propose_change", caseState.partnerKey, {
      kind: "hold",
      medicationId,
      reason: "INR is elevated",
    });
    expect(proposed.proposals).toHaveLength(1);
    expect(proposed.proposals[0].by).toBe("partner");
    expect(proposed.proposals[0].status).toBe("pending");
    expect(proposed.proposals[0].kind).toBe("hold");
  });

  it("owner accepting a hold proposal marks the medication held and the proposal accepted", async () => {
    let caseState = await buildCase();
    const medicationId = caseState.medications[0].id;
    caseState = await applyAction(caseState.id, "propose_change", caseState.partnerKey, {
      kind: "hold",
      medicationId,
      reason: "INR is elevated",
    });
    const proposalId = caseState.proposals[0].id;
    const accepted = await applyAction(caseState.id, "accept_change", caseState.ownerKey, { proposalId });
    expect(accepted.proposals[0].status).toBe("accepted");
    expect(accepted.medications.find((m) => m.id === medicationId)!.status).toBe("held");
  });

  it("owner accepting a substitute proposal stops the old medication and adds the new one", async () => {
    let caseState = await buildCase();
    const medicationId = caseState.medications[0].id;
    caseState = await applyAction(caseState.id, "propose_change", caseState.partnerKey, {
      kind: "substitute",
      medicationId,
      reason: "switch to apixaban, easier monitoring",
      generic: "apixaban",
      dose: "5 mg",
      schedule: "twice daily",
      prescriber: "Dr. Alvarez",
    });
    const proposalId = caseState.proposals[0].id;
    const accepted = await applyAction(caseState.id, "accept_change", caseState.ownerKey, { proposalId });
    expect(accepted.medications.find((m) => m.id === medicationId)!.status).toBe("stopped");
    expect(accepted.medications.some((m) => m.generic === "apixaban" && m.status === "active")).toBe(true);
  });

  it("owner rejecting a pending proposal never changes any medication", async () => {
    let caseState = await buildCase();
    const medicationId = caseState.medications[0].id;
    caseState = await applyAction(caseState.id, "propose_change", caseState.partnerKey, {
      kind: "hold",
      medicationId,
      reason: "not needed",
    });
    const proposalId = caseState.proposals[0].id;
    const rejected = await applyAction(caseState.id, "accept_change", caseState.ownerKey, {
      proposalId,
      decision: "reject",
    });
    expect(rejected.proposals[0].status).toBe("rejected");
    expect(rejected.medications.find((m) => m.id === medicationId)!.status).toBe("active");
  });
});

describe("both capability keys are stripped from every unauthenticated or model-facing read", () => {
  it("GET /api/case/[id] never contains either key's actual value", async () => {
    const caseState = await buildCase();
    const res = await getCaseRoute(new Request(`http://test/api/case/${caseState.id}`), {
      params: Promise.resolve({ id: caseState.id }),
    } as never);
    const body = (await res.json()) as { case: CaseState };
    const raw = JSON.stringify(body);
    expect(raw).not.toContain(caseState.ownerKey);
    expect(raw).not.toContain(caseState.partnerKey);
    expect(body.case.ownerKey).toBe("");
    expect(body.case.partnerKey).toBe("");
  });

  it("the case SSE stream's first frame never contains either key's actual value", async () => {
    const caseState = await buildCase();
    const controller = new AbortController();
    const req = new Request(`http://test/api/case/${caseState.id}/stream`, { signal: controller.signal });
    const res = await streamRoute(req, { params: Promise.resolve({ id: caseState.id }) } as never);
    const reader = res.body!.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    expect(text).toContain("event: case");
    expect(text).not.toContain(caseState.ownerKey);
    expect(text).not.toContain(caseState.partnerKey);
    controller.abort();
    await reader.cancel().catch(() => undefined);
  });

  it("the list_medications tool result never contains either key's actual value", async () => {
    const caseState = await buildCase();
    const stored = await storeGetCase(caseState.id);
    const toolDef = listMedicationsToolFactory({
      role: "owner",
      caseState: stored,
      actions: {} as never,
      confirm: async () => undefined,
      origin: "http://test",
    });
    const result = await toolDef.execute({});
    const raw = JSON.stringify(result);
    expect(raw).not.toContain(caseState.ownerKey);
    expect(raw).not.toContain(caseState.partnerKey);
  });
});

describe("free text over its length ceiling is rejected with 400, never silently truncated", () => {
  it("a note over 500 characters: 400 with the actual and allowed length, nothing stored", async () => {
    const caseState = await buildCase();
    const text = "A".repeat(612);
    await expect(
      applyAction(caseState.id, "add_note", caseState.ownerKey, { text }),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("612") });
    const after = await storeGetCase(caseState.id);
    expect(after!.notes.some((n) => n.text.startsWith("AAAA"))).toBe(false);
  });

  it("a note at exactly 500 characters is accepted, in full, not truncated further", async () => {
    const caseState = await buildCase();
    const text = "B".repeat(500);
    const after = await applyAction(caseState.id, "add_note", caseState.ownerKey, { text });
    expect(after.notes.at(-1)!.text).toBe(text);
    expect(after.notes.at(-1)!.text).toHaveLength(500);
  });

  it("a side-effect description over 1000 characters: 400, nothing stored", async () => {
    const caseState = await buildCase();
    const description = "C".repeat(1200);
    await expect(
      applyAction(caseState.id, "report_side_effect", caseState.ownerKey, {
        description,
        onset: "today",
        severity: "mild",
      }),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("1200") });
    const after = await storeGetCase(caseState.id);
    expect(after!.reports).toHaveLength(0);
  });

  it("a propose_change reason over 500 characters: 400", async () => {
    const caseState = await buildCase();
    const medicationId = caseState.medications[0].id;
    await expect(
      applyAction(caseState.id, "propose_change", caseState.partnerKey, {
        kind: "hold",
        medicationId,
        reason: "D".repeat(501),
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("a side-effect severity over 40 characters: 400", async () => {
    const caseState = await buildCase();
    await expect(
      applyAction(caseState.id, "report_side_effect", caseState.ownerKey, {
        description: "too long a severity",
        onset: "today",
        severity: "E".repeat(60),
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("status codes an agent can act on: 404 for an unknown case, 409 for retry exhaustion", () => {
  it("POST .../action against an unknown case id: 404, not 400", async () => {
    await expect(
      applyAction("does-not-exist-at-all", "add_note", "some-key", { text: "x" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("every optimistic-concurrency retry colliding: 409, not 500", async () => {
    const caseState = await buildCase();
    putCaseMock.mockRejectedValue(new StaleWriteError(caseState.id, caseState.version, caseState.version + 1));
    try {
      await expect(
        applyAction(caseState.id, "add_note", caseState.ownerKey, { text: "x" }),
      ).rejects.toMatchObject({ status: 409, name: "ActionError" });
    } finally {
      // Restore the passthrough so every later test in this file writes for real.
      const actual = await vi.importActual<typeof import("@/lib/store")>("@/lib/store");
      putCaseMock.mockImplementation(actual.putCase);
    }
  });
});

describe("GET /api/case/[id] and the SSE stream spotlight free text the same way list_medications does", () => {
  it("GET wraps notes[].text, counsel[].text, reports[].description and proposals[].reason", async () => {
    let caseState = await buildCase();
    const medicationId = caseState.medications[0].id;
    caseState = await applyAction(caseState.id, "add_note", caseState.ownerKey, { text: "call me when you land" });
    caseState = await applyAction(caseState.id, "report_side_effect", caseState.ownerKey, {
      description: "he felt dizzy this morning",
      onset: "this morning",
      severity: "mild",
    });
    caseState = await applyAction(caseState.id, "propose_change", caseState.partnerKey, {
      kind: "hold",
      medicationId,
      reason: "they need to check his INR",
    });
    caseState = await applyAction(caseState.id, "add_counsel_note", caseState.partnerKey, {
      text: "take with food to reduce nausea",
    });

    const res = await getCaseRoute(new Request(`http://test/api/case/${caseState.id}`), {
      params: Promise.resolve({ id: caseState.id }),
    } as never);
    const body = (await res.json()) as { case: CaseState };
    const humanNote = body.case.notes.find((n) => n.kind === "note")!;
    expect(humanNote.text).toBe("<untrusted-user-text>call me when you land</untrusted-user-text>");
    expect(body.case.reports[0]!.description).toBe(
      "<untrusted-user-text>he felt dizzy this morning</untrusted-user-text>",
    );
    expect(body.case.proposals[0]!.reason).toBe(
      "<untrusted-user-text>they need to check his INR</untrusted-user-text>",
    );
    expect(body.case.counsel[0]!.text).toBe(
      "<untrusted-user-text>take with food to reduce nausea</untrusted-user-text>",
    );
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("the SSE stream's case frame carries the same spotlighted text", async () => {
    let caseState = await buildCase();
    caseState = await applyAction(caseState.id, "add_note", caseState.ownerKey, { text: "spotlight me over sse" });
    const controller = new AbortController();
    const req = new Request(`http://test/api/case/${caseState.id}/stream`, { signal: controller.signal });
    const res = await streamRoute(req, { params: Promise.resolve({ id: caseState.id }) } as never);
    const reader = res.body!.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    expect(text).toContain("<untrusted-user-text>spotlight me over sse</untrusted-user-text>");
    controller.abort();
    await reader.cancel().catch(() => undefined);
  });

  it("GET /api/case/[id] on an unknown case is still private, no-store", async () => {
    const res = await getCaseRoute(new Request("http://test/api/case/does-not-exist"), {
      params: Promise.resolve({ id: "does-not-exist" }),
    } as never);
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
});

describe("print_round_card stores a snapshot on the case", () => {
  it("owner printing a round card stores medications[] at the time of printing", async () => {
    const caseState = await buildCase();
    const after = await applyAction(caseState.id, "print_round_card", caseState.ownerKey, {});
    expect(after.roundCards).toHaveLength(1);
    expect(after.roundCards[0].medications).toHaveLength(1);
    expect(after.roundCards[0].medications[0].generic).toBe("warfarin");
  });
});
