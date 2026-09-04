# Judge: Sarah Drasner, Chrome

Lens: security docs (untrustedContentHint, confirm before mutate), evals, declarative API used
correctly, human in the loop scope, I amplify demos that show the tool call early.

## 1. What I did

Read README.md, docs/BUILD-CONTRACT.md, src/lib/webmcp/tools.ts, src/lib/webmcp/confirm.ts,
src/components/webmcp/SideEffectForm.tsx, evals/, docs/judging/EVIDENCE.md (shared evidence pack
of live tool calls against https://pill-round.vercel.app collected this session).

`lookup_label_section` and `check_geriatric_warnings` both report
`{readOnlyHint:true, untrustedContentHint:true}` live from `getTools()`, and every sentence they
return is wrapped `<untrusted-user-text>...text...</untrusted-user-text>` with an explicit
`untrustedContent` field in the JSON telling the caller to treat it as data, not instructions.
That's the two-field `ToolAnnotations` surface used correctly, on the two tools that actually
carry third-party prose (an FDA label), and not sprinkled onto tools that don't need it.

Confirm-before-mutate: `add_medication` was called live via `executeTool`, and the promise did not
resolve until a human clicked CONFIRM on a card reading "AGENT WANTS TO ACT / Add this medication?
/ aspirin 81 mg / SCHEDULE: once daily / PRESCRIBER: Dr. Chen (primary care) / CASE: Medication
list for Dad / CONFIRM REJECT." `src/lib/webmcp/confirm.ts` is the single choke point every write
tool calls through (`await ctx.confirm(...)`), which is the right shape: one gate, not one gate
per tool reimplemented seven times. Since the spec has no `destructiveHint` and no shipped "ask
the user" primitive, building this gate themselves and putting it in one shared module rather than
skipping it is exactly the security posture I want to see.

Declarative form: `SideEffectForm.tsx` is a real `<form toolname="report_side_effect"
tooldescription="...">` with `toolparamdescription` on each field and no `toolautosubmit`,
matching the spec's own declarative pattern precisely (agent fills, human presses send). But
`document.querySelectorAll('form[toolname]')` on the live page returns `[]`, and
`getTools()` doesn't list `report_side_effect` either. `src/components/case/CaseView.tsx:561`
passes `reportForm={false}`, which unmounts it. So the one tool built specifically to demonstrate
"declarative API, human submits, no autosubmit" is not observable on the running product right
now, even though the code is correct.

`evals/` has 17 fixture files covering every tool for both roles plus the two negative cases
(partner-cannot-accept, caregiver-cannot-propose), run through `evals.test.ts` against a schema
(`schema.ts`). That's a real eval harness, not a demo script.

Denied paths confirmed against the live API: pharmacist calling `accept_change` -> 403 with a
message that tells the model what to do instead ("propose a change instead and the caregiver
confirms it"), not a bare status code. Same pattern on the reverse direction and on a bogus key.

"medical advice" does not appear anywhere on the live case page
(`document.body.innerText.toLowerCase().includes("medical advice")` -> false), and the openFDA
disclaimer footer is present verbatim.

## 2. Scores

**WebMCP Leverage: 4/5.** Correct, minimal use of the actual two-field `ToolAnnotations` surface,
a real shared confirm gate for every write, and a correctly-built declarative form. Docked one
point because the declarative form, the one piece that most directly demonstrates the human-in-the-
loop story I care about, is not registered on the live deploy.

**Execution: 4/5.** The confirm gate resolves correctly for both write flows I tested, the
untrustedContentHint tools return properly delimited content, and there's a real eval suite behind
it. Not a 5 because report_side_effect being dark means the "complete, coherent product
experience" claim in the docs doesn't match what getTools() shows right now.

**Potential Impact: 4/5.** A caregiver's agent and a pharmacist's agent seeing different tool sets
on the same case, with a real FDA-sourced interaction surfaced automatically, is a concrete,
demonstrated human-in-the-loop workflow for a real audience, not a "seamless agentic experience"
claim.

**Creativity & Ambition: 3/5.** The confirm-gate pattern and the untrusted-content wrapping are
solid engineering but not novel relative to what Chrome's own dev docs already recommend; the
genuinely creative part (the capability-key two-role model) is more an Ilya/Andrew-lens strength
than a security-lens one.

## 3. What would move my score up one point

Flip `reportForm={false}` to `true` (or remove the prop) at
`src/components/case/CaseView.tsx:561` and redeploy, then confirm
`document.modelContext.getTools()` includes `report_side_effect` and
`document.querySelectorAll('form[toolname="report_side_effect"]')` finds it. That's the single
missing piece of the human-in-the-loop story this team already built correctly but isn't showing.

## 4. What would make me distrust the submission

Docs (README, BUILD-CONTRACT) describing report_side_effect as a shipped, owner-only declarative
form when it is currently absent from the running page is the kind of gap between "what's
documented" and "what's running" that erodes trust fast, especially from a team that otherwise
gets the untrustedContentHint and confirm-gate details right. It reads as an accidental regression
(a stray prop), not a deliberate overstatement, which is why I'm not treating it as disqualifying,
but it needs to be fixed before narration, not explained away in a caveat.

## 5. Total

4 + 4 + 4 + 3 = **15/20**
