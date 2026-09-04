# Judge: Sean Roberts, VP of Applied AI, Netlify

Lens: substance over platform promotion, would this survive a skeptical read, is the product real
for its named user.

## 1. What I did

Read README.md, docs/BUILD-CONTRACT.md, src/lib/webmcp/tools.ts, docs/judging/EVIDENCE.md
(evidence pack of live tool calls and curl requests against https://pill-round.vercel.app
collected this session).

The named user in the README's opening paragraph is specific: "A daughter in Denver manages her
father's eleven prescriptions from four prescribers off one hand-written grid on the fridge." That
survives a skeptical read because the demo data matches it exactly, not loosely: 11 medications,
four named prescribers (Dr. Alvarez cardiology, Dr. Chen primary care, Dr. Patel psychiatry, Dr.
Nakamura pain management), and I verified live that seeding this exact list and running
`check_interactions` surfaces real, specific findings on it (amiodarone+warfarin bleeding
potentiation, omeprazole+warfarin INR monitoring, ciprofloxacin+warfarin enhanced anticoagulant
effect), this isn't a toy example built to make one flashy interaction fire, it's a realistic
polypharmacy list that happens to have real interactions in it, which is closer to how this
actually goes wrong for real families.

"medical advice" appears nowhere on the live page (`document.body.innerText` check confirmed), and
the disclaimer footer is present and specific ("openFDA does not endorse this product, and its
data is not a substitute for a pharmacist or prescriber"). That restraint is exactly what
distinguishes a substantive submission from one that oversells its own authority; a tool that
told a caregiver's agent "safe to take together" instead of surfacing the sourced sentence and
deferring to a pharmacist would not survive my skeptical read at all.

I looked for platform promotion (the specific thing I'm primed to distrust) and didn't find it:
no vendor name-drops beyond openFDA (the actual data source, correctly attributed), no "powered by
X's revolutionary agent infrastructure" framing anywhere in README or BUILD-CONTRACT.

The gap that does not survive a skeptical read: `report_side_effect` is documented in both
README.md and BUILD-CONTRACT.md as a shipped, owner-only declarative form, but
`document.modelContext.getTools()` on the live owner tab does not list it, and
`document.querySelectorAll('form[toolname]')` returns nothing on the live page. Tracing this to
`src/components/case/CaseView.tsx:561` (`reportForm={false}`), it's a wiring bug, not a fabricated
claim, but a skeptical reader who checks `getTools()` against the README's tool table (which the
organiser's own update explicitly invites: "show the agent actually using your tools") would find
a mismatch on their first check. That's the single thing in this submission that doesn't hold up
to the exact scrutiny this hackathon says it will apply.

## 2. Scores

**WebMCP Leverage: 4/5.** The tool set is built around what the named user's agent would actually
need (add, check, propose, accept, with the right party holding each), not a generic CRUD-to-tool
mapping; docked one point for the one tool that's documented but not live.

**Execution: 3/5.** Most of the product holds up under direct verification (confirm cards, role
gating, live interaction data), but a documented tool being absent from the running app is exactly
the kind of "not a complete, coherent product experience" gap the organiser's own criteria call
out, and it's the first thing I checked that didn't match the docs.

**Potential Impact: 4/5.** The problem statement is specific and the demo data is realistic enough
to actually contain the interactions it claims to catch, which is the bar for "credible, specific
case for solving a real problem for a real audience" in my read.

**Creativity & Ambition: 3/5.** Solid, not showy; the capability-key model is a sensible answer to
a real question (how do two untrusted parties share one case without login) rather than a novel
concept, which is fine but not what earns a 4 or 5 from me on ambition specifically.

## 3. What would move my score up one point

Fix and redeploy `report_side_effect` (`src/components/case/CaseView.tsx:561`), then re-verify
`getTools()` matches the README's tool table exactly for both roles. That single mismatch is what
kept Execution at a 3 instead of a 4 for me.

## 4. What would make me distrust the submission

If, after this gap is pointed out, the fix in the next build were to just delete
`report_side_effect` from the README instead of shipping it, that would tell me the team optimized
for the docs matching reality over the product actually having the feature they built and
described. The component and its declarative-form correctness (no toolautosubmit, real
toolparamdescription attributes) are already built; the honest fix is one line, not a doc edit.

## 5. Total

4 + 3 + 4 + 3 = **14/20**
