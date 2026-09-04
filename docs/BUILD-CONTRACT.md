# Build contract: Pill Round

Three agents build in parallel on disjoint paths. This file is the interface between them.
Do not edit paths you do not own. If you need a change in another agent's path, write it in
`docs/HANDOFF-<yourrole>.md` and carry on with a local stub typed against this contract.

Product (from ../docs/NEXT-ENTRIES.md Entry B): caregiver (= owner) and pharmacist (= partner)
share one medication list for one patient. Caregiver's agent adds medications and flags
interactions, each flag carrying the verbatim FDA label sentence and set_id. Pharmacist's agent
proposes changes (hold, dose, time, substitute) and adds counsel notes. Only the caregiver accepts.
Side-effect report is a declarative form the human submits. Page carries openFDA's disclaimer and
"for discussion with a pharmacist", never "medical advice".

## Roles

`Role = "owner" | "partner"` stays as the type. UI copy: owner = **Caregiver**, partner = **Pharmacist**.

## Ownership

| Agent | Owns |
|---|---|
| data | `scripts/build-index.ts`, `data/**`, `src/lib/index/**` |
| tools | `src/lib/types.ts`, `src/lib/store/actions.ts`, `src/lib/store/index.ts` (createCase seed), `src/lib/webmcp/tools.ts`, `src/lib/webmcp/contracts.ts`, `src/lib/webmcp/*.test.ts`, `evals/**`, `src/app/api/**` |
| ui | `DESIGN.md`, `src/app/globals.css`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/components/**`, `README.md`, `public/**` |

## Data layer API (data agent exports from `src/lib/index/index.ts`)

```ts
export type SourceRef = { dataset: string; query: string; rows: number }; // re-export from @/lib/types

export type Drug = {
  generic: string;            // lowercase canonical, e.g. "warfarin"
  brands: string[];
  setId: string;              // label set_id used for the corpus
  labelUrl: string;           // https://api.fda.gov/drug/label.json?search=set_id:<setId>
  classes: string[];          // openfda.pharm_class_epc when present
  route?: string;
};

export type InteractionSentence = {
  setId: string;              // label the sentence came from
  labelDrug: string;          // generic whose label contains the sentence
  mentions: string[];         // generics (from the seed set) this sentence names, excluding labelDrug
  sentence: string;           // verbatim
  section: "drug_interactions" | "warnings" | "boxed_warning" | "contraindications";
};

export type GeriatricNote = { setId: string; generic: string; sentence: string };
export type Recall = { generic: string; productNdc?: string; reason: string; classification: string; recallInitiationDate: string; recallNumber: string; source: SourceRef };

export type InteractionFlag = {
  a: string; b: string;       // generics, sorted
  sentences: InteractionSentence[]; // >= 1
  severity: "boxed" | "contraindicated" | "warning" | "interaction";  // by section, boxed > contraindicated > warning > interaction
  source: SourceRef;          // query for the label that supplied the top sentence
};

export function findDrug(query: string): Drug[];                         // by generic or brand substring
export function getDrug(generic: string): Drug | null;
export function checkInteractions(generics: string[]): InteractionFlag[];   // every pair among the list with >= 1 sentence
export function duplicateTherapy(generics: string[]): { class: string; drugs: string[] }[];  // same pharm class twice
export function geriatricWarnings(generic: string): GeriatricNote[];
export function recallsFor(generic: string): Recall[];
export function labelSection(generic: string, section: string): { text: string; setId: string; source: SourceRef } | null;
export const INDEX_META: { builtAt: string; drugs: number; interactionSentences: number; geriatricSentences: number; recalls: number; sources: string[] };
```

Seed set: >= 60 common geriatric generics (statins, anticoagulants incl. warfarin + apixaban,
fluoroquinolones incl. ciprofloxacin, SSRIs, ACE inhibitors, ARBs, beta blockers, metformin,
levothyroxine, PPIs, opioids, benzodiazepines, amiodarone, digoxin, furosemide, potassium,
NSAIDs, clopidogrel, donepezil, gabapentin, trazodone, tamsulosin, allopurinol, prednisone,
sulfonylureas, insulin glargine, tramadol, acetaminophen, aspirin). One label per generic
(prefer the label with the longest drug_interactions text). Sentence-split drug_interactions,
warnings, boxed_warning, contraindications; keep sentences that mention >= 1 other seed generic
(brand names mapped to generics too). Target >= 200 interaction sentences. Every derived number
carries the openFDA URL. `data/index.json` committed, target < 3 MB. Must include:
`checkInteractions(["ciprofloxacin","warfarin"])` returns >= 1 sentence.

## Case state (tools agent, `src/lib/types.ts`)

```ts
export type Medication = { id: string; generic: string; brand?: string; dose: string; schedule: string; prescriber: string; by: Role; createdAt: string; status: "active" | "held" | "stopped" };
export type ChangeProposal = { id: string; by: "partner"; medicationId?: string; kind: "hold" | "dose" | "time" | "substitute" | "stop" | "add"; payload: Record<string, unknown>; reason: string; createdAt: string; status: "pending" | "accepted" | "rejected" };
export type SideEffectReport = { id: string; medicationId?: string; description: string; onset: string; severity: string; at: string };
export type CaseState = {
  id: string; title: string; createdAt: string;
  patientLabel: string; patientAge: number;          // "Dad", 78. No real names, no DOB.
  medications: Medication[]; proposals: ChangeProposal[]; counsel: TimelineEvent[]; reports: SideEffectReport[]; notes: TimelineEvent[];
  ownerKey: string; partnerKey: string; version: number;
};
export type CaseActionType = "add_medication" | "propose_change" | "accept_change" | "add_counsel_note" | "add_note" | "report_side_effect" | "print_round_card";
```

Server role gates: OWNER_ONLY = add_medication, accept_change (accept or reject), report_side_effect,
print_round_card. PARTNER_ONLY = propose_change, add_counsel_note. add_note both.
accept_change applies the proposal: hold -> status held; dose/time -> field update; substitute ->
old stopped + new added; stop -> stopped; add -> added.

`POST /api/case` body: `{ patientLabel, patientAge, medications: [{generic, dose, schedule, prescriber}] }`
(demo seed: 11 medications, four prescribers; UI agent's home page offers a "Load the demo list
(SIMULATED)" button).

## Tools (tools agent, `src/lib/webmcp/tools.ts`)

Caregiver (owner): list_medications (ro), add_medication (write, confirm), lookup_label_section (ro,
untrustedContentHint true), check_interactions (ro), check_duplicate_therapy (ro),
check_geriatric_warnings (ro, untrustedContentHint true), check_recalls (ro), accept_change (write,
confirm, accept|reject), share_with_pharmacist (ro), print_round_card (write, confirm; marks a
printable snapshot the UI renders), report_side_effect (declarative form in UI agent's
`SideEffectForm.tsx`, toolname `report_side_effect`, no toolautosubmit).
Pharmacist (partner): list_medications, lookup_label_section, check_interactions,
check_duplicate_therapy, check_geriatric_warnings, check_recalls, propose_change (write, confirm),
add_counsel_note (write, confirm), add_note.
Never for pharmacist: add_medication, accept_change, share_with_pharmacist, print_round_card,
report_side_effect. Never for caregiver: propose_change, add_counsel_note.

check_interactions with no args checks the current list; with `add: "ciprofloxacin"` checks the
list plus the new drug. Every flag returns the verbatim sentence, set_id, label URL.
Descriptions written for a model; dynamic where state helps.

Evals: >= 12 fixtures, including negatives (pharmacist cannot accept, caregiver cannot propose)
and "he started ciprofloxacin yesterday" -> check_interactions with add. `npx vitest run` green.

## UI (ui agent)

Panels: Medication list (11 rows, prescriber column, status chips; held rows struck), Flags (red
rows with verbatim sentence, set_id link, severity), Proposals (pharmacist proposes, caregiver
Accept/Reject buttons only for caregiver), Counsel notes, Side-effect form (declarative, human
Send), Round card (printable, `@media print`), Timeline, WebMCP tools panel (existing). Role
banner: "You are the caregiver" / "You are the pharmacist". Footer: openFDA disclaimer text
(data from openFDA, not an endorsement, not medical advice) and "for discussion with a pharmacist".

DESIGN.md: keep template structure; accent a clinical teal or deep green; semantic: boxed = out
(red), warning = watch (amber), ok = reliable. No shadows, hairlines, tabular numerals.
`uicraft gate` and `uicraft look` at 375 and 1440.

## Done means

`pnpm typecheck && pnpm lint && pnpm test` green, `pnpm build` green, commit on `main`.
