import { createCase, stripKeys } from "@/lib/store";
import { checkRateLimit, clientIp } from "@/lib/store/ratelimit";
import { bodyTooLarge, tooLargeResponse, rateLimitedResponse, PRIVATE_NO_STORE } from "@/lib/http";
import type { CreateCaseMedicationInput } from "@/lib/types";

export const dynamic = "force-dynamic";

/** 60 case creations per minute per caller IP. There is no case id yet at this point, so this
 * route only has the IP axis to rate-limit on; per-case limiting starts at the action route. */
const CREATE_RATE_LIMIT = 60;
const CREATE_RATE_WINDOW_SECONDS = 60;

const PATIENT_LABEL_MAX = 40;
const MEDICATIONS_MAX = 40;
const GENERIC_MAX = 80;
const DOSE_MAX = 40;
const SCHEDULE_MAX = 80;
const PRESCRIBER_MAX = 80;

export async function POST(request: Request) {
  const ip = clientIp(request);
  const verdict = await checkRateLimit(`ip:${ip}:case-create`, CREATE_RATE_LIMIT, CREATE_RATE_WINDOW_SECONDS);
  if (!verdict.allowed) {
    return rateLimitedResponse(
      verdict.retryAfterSeconds,
      "Too many cases created from this address. Wait a moment and try again.",
    );
  }

  if (bodyTooLarge(request)) return tooLargeResponse();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const patientLabel = String(body.patientLabel ?? "").trim();
  const patientAge = Number(body.patientAge);
  const rawMedications = Array.isArray(body.medications) ? body.medications : [];

  if (!patientLabel) {
    return Response.json({ error: "Give the patient a label, e.g. \"Dad\". Never a real name." }, { status: 400 });
  }
  if (patientLabel.length > PATIENT_LABEL_MAX) {
    return Response.json(
      { error: `Patient label is ${patientLabel.length} characters, over the ${PATIENT_LABEL_MAX}-character limit.` },
      { status: 400 },
    );
  }
  if (!Number.isFinite(patientAge) || patientAge < 0 || patientAge > 130) {
    return Response.json({ error: "patientAge must be a number between 0 and 130." }, { status: 400 });
  }
  if (rawMedications.length > MEDICATIONS_MAX) {
    return Response.json(
      { error: `${rawMedications.length} medications is over the ${MEDICATIONS_MAX}-medication limit.` },
      { status: 400 },
    );
  }

  const medications: CreateCaseMedicationInput[] = [];
  for (const [i, raw] of rawMedications.entries()) {
    const m = raw as Record<string, unknown>;
    const generic = String(m.generic ?? "").trim();
    const dose = String(m.dose ?? "").trim();
    const schedule = String(m.schedule ?? "").trim();
    const prescriber = String(m.prescriber ?? "").trim();
    if (!generic || !dose || !schedule || !prescriber) {
      return Response.json(
        { error: `medications[${i}] needs generic, dose, schedule and prescriber.` },
        { status: 400 },
      );
    }
    if (generic.length > GENERIC_MAX || dose.length > DOSE_MAX || schedule.length > SCHEDULE_MAX || prescriber.length > PRESCRIBER_MAX) {
      return Response.json({ error: `medications[${i}] has a field over its length limit.` }, { status: 400 });
    }
    medications.push({ generic, dose, schedule, prescriber });
  }

  const caseState = await createCase({ patientLabel, patientAge, medications });

  // The one-time exception: the creator's own response carries both capability
  // keys and the two ready-to-share URLs. Every later read of this case (GET,
  // SSE, tool results) strips both keys.
  return Response.json(
    {
      case: stripKeys(caseState),
      ownerKey: caseState.ownerKey,
      partnerKey: caseState.partnerKey,
      ownerUrl: `/c/${caseState.id}?k=${caseState.ownerKey}`,
      partnerUrl: `/c/${caseState.id}?k=${caseState.partnerKey}`,
    },
    { status: 201, headers: PRIVATE_NO_STORE },
  );
}
