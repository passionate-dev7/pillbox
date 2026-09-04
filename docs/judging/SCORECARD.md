# Pill Round: judging scorecard

Seven judge personas, one pass each, against the live deployed case at
https://pill-round.vercel.app/c/v6vb5ngwyz (seeded from the real DEMO_MEDICATIONS 11-drug, four-
prescriber list in src/lib/store/demo.ts). Evidence collected once and shared across all seven
judges in docs/judging/EVIDENCE.md: getTools() per role, a real check_interactions call
(ciprofloxacin + warfarin, with verbatim FDA sentence, setId, labelUrl), a confirm card resolved
live, a full propose -> confirm -> accept -> confirm cross-tab loop over SSE, five denied paths
against the live API, untrustedContentHint verification, and the report_side_effect gap.

## Score table

| Judge | WebMCP Leverage | Execution | Potential Impact | Creativity & Ambition | Total /20 |
|---|---|---|---|---|---|
| Alex Nahas (MCP-B) | 4 | 4 | 4 | 4 | 16 |
| Sarah Drasner (Chrome) | 4 | 4 | 4 | 3 | 15 |
| Justin Rushing (OpenAI) | 4 | 4 | 4 | 4 | 16 |
| Ilya Grigorik (Shopify) | 4 | 4 | 3 | 3 | 14 |
| Jude Gao (Vercel) | 4 | 4 | 4 | 3 | 15 |
| Andrew Galloni (Cloudflare) | 4 | 4 | 3 | 3 | 14 |
| Sean Roberts (Netlify) | 4 | 3 | 4 | 3 | 14 |

## Composite

Mean of totals: (16 + 15 + 16 + 14 + 15 + 14 + 14) / 7 = 104 / 7 = **14.9 / 20**.

Per the aggregation rule in docs/JUDGING-PROTOCOL.md: below 15/20 blocks narration. This composite
is 14.9, just under the line. Every judge's WebMCP Leverage and (mostly) Execution scores are
solid (4/5 across the board on Leverage); the composite is pulled down by Execution/Creativity
dings that trace to one shared, fixable defect rather than seven separate problems.

## Top three "move my score" items, ranked by how many judges raised them

1. **`report_side_effect` is documented as a shipped owner-only declarative tool but is not
   registered on the live deploy.** Raised independently by 5 of 7 judges (Nahas, Drasner,
   Rushing, Gao, Roberts) as their specific "move my score up one point" item, and it's what
   pulled Roberts's and Gao's Execution scores down to 3 and 4 respectively. Root cause:
   `src/components/case/CaseView.tsx:561` passes `<WebMCPTools ... reportForm={false} />`, which
   unmounts `<SideEffectForm>` (`src/components/webmcp/SideEffectForm.tsx`). The component itself
   is correctly built (real `toolname`/`tooldescription`/`toolparamdescription`, deliberately no
   `toolautosubmit`); it just isn't mounted. **Fix: `src/components/case/CaseView.tsx:561`**, drop
   `reportForm={false}` (or set it `true`), redeploy, and confirm live that
   `document.modelContext.getTools()` on the owner tab lists `report_side_effect` and
   `document.querySelectorAll('form[toolname="report_side_effect"]')` finds it.

2. **No quantified before/after impact claim.** Raised by Grigorik (Potential Impact 3/5): the
   README states the problem specifically and the demo proves the tool catches a real interaction,
   but there's no stated time-saved or error-rate estimate, which is the organiser's own explicit
   bar ("an agent can complete X in one turn instead of Y screens tells us something"). **Fix:
   README.md**, add one sentence quantifying the before/after (even a labeled estimate) for
   check_interactions or the multi-step add-then-check flow.

3. **Rate limiter existence unverified under load.** Raised by Galloni (Execution capped at 4/5,
   Potential Impact 3/5 partly on this): `src/lib/store/ratelimit.ts` exists and is wired into the
   action route per the build contract, but its actual threshold and behavior under concurrent
   requests was not demonstrated live this pass. **Fix: README.md or docs/BUILD-CONTRACT.md**, or
   a short evals fixture, state the actual threshold and paste one real 429 (or equivalent) from
   the live API under a burst of requests, so it's a checkable claim rather than an inferred one.

## Disposition

Composite 14.9/20 is below the 15/20 narration gate. Per protocol: block narration, fix the top
three items above (item 1 first, it's the one shared root cause behind five judges' dings), commit
and redeploy, then re-run the two lowest-scoring judges (Ilya Grigorik and, tied at 14, either
Andrew Galloni or Sean Roberts, whichever the fix set most directly addresses) before narration
proceeds. Judges do not edit product code; this scorecard is the handoff to whoever owns
src/components/case/CaseView.tsx and README.md.
