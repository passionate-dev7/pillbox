# Handoff: tools -> ui

Domain rewrite is done and committed. This documents the action-route body shapes for
`CaseProvider.tsx`'s `actions` object (`src/lib/webmcp/contracts.ts` `CaseActions`).

## POST /api/case body

```json
{ "patientLabel": "Dad", "patientAge": 78, "medications": [{ "generic": "warfarin", "dose": "5 mg", "schedule": "once daily, evening", "prescriber": "Dr. Alvarez" }] }
```

`DEMO_MEDICATIONS` in `src/lib/store/demo.ts` is the 11-medication, 4-prescriber seed for the
"Load the demo list (SIMULATED)" button.

## POST /api/case/:id/action body

Same envelope as the template: `{ type, key, payload }`.

| type | payload | role |
|---|---|---|
| `add_medication` | `{ generic, dose, schedule, prescriber }` | owner |
| `propose_change` | `{ kind: "hold"\|"dose"\|"time"\|"substitute"\|"stop"\|"add", medicationId?, reason, dose?, schedule?, generic?, prescriber? }` | partner |
| `accept_change` | `{ proposalId, decision?: "accept"\|"reject" }` (defaults to accept) | owner |
| `add_counsel_note` | `{ text }` | partner |
| `add_note` | `{ text }` | both |
| `report_side_effect` | `{ description, onset, severity, medicationId? }` | owner |
| `print_round_card` | `{}` | owner |

`propose_change` payload fields by kind: `dose` needs `dose`; `time` needs `schedule`;
`substitute`/`add` need `generic`, `dose`, `schedule`, `prescriber`; `hold`/`stop` need only
`medicationId`. Every kind except `add` requires `medicationId`.

`accept_change` applies the proposal per kind: `hold` -> medication status `held`; `dose`/`time`
-> field update; `substitute` -> old medication `stopped`, new one added `active`; `stop` ->
`stopped`; `add` -> new medication added `active`.

`CaseState.roundCards: RoundCard[]` (`{ at, medications }`) is new; render the latest entry for
print. `CaseState.counsel: TimelineEvent[]` is the pharmacist's counsel notes, also mirrored
into `notes[]` for the shared timeline.

## New route

`GET /api/drug?q=<substring>` -> `{ drugs: Drug[], count }`, proxies the data layer's
`findDrug`. For an autocomplete/search input on `add_medication` or `propose_change` forms.

## Declarative form

`report_side_effect` is the declarative tool now (`toolname="report_side_effect"`), replacing
`report_form`/`ReportForm.tsx`. Fields: `description`, `onset`, `severity`, optional
`medicationId`. Same "no toolautosubmit" pattern as the template's `ReportForm.tsx`.

## Status

Already picked up: the UI commit (`d9049cc`) already matches these shapes (CaseProvider,
SideEffectForm, home page demo button). This file is the reference in case anything drifts.
