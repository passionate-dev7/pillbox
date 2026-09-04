# Judge: Andrew Galloni, VP Research & Innovation, Cloudflare

Lens: trust boundaries: what an untrusted agent can and cannot do, rate limits, the denied path
being real.

## 1. What I did

Read README.md, docs/BUILD-CONTRACT.md, src/lib/store/actions.ts, src/lib/store/ratelimit.ts,
docs/judging/EVIDENCE.md (evidence pack of live curl requests and tool calls against
https://pill-round.vercel.app collected this session).

I care most about whether the denied path is real, not just documented, so I re-verified the four
denial cases against the live API rather than trusting the README's table:

- Pharmacist key -> `accept_change`: 403, `"Only the caregiver can accept change. You are the
  pharmacist: propose a change instead and the caregiver confirms it."`
- Caregiver key -> `propose_change`: 403, `"Only the pharmacist can propose change. You are the
  caregiver: accept or reject the proposals you already have."`
- Bogus key -> any mutating action: 403, `"This link's key does not match this case. Use the
  caregiver or pharmacist URL exactly as it was shared; a guessed or edited key is not a valid
  credential."`
- Oversized free text (600 chars against a 500 limit): 400 with the actual length and the limit
  stated.

All four are real HTTP responses from the deployed API, not client-side gating I'm trusting to
have a server twin. `src/lib/store/actions.ts`'s `roleForKey` explicitly returns `null` (not a
default role) for a non-matching key, and every route re-derives role from the presented key on
every call, independent of what the client's `getTools()` happened to expose. That's the trust
boundary I want: the untrusted agent's capability is exactly what its key allows, checked server-
side, every time, not cached or assumed from a prior successful call.

`src/lib/store/ratelimit.ts` exists in the repo (`docs/agents/tools.md` and BUILD-CONTRACT
reference it), which tells me the team thought about abuse resistance beyond just role-gating; I
did not load-test it live this session, so I can't confirm the actual threshold holds under
concurrent load, only that the mechanism exists in code and is wired into the action route.

The read path (`GET /api/case/[id]`) is unauthenticated by design and I confirmed this live: a
bogus key still returns 200 with the full case body, keys stripped. This is a real trust-boundary
decision worth naming explicitly: the case id itself functions as the read-access secret (it's
already embedded in both share URLs), while the two capability keys are the write-access secrets.
That's a defensible two-tier model as long as case ids are unguessable, which I did not
independently verify (the id `v6vb5ngwyz` I was handed looks like a short random slug, not
sequential, but I didn't inspect the generator).

Every free-text field I checked (note, propose_change reason, report description) has a server-
side max-length ceiling enforced with a 400 and an exact message, not a silent truncation, that
matters for an untrusted agent that might otherwise be able to push unbounded payloads into a
shared case both parties read.

## 2. Scores

**WebMCP Leverage: 4/5.** The tool layer and the server layer independently agree on who can do
what, and I verified the server side holds even when the tool layer is bypassed entirely via
direct API calls, which is the property I actually score on this lens.

**Execution: 4/5.** Every denied path I tested returned the documented status and a real, specific
message; nothing silently succeeded or silently failed. Not a 5 because I could not verify rate-
limit behavior under load in the time available, so that piece of the trust story is unverified
rather than confirmed.

**Potential Impact: 3/5.** A real trust boundary between two named untrusted parties (a caregiver's
agent and a pharmacist's agent, on the same shared record) is a specific, credible case for the
kind of agent-trust problem I care about, but it's a fairly small blast radius (one household's
medication list) rather than a broad platform-level trust story.

**Creativity & Ambition: 3/5.** Capability-key role derivation is solid, standard practice for
this shape of problem; I'd want to see something like per-tool scoping (e.g. a pharmacist key that
can propose but never even see a caregiver's private notes) to call it ambitious on the trust
dimension specifically.

## 3. What would move my score up one point

Either demonstrate the rate limiter under real concurrent load (a short script hammering
`add_note` past whatever threshold `ratelimit.ts` enforces, with the 429/whatever response
pasted), or document the actual threshold and enforcement point in README.md so it's a checkable
claim rather than an inferred one from file presence.

## 4. What would make me distrust the submission

If any of the four denied paths I tested had returned 200 instead of 403/400, that would be
immediately disqualifying for this lens; none did. The thing that would erode trust going forward
is if the case-id-as-read-secret design turned out to use predictable ids (sequential or short
enough to enumerate); I did not verify the id generator's entropy this session, and that's the one
gap in my own verification I'd flag rather than assume away.

## 5. Total

4 + 4 + 3 + 3 = **14/20**
