# Judge: Jude Gao, Member of Technical Staff, Vercel, Next.js core team

Lens: Next.js app quality, server enforcement of role, SSE and state design, deploy hygiene, no
client-only trust.

## 1. What I did

Read README.md, docs/BUILD-CONTRACT.md, src/lib/store/actions.ts, src/app/api/case/[id]/route.ts,
src/app/api/case/[id]/action/, src/app/api/case/[id]/stream/, docs/judging/EVIDENCE.md (evidence
pack of live tool calls and curl requests against https://pill-round.vercel.app collected this
session).

Server enforcement, not client trust: `src/lib/store/actions.ts`'s `roleForKey` derives the role
purely from which of two server-held tokens (`ownerKey`/`partnerKey`) the caller presents; a key
matching neither gets `null`, not a default role. `assertRole` then re-checks `OWNER_ONLY`/
`PARTNER_ONLY` independently of whatever tool set the client happened to register. I verified this
server-side, not just read it: curl with the partner key against `accept_change` returns 403, curl
with the owner key against `propose_change` returns 403, curl with a bogus key against any
mutating action returns 403 with "a guessed or edited key is not a valid credential." The client-
side tool list (which tools `getTools()` shows) is genuinely just UX, since the 403s land
independent of it.

GET `/api/case/[id]` is deliberately unauthenticated for reads (the case id is already inside both
share URLs, so it's not treated as a secret) and strips both keys from the response regardless of
what key is presented, I confirmed `?k=bogus_key_123` still returns the full case with `ownerKey`
and `partnerKey` as empty strings in the payload. That's a defensible, explicit design decision
documented in a code comment, not an oversight; the write path is where the real boundary is
enforced and I verified that boundary holds.

State design: propose_change on the pharmacist tab, confirmed via a real UI confirm card, appeared
on the caregiver tab within ~2 seconds with no reload and no polling code run from my side, this
is the app's own SSE stream (`src/app/api/case/[id]/stream/route.ts`) pushing the update. The
caregiver tab's `document.modelContext` tool count did not change on this push (only pendingCount-
driven tool state, per `WebMCPTools.tsx`'s effect dependency array, changes when it should:
`caseId, version, pendingCount`), so the registration generation churns only when the actual tool
contract needs to change, not on every version bump.

Deploy hygiene gap: `git status` on the working tree shows uncommitted changes across most UI
components plus `DESIGN.md`/`globals.css` (a parallel redesign agent in flight, per the
orchestrator's own instructions), so I'm scoring the deployed build's substance, not the local
diff. Separately and more concretely: `src/components/case/CaseView.tsx:561` passes
`reportForm={false}` to `WebMCPTools`, silently unmounting the `report_side_effect` declarative
form on production; this is either a stale flag left from development or an untested prop wiring,
and either way it's exactly the kind of "looks done in the component tree, isn't wired to the page
that renders" gap that a component-level code review misses and only a live `getTools()` check
catches.

## 2. Scores

**WebMCP Leverage: 4/5.** The server independently re-checking role on every mutating route,
regardless of which client-side tool set fired the call, is the correct trust model and I verified
it holds under direct API calls that bypass the UI entirely, not just through the tool wrapper.

**Execution: 4/5.** SSE state sync across two tabs worked live without a reload, and the
registration-generation lifecycle correctly avoids churning tools on every state change. Docked
one point for the report_side_effect mount gap, which is a real "coherent product experience"
defect, not a hypothetical one.

**Potential Impact: 4/5.** A caregiver and a pharmacist genuinely operating on the same server-
enforced case state, with independently-checked roles, is a credible multi-party product shape,
demonstrated with real cross-tab evidence, not just described.

**Creativity & Ambition: 3/5.** The capability-key/no-login model and independent server
re-validation are solid, defensible engineering; not the part of this submission I'd call
"creative" relative to standard multi-tenant-by-token design, though it is well executed.

## 3. What would move my score up one point

Fix `src/components/case/CaseView.tsx:561` (`reportForm={false}` -> drop it or set `true`),
redeploy, and confirm `document.modelContext.getTools()` on the owner tab includes
`report_side_effect` post-deploy. Also commit the in-flight redesign changes before final judging
so the deployed build and the repo state agree, which is a basic deploy-hygiene bar independent of
this specific bug.

## 4. What would make me distrust the submission

If the server-side role check were ever found to trust a client-supplied `role` field instead of
deriving it purely from key equality, that would be disqualifying for this lens; I checked and it
isn't the case here (`roleForKey` only compares against the stored `ownerKey`/`partnerKey`), which
is why I'm not flagging this as the distrust item. The report_side_effect gap is a defect, not a
trust violation, since nothing in the docs claims something the server doesn't also enforce.

## 5. Total

4 + 4 + 4 + 3 = **15/20**
