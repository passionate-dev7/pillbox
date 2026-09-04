# Judge: Ilya Grigorik, Distinguished Engineer, Shopify

Lens: quantified before/after, no marketing claims, real usage numbers or a credible path to
them, agent experience over hype.

## 1. What I did

Read README.md, docs/BUILD-CONTRACT.md, src/lib/index/index.ts, data/index-meta.json,
docs/judging/EVIDENCE.md (evidence pack of live tool calls against
https://pill-round.vercel.app collected this session).

`INDEX_META`, read live from `data/index-meta.json`: `builtAt: 2026-09-04T04:35:26.246Z, drugs: 64,
interactionSentences: 1012, geriatricSentences: 497, recalls: 378`, with 64 real
`api.fda.gov/drug/label.json` source URLs listed verbatim. That's a quantified, checkable claim
about the corpus, not "powered by FDA data." The README goes further and states the limitation
directly: "this is not the full U.S. drug label corpus... Two medications outside the seed set will
not surface a flag even if one exists in reality." That's the honest, specific claim I look for
over marketing language, and it's the exact opposite of "leverages WebMCP for seamless agentic
experiences."

The before/after is concrete and demonstrated, not asserted: `check_interactions({add:
"ciprofloxacin"})` against the real 11-drug demo list returned 9 flags with verbatim sentences and
`setId`/`labelUrl` per sentence, executed in one tool call. Before WebMCP tools, the equivalent
task is a caregiver manually cross-referencing 11 drug names against FDA labels or trusting a
static drug-interaction checker with no visibility into which specific label sentence backs a
warning; here the agent gets the sentence and the source in the same call it uses to decide whether
to add the medication.

What's missing that would move this from "credible case for a real problem" to "measured": no
before/after timing (how long would this take a caregiver to do by hand vs. one tool call), no
usage numbers from real caregivers or pharmacists (this is a demo case I seeded, not production
traffic), and no error-rate or false-negative-rate discussion for the interaction detection itself
beyond the honest seed-set-coverage caveat. Those are reasonable to not have for a hackathon
submission, but they're also exactly the gap between "demonstrated" and "quantified impact."

## 2. Scores

**WebMCP Leverage: 4/5.** Every tool result carries a `source` field tracing back to a real query
(`caseSourceRef` for case-store reads, real `api.fda.gov` URLs for label reads), which is the kind
of provenance discipline I'd want from any agent-facing data surface, not just a WebMCP demo.

**Execution: 4/5.** The check_interactions call I traced through EVIDENCE.md works end to end with
real data, not a stub; 9 flags on 11 real drugs is not a cherry-picked happy path.

**Potential Impact: 3/5.** The problem (a caregiver manually tracking interactions across four
prescribers) is real and specific, and the demo shows the tool actually catching something a
hand-kept grid would miss (ciprofloxacin+warfarin). But there's no quantified before/after (time
saved, error rate, actual caregiver usage) beyond the one demonstrated call, so I can't score this
a 5 on "credible, specific case" the way I'd want without at least a stated estimate.

**Creativity & Ambition: 3/5.** The seed-set honesty section in the README is more valuable to me
than most "creative" framing I see in this category, because it's the kind of self-imposed
measurement discipline that's rare in hackathon submissions, but the core concept (drug interaction
checker) is not itself novel; the WebMCP-specific twist (per-role tool contracts) is the creative
part and it's a Nahas/Andrew-lens strength more than mine.

## 3. What would move my score up one point

Add one concrete before/after sentence to README.md or the submission text: something like "a
caregiver manually checking 11 medications against FDA labels for pairwise interactions takes N
minutes of cross-referencing; check_interactions returns all N flags with sourced sentences in one
call." Even an honest estimate, clearly labeled as an estimate, would satisfy the organiser's own
bar ("an agent can complete X in one turn instead of Y screens tells us something").

## 4. What would make me distrust the submission

If the README's seed-set honesty section were removed or softened in favor of vaguer "powered by
FDA data" language, that would be the specific tell that this team optimized for looking impressive
over being accurate, which is the opposite of what earned my score here.

## 5. Total

4 + 4 + 3 + 3 = **14/20**

## Re-score after fixes (2026-09-04 05:25 UTC)

Re-verified live against a freshly seeded case (`96w5fcksei`, 11 real DEMO_MEDICATIONS rows via
POST /api/case). README.md now reads: "Before: she opens eleven label PDFs, or an interaction
checker that says 'moderate' without saying why, then phones the pharmacy and waits. After: one
`check_interactions` call with `add: 'ciprofloxacin'` returns every flagged pair with the verbatim
label sentence and its `set_id` ... Estimate, not measured." That is exactly the labeled-estimate
bar I asked for in my "move my score up one point" note, it's honest about being an estimate
rather than dressing it up as a measurement, and it sits right next to the same seed-set-honesty
section I already trusted.

**WebMCP Leverage: 4/5.** Unchanged; provenance discipline (source fields, real setId/labelUrl)
was already solid and this fix doesn't touch it.

**Execution: 4/5.** Unchanged; the check_interactions call still works end to end on the fresh
case (9 flags including ciprofloxacin+warfarin on the 11-drug demo list, re-verified this pass).

**Potential Impact: 4/5.** Up from 3. The README now states the before/after directly rather than
leaving me to infer it, and labels it an estimate instead of a measured number, which is the
specific honesty move I asked for; still not a 5 because it remains a stated estimate, not real
caregiver usage data, but that gap is now explicit rather than silent.

**Creativity & Ambition: 3/5.** Unchanged; the core interaction-checker concept still isn't novel,
the WebMCP per-role tool contract is still the creative part and it's still not primarily my lens.

**New total: 4 + 4 + 4 + 3 = 15/20.**
