# Judge: Alex Nahas, creator of MCP-B

Lens: tool contracts over DOM actuation. Precise WebMCP vs MCP wording. Which layer is this
(native document.modelContext, a polyfill, or the full MCP-B bridge)? AbortSignal lifecycle for
unregistration. I open DevTools > Application > WebMCP first.

## 1. What I did

Read README.md, docs/BUILD-CONTRACT.md, src/lib/webmcp/tools.ts, src/lib/webmcp/register.ts,
src/lib/webmcp/runtime.ts, src/lib/webmcp/confirm.ts, evals/. Then read docs/judging/EVIDENCE.md,
the live evidence pack collected against https://pill-round.vercel.app this session.

`document.modelContext.constructor.name` on the live page returns `"ModelContext"`
(`Object.prototype.toString` gives `"[object ModelContext]"`), and `window.chrome.webAgent` is
absent. This is the native browser API, not the MCP-B polyfill and not the full MCP-B bridge to a
desktop client. Good: the README says as much ("native document.modelContext") and doesn't dress
up a bridge as "WebMCP."

`getTools()` on the owner tab returns 11 tools, on the pharmacist tab 9 tools, on the same origin,
same session mechanism, different registration call. That's the asymmetry a tool-contract-first
design should produce: two different contracts for two different roles, not one contract with a
client-side `if (role === owner)` UI toggle.

`check_interactions({add:"ciprofloxacin"})` executed via `document.modelContext.executeTool`
(confirms the spec's execute path, not some ad hoc RPC) returned a real ciprofloxacin+warfarin
interaction flag with `setId`, `labelUrl`, and the verbatim FDA sentence wrapped in
`<untrusted-user-text>` tags. `lookup_label_section` and `check_geriatric_warnings` both report
`{readOnlyHint:true, untrustedContentHint:true}` live from `getTools()`. That's correct use of
the only two `ToolAnnotations` fields the spec actually has.

`add_medication` called through `executeTool` did not resolve until a human clicked CONFIRM in the
rendered card, then resolved with the mutation result. `src/lib/webmcp/register.ts` uses
`AbortController`/`AbortSignal` as the sole unregistration mechanism (there is no
`unregisterTool()` in the spec, correctly noted in the code comment), and serializes registration
generations through a promise chain (`generationChain`) so a new generation only registers after
the previous one has finished aborting, and `whenToolsIdle()` is awaited before abort so an
in-flight call isn't orphaned mid-return. This is the exact lifecycle detail most submissions get
wrong.

Gap found (EVIDENCE.md section 7): `report_side_effect`, the one declarative
`<form toolname="report_side_effect">` tool documented in README.md and BUILD-CONTRACT.md, is not
in the live `getTools()` list and `document.querySelectorAll('form[toolname]')` returns `[]` on
the deployed page. `src/components/case/CaseView.tsx:561` passes `reportForm={false}` to
`<WebMCPTools>`, which gates the mount. The component itself (`SideEffectForm.tsx`) is real and
correctly built, deliberately with no `toolautosubmit`, but it is currently dead code on the live
build.

## 2. Scores

**WebMCP Leverage: 4/5.** Real, non-trivial tool contracts (11 tools across two roles, correct
`ToolAnnotations` usage, `AbortSignal`-based unregistration done right, no `destructiveHint`
faked, native `document.modelContext` correctly identified as such in the docs) is genuine effort
above what most entrants ship. Docked one point because the one declarative-form tool the team
chose to build to demonstrate they understand the "human submits, agent doesn't autosubmit"
pattern isn't actually live right now.

**Execution: 4/5.** Confirm-before-mutate works end to end across both roles (add_medication,
propose_change, accept_change all verified live with real confirm cards and resolved promises),
role asymmetry is real not just documented, cross-tab state sync over SSE works without a reload.
Docked one point for the report_side_effect gap: "complete, coherent product experience" is
undercut by a documented tool that isn't wired up.

**Potential Impact: 4/5.** The caregiver/pharmacist split with server-enforced roles and a
specific FDA-sourced interaction (ciprofloxacin+warfarin, with verbatim sentence and setId) is a
credible, demonstrated case for a real audience, not a hypothetical.

**Creativity & Ambition: 4/5.** Two tool sets on one origin keyed by capability token, not login,
is a genuinely different shape than the usual single-role WebMCP demo, and it's explicitly built
around the spec's actual limitations (no destructiveHint, no built-in human-in-the-loop primitive)
rather than pretending they don't exist.

## 3. What would move my score up one point

Ship `report_side_effect` live: remove `reportForm={false}` at
`src/components/case/CaseView.tsx:561` (or flip it to `true`), redeploy, and confirm
`document.modelContext.getTools()` lists it and `form[toolname="report_side_effect"]` exists in
the DOM. This is the tool that most directly demonstrates the declarative half of the WebMCP
surface and it's the one thing currently claimed but not shipped.

## 4. What would make me distrust the submission

If report_side_effect had been left documented as shipped without anyone flagging that it's
currently dark on the live build, that's exactly "overstate what is actually running." It wasn't
hidden here (this evidence pack surfaces it), which is why I'm not zeroing the submission over it,
but if the next redeploy doesn't fix it and the docs still describe it as present, that's the
trust-breaking move.

## 5. Total

4 + 4 + 4 + 4 = **16/20**
