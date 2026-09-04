# Pillbox

A daughter in Denver manages her father's eleven prescriptions from four prescribers off one
hand-written grid on the fridge. She is not a pharmacist. Neither is he. Every refill, every new
specialist, every "the cardiologist added something" is another line on that grid, with no one
checking whether the new pill fights the old ones.

Before: she opens eleven label PDFs, or an interaction checker that says "moderate" without saying
why, then phones the pharmacy and waits. After: one `check_interactions` call with
`add: "ciprofloxacin"` returns every flagged pair with the verbatim label sentence and its
`set_id`, before the drug is on the list, and the pharmacist's proposal and her acceptance happen
on the same page with the label text in front of both of them. Estimate, not measured.

Pillbox is a shared medication round card for exactly that situation: one patient, a
caregiver, and a pharmacist, each opening the same round from a different link, each getting a
different set of WebMCP tools on the same page. The caregiver's agent can add medications and
check them against openFDA label data; the pharmacist's agent can propose a hold, a dose change,
or a substitution and leave counsel notes. Only the caregiver accepts a change. The server, not
the browser tab, enforces that split.

## The two-role capability-key model

There is no login. Starting a round mints two long random tokens, an `ownerKey` (caregiver) and
a `partnerKey` (pharmacist). The URL a person opens with (`?k=...`) is the only thing that
determines their role: the server looks up which key matches and derives the role from that,
never from a query param or anything the client asserts. A guessed or edited key matches neither
token and gets no role at all, not "pharmacist by default."

Every server route re-checks this independently (`src/lib/store/actions.ts`, `roleForKey` +
`assertRole`), so even if a WebMCP tool were somehow reachable from the wrong session, the
mutation still 403s. The client-side tool list is a UX nicety, not the security boundary.

## Two sessions, two tool sets

| Tool | Caregiver | Pharmacist | Kind |
|---|---|---|---|
| `list_medications` | yes | yes | read |
| `lookup_label_section` | yes | yes | read, untrusted content |
| `check_interactions` | yes | yes | read |
| `check_duplicate_therapy` | yes | yes | read |
| `check_geriatric_warnings` | yes | yes | read, untrusted content |
| `check_recalls` | yes | yes | read |
| `add_medication` | yes | no | write, confirm |
| `accept_change` (accept or reject) | yes | no | write, confirm |
| `share_with_pharmacist` | yes | no | read |
| `print_round_card` | yes | no | write, confirm |
| `report_side_effect` | yes (declarative form) | no | write, human-submitted |
| `propose_change` | no | yes | write, confirm |
| `add_counsel_note` | no | yes | write, confirm |
| `add_note` | yes | yes | write, confirm |

A caregiver's agent can never register `propose_change`; a pharmacist's agent can never register
`add_medication` or `accept_change`. Open DevTools > Application > WebMCP in either tab to see
the exact tool set that session registered, and the tool-call log in the "tools registered in
this window" panel on the page itself.

## Confirm-before-mutate

WebMCP's `ToolAnnotations` has exactly two fields, `readOnlyHint` and `untrustedContentHint`.
There is no `destructiveHint` and no shipped "ask the user" primitive, so a page that wants a
human in the loop before a mutation lands has to build that gate itself, inside the tool's
`execute`. `src/lib/webmcp/confirm.ts` does this: every write tool calls `await ctx.confirm(...)`
before it touches the store, which suspends the call and renders a confirmation card in the page.
The call only resolves when a person clicks Confirm; clicking Reject rejects the tool call with a
message written for the model to act on, not a status code.

The one declarative tool, `report_side_effect` (`src/components/webmcp/SideEffectForm.tsx`), is
the other half of the same idea: a real `<form toolname="report_side_effect"
tooldescription="...">` with `toolparamdescription` on each field, and deliberately **no**
`toolautosubmit`. An agent can fill the form describing what a caregiver observed; only a human
can press Send Report.

## Data sources

Medication data is drawn from openFDA's public APIs, queried once at build time into a
committed, versioned index:

- Drug labels: `https://api.fda.gov/drug/label.json?search=openfda.generic_name:<generic>`
- Enforcement/recalls: `https://api.fda.gov/drug/enforcement.json?search=openfda.generic_name:<generic>`

The seed set is listed in `scripts/build-index.ts` (>= 60 common geriatric generics: statins,
anticoagulants, fluoroquinolones, SSRIs, ACE inhibitors, beta blockers, and more), one label per
generic, sentence-split by section (`drug_interactions`, `warnings`, `boxed_warning`,
`contraindications`). Every derived interaction flag, geriatric note, and recall carries the
exact query and set_id it came from, so `check_interactions` and `lookup_label_section` results
are never unsourced claims.

**Seed-set honesty**: this is not the full U.S. drug label corpus. The exact drug count,
interaction sentence count, and build timestamp for this build are in `data/index-meta.json`
(exported as `INDEX_META` from `src/lib/index`), read live, not hardcoded here. Two medications
outside the seed set will not surface a flag even if one exists in reality.

## Limits enforced by the server

Every action route re-derives the role from the capability key (wrong key or wrong role: 403).
Free text has ceilings (400 with the actual and allowed length). Writes use optimistic
concurrency (409 after four losing retries). Rate limit: 60 actions per minute per IP and 60 per
minute per case (`src/app/api/case/[id]/action/route.ts`), 429 with `Retry-After`. Reads over
`GET /api/case/:id` and the SSE stream never carry either key and wrap free text in
`<untrusted-user-text>`.

## Disclaimer

openFDA does not endorse this product, and its data is not a substitute for a pharmacist or
prescriber's judgment. Everything this app surfaces is for discussion with a pharmacist. Never
enter a real patient's name or date of birth: the patient is identified only by a caregiver-chosen
label ("Dad") and an age.

## Local run

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`, start a round (or press "Load the demo list (SIMULATED)" for
eleven medications across four prescribers), then open the printed caregiver URL in one tab and
the pharmacist URL it hands you in a second tab. Each tab registers its own WebMCP tool set on
load; watch the "tools registered in this window" panel and DevTools > Application > WebMCP to
see the asymmetry.

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## License

MIT.
