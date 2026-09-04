# Devpost submission text

Paste-ready. Field names match the Devpost submission form for The WebMCP Challenge.

---

## Project name

Pill Round

## Tagline (under 100 characters)

A caregiver and a pharmacist each get an agent on one medication list, every flag quoting the FDA label.

(99 characters)

## Links

- Live: https://pill-round-pink.vercel.app
- Repo: https://github.com/passionate-dev7/pill-round (MIT)

---

## Why this use case is a strong fit for WebMCP

An adult child managing a parent's eleven prescriptions from another city and the parent's
pharmacist are two people with different powers looking at the same list. The caregiver adds
medications and accepts changes; the pharmacist proposes changes and writes counsel notes, and
cannot accept anything on the caregiver's behalf. WebMCP registers tools per session from inside
the page, so the caregiver's link and the pharmacist's link, on one origin and one deployment,
present different tool lists to different agents. DevTools > Application > WebMCP shows 11 tools in
the caregiver's window and 9 in the pharmacist's. `add_medication`, `accept_change`,
`print_round_card` and the declarative `report_side_effect` exist only in the caregiver's;
`propose_change` and `add_counsel_note` only in the pharmacist's. Role is a capability key in the
URL, never a label the client claims, and every write is re-checked on the server, so a forged
call from the wrong session is a 403 with a sentence the model can act on.

## How it creates a better user experience

Before: eleven labels from four prescribers, a hand-written grid, and an interaction checker that
says "moderate" without saying why. After: the caregiver says "he started ciprofloxacin
yesterday" and the agent calls `check_interactions` with `add: "ciprofloxacin"`, testing the new
drug against the list before it is even added. Two rows go red. Each flag carries the verbatim
sentence from the FDA label that caused it, the label's `set_id`, the openFDA URL, and a severity
derived from which section it came from (boxed warning, contraindication, warning, interaction).
Nothing is paraphrased. `check_duplicate_therapy` catches two drugs in the same pharmacologic
class; `check_geriatric_warnings` returns the label's own geriatric-use text; `check_recalls`
returns ongoing enforcement actions by generic.

## What people and agents can now do together that was difficult before

The pharmacist's agent calls `propose_change` ("hold warfarin until INR is rechecked"), which
parks in a confirmation card until the pharmacist presses Confirm. It lands in the caregiver's
window over a live stream with no reload, with Accept and Reject buttons the pharmacist never
sees. The caregiver's agent calls `accept_change`; a person presses Confirm; warfarin flips to
held and the flags recompute against what is actually active. Reject sends the reason back to the
pharmacist's agent as a sentence. `report_side_effect` is a declarative form: the agent fills it,
only a human presses Send. `print_round_card` snapshots the list into a printable medication grid
by time of day. None of this works with DOM scraping or a shared login, and the page carries
openFDA's own disclaimer: this is label text for discussion with a pharmacist, not a diagnosis.

Context: openFDA drug labels, the NDC directory and enforcement reports are public domain and
keyless. The index behind this entry covers 64 common geriatric generics with 1,012 interaction
sentences and 497 geriatric-use sentences, each tied to the `set_id` it came from; the build script
and every query URL are in the repo. The seed set is stated plainly on the page and in the README.

## How WebMCP was implemented

`document.modelContext.registerTool` only. The runtime reads `document.modelContext` once, falls
back to `@mcp-b/webmcp-polyfill`, and an on-page badge prints `native`, `polyfill` or
`unavailable`. Fourteen tools with strict `inputSchema` and `readOnlyHint`; `untrustedContentHint`
on `lookup_label_section` and `check_geriatric_warnings`, the reads that return third-party
label prose, which is delimited before the model sees it. Descriptions are dynamic:
`accept_change` says how many proposals are pending, `list_medications` how many are active and
held. Every mutating tool builds its own confirm gate inside `execute`. `report_side_effect` is a
declarative `<form toolname>` with `toolparamdescription` on each field and no `toolautosubmit`.
Seventeen eval fixtures assert the expected call per user message and, for the negative cases,
that the denied tool is absent from that session's `toolsForRole`. 132 tests.

---

## What is new since 25 August 2026

Everything. The repository was created on 4 September 2026. The two-role WebMCP spine (capability
keys, confirm gate, SSE), the domain, the openFDA index, the tools and the UI were all written for
this entry.

## Built with

Next.js 16, React 19, TypeScript, Tailwind CSS 4, WebMCP (`document.modelContext`),
`@mcp-b/webmcp-polyfill`, `@mcp-b/webmcp-types`, Server-Sent Events, Vercel, Upstash Redis,
Vitest, openFDA (drug label, NDC directory, drug enforcement).

---

## Testing instructions (submission field)

No login, no API key, no setup. Chrome 149 or later with WebMCP turned on at
`chrome://flags/#enable-webmcp-testing`. Open https://pill-round-pink.vercel.app.

1. **Create the demo list.** Press "Load the demo list (SIMULATED)": Dad, 78, eleven medications
   from four prescribers. Create. You are the caregiver. The Flags panel already shows the
   amiodarone and levothyroxine interaction with the label sentence.
2. **Open the WebMCP pane.** DevTools > Application > WebMCP lists 11 tools. Run
   `check_interactions` with `{"add":"ciprofloxacin"}`. Warfarin goes red with the verbatim
   sentence and `set_id`.
3. **Open the pharmacist link** from the right column in a second window. Its pane lists 9 tools:
   `propose_change` and `add_counsel_note` present; `accept_change`, `add_medication`,
   `print_round_card`, `share_with_pharmacist` and `report_side_effect` absent.
4. **Run the loop.** Pharmacist: `propose_change` with `{"kind":"hold","medicationId":"<warfarin
   id from list_medications>","reason":"..."}`, Confirm. The caregiver window shows it with no
   reload. Caregiver: `accept_change` with the proposal id, Confirm. Warfarin reads HELD. Try
   `accept_change` from the pharmacist's key via curl to the action route: 403.
5. **Fill the side-effect form** with the agent; the Send button is the only way it submits.
6. **Print the round card**: `print_round_card`, Confirm, then Print.
