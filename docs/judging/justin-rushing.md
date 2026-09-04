# Judge: Justin Rushing, Browser Platform Lead, OpenAI

Lens: does it work in an agent browser without hand-holding, credential handling predefined, tool
descriptions the model can act on, errors actionable.

## 1. What I did

Read README.md, docs/BUILD-CONTRACT.md, src/lib/webmcp/tools.ts, docs/judging/EVIDENCE.md
(evidence pack of live tool calls against https://pill-round.vercel.app collected this session via
document.modelContext.getTools() / executeTool and curl against the deployed API, no hand-holding
beyond seeding the demo case with the documented POST /api/case body).

Every tool description in `src/lib/webmcp/tools.ts` is written for a model to act on without
external docs. `check_interactions`'s description is dynamic and state-aware: "Checks the 11 drugs
on the active medication list for pairwise interactions found in FDA labels. Pass \"add\" with a
generic name to test a new drug against the list before it is added, without adding it." That
told me, correctly, that calling it with `{add:"ciprofloxacin"}` would check the real 11-drug list
plus the hypothetical addition without mutating anything, and the result confirmed exactly that
(9 flags, `added:"ciprofloxacin"`, medication count unchanged). No external documentation was
needed to know how to call it.

Errors are actionable, not just status codes. Live from the deployed API:
`propose_change` with an unknown medicationId returns 400 with
`"No medication with id \"med_doesnotexist\". Active medications: med_tvl7d3sj (warfarin), ...
(all 11 listed)."`, that's a list an agent can immediately retry against, not a bare "not found."
`accept_change` from the pharmacist key returns 403 with "You are the pharmacist: propose a change
instead and the caregiver confirms it," which tells the calling agent what to do next, not just
that it failed. `add_note` over the 500-char limit returns 400 with the actual length and the
limit in the message, so an agent can trim and retry deterministically rather than guessing.

Credential handling: the two-key model (`ownerKey`/`partnerKey` in the URL) is exactly the
"predefined" shape I want from a site, not something an agent has to infer or scrape a login form
for. `share_with_pharmacist` hands the caregiver's agent a working pharmacist URL directly in the
tool result, so a caregiver-side agent can hand a second agent a working session without any
manual credential copying.

Confirmed live: `add_medication` called through `executeTool` suspended correctly until a human
confirmed, then returned a structured result (`medicationCount`, `version`, `source`) an agent can
use to verify the write actually landed, rather than a bare "ok."

Gap: `report_side_effect` is documented as an owner-only declarative tool but is not present in
`getTools()` on the live deploy (`src/components/case/CaseView.tsx:561` passes
`reportForm={false}`). An agent trying to act on the README's tool list would find this one
missing.

## 2. Scores

**WebMCP Leverage: 4/5.** Dynamic, state-aware tool descriptions and structured, actionable error
messages on every path I tested are exactly what I need from a site's tools to work without hand-
holding. Docked one point for the missing report_side_effect registration.

**Execution: 4/5.** Every mutating flow I tried (add_medication, propose_change, accept_change)
worked end to end with structured results I could verify against, and the denied paths return
messages an agent can act on instead of dead-ending. Not a 5 because a documented tool is
currently absent from the live tool list, which is exactly the kind of gap that breaks an agent
mid-flow if it trusted the docs over getTools().

**Potential Impact: 4/5.** A caregiver's agent adding a medication and getting a real, sourced
interaction flag back in the same call it would need for the next step, with no external API call
required, is a specific and demonstrated capability, not a hypothetical.

**Creativity & Ambition: 4/5.** Capability-key-based role derivation instead of login is the right
shape for an agent-usable multi-party flow (no OAuth dance, no session cookie an agent browser has
to carry), and it's genuinely different from the single-role WebMCP demos I've seen elsewhere.

## 3. What would move my score up one point

Get `report_side_effect` back into `document.modelContext.getTools()` on the live deploy
(`src/components/case/CaseView.tsx:561`, drop `reportForm={false}`) and redeploy. An agent that
reads the README's tool table and then calls `getTools()` should see the same list; right now it
doesn't.

## 4. What would make me distrust the submission

An agent-facing product where the documented tool list and the live tool list diverge is the
specific failure mode I'd flag hardest, because it's exactly the "hand-holding required" problem
this platform exists to remove: an agent has to fall back to guessing or asking a human when the
contract it was told about doesn't match what the browser actually registers.

## 5. Total

4 + 4 + 4 + 4 = **16/20**
