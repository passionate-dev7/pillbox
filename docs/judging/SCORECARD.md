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
| Ilya Grigorik (Shopify) | 4 | 4 | 4 | 3 | 15 |
| Jude Gao (Vercel) | 4 | 4 | 4 | 3 | 15 |
| Andrew Galloni (Cloudflare) | 4 | 4 | 4 | 3 | 15 |
| Sean Roberts (Netlify) | 5 | 4 | 4 | 3 | 16 |

## Composite

Mean of totals: (16 + 15 + 16 + 15 + 15 + 15 + 16) / 7 = 108 / 7 = **15.4 / 20**.

Per the aggregation rule in docs/JUDGING-PROTOCOL.md: 15/20 clears the narration gate. The
re-scored composite is 15.4, up from the first pass's 14.9, and it clears. Grigorik, Galloni and
Roberts, the three lowest scores in the first pass, all moved up (14 -> 15, 14 -> 15, 14 -> 16
respectively) after the three fixes were verified live: `report_side_effect` now registers in
`getTools()` and mounts as a real declarative form with no `toolautosubmit`, README.md now states
a labeled before/after estimate and the exact server-side rate-limit thresholds, and a live 70-
request concurrent burst against `/api/case/[id]/action` returned a real mix of `200`, `409`, and
`429` responses with a genuine `Retry-After` header, not a claim taken on file presence alone.

## Top three "move my score" items, ranked by how many judges raised them

1. **`report_side_effect` is documented as a shipped owner-only declarative tool but is not
   registered on the live deploy.** Raised independently by 5 of 7 judges (Nahas, Drasner,
   Rushing, Gao, Roberts) as their specific "move my score up one point" item, and it's what
   pulled Roberts's and Gao's Execution scores down to 3 and 4 respectively. Root cause:
   `src/components/case/CaseView.tsx:561` passes `<WebMCPTools ... reportForm={false} />`, which
   unmounts `<SideEffectForm>` (`src/components/webmcp/SideEffectForm.tsx`). **Fixed and verified
   live** (this pass): `document.modelContext.getTools()` on the owner tab now lists 12 tools
   including `report_side_effect`, and `document.querySelectorAll('form[toolname="report_side_effect"]')`
   finds the form with `toolautosubmit` genuinely absent. Sean Roberts's Execution moved 3 -> 4 and
   WebMCP Leverage moved 4 -> 5 on this fix directly.

2. **No quantified before/after impact claim.** Raised by Grigorik (Potential Impact 3/5). **Fixed
   and verified** (this pass): README.md's opening section now states "Before: she opens eleven
   label PDFs, or an interaction checker that says 'moderate' without saying why, then phones the
   pharmacy and waits. After: one `check_interactions` call ... Estimate, not measured," a labeled
   estimate rather than a bare marketing claim. Grigorik's Potential Impact moved 3 -> 4.

3. **Rate limiter existence unverified under load.** Raised by Galloni (Execution capped at 4/5,
   Potential Impact 3/5 partly on this). **Fixed and verified live** (this pass): README.md's new
   "Limits enforced by the server" section states 60 actions/minute per IP and per case, 409 after
   four losing optimistic-concurrency retries, and 429 with `Retry-After`; a real 70-request
   concurrent `add_note` burst against a fresh case returned a mix of `200` (8), `409` (44), and
   `429` (18), with the `429` bodies carrying real `retry-after` header values (38, 56 across two
   bursts). Galloni's Potential Impact moved 3 -> 4; Execution stays at 4/5, now because a burst of
   legitimate concurrent writes loses more than half its requests to the retry-exhaustion path, a
   substantive limitation rather than an unverified claim.

## Disposition

Composite 15.4/20 clears the 15/20 narration gate as of this re-score (2026-09-04, live deploy,
commits a2fce83, 909d5e4, 52d8789). All three items above were independently re-verified against
the live app rather than trusted from the README or BUILD-CONTRACT: `getTools()` and the DOM form
attributes for item 1, the README text for item 2, and a real concurrent curl burst with captured
`Retry-After` headers for item 3. Narration may proceed.
