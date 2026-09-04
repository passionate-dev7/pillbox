# Devpost submission text

Paste-ready. Field names match the Devpost submission form for The WebMCP Challenge.

---

## Project name

Pillbox

## Tagline (under 100 characters)

A caregiver and a pharmacist each get an agent on one medication list, every flag quoting the FDA label.

(99 characters)

## Links

- Live: https://pillbox-care.vercel.app
- Repo: https://github.com/passionate-dev7/pillbox (MIT)
- Video: https://www.youtube.com/watch?v=ZE0akgsu9tQ

---

## Why this use case is a strong fit for WebMCP

My dad is 78. He takes eleven prescriptions written by four different doctors, and I manage all of it from another city with a grid on the fridge that I photograph every Sunday. Last week a fifth doctor started him on ciprofloxacin. Nobody checked it against the warfarin, and the interaction checker I finally found said "moderate" and nothing else.

Pillbox is one medication list that a caregiver and a pharmacist open from two different links. Same page, same origin, different WebMCP tools. My link registers 12 tools and the pharmacist's registers 9. `add_medication`, `accept_change`, `print_round_card` and the side-effect form are only in mine. `propose_change` and `add_counsel_note` are only in theirs. You can see the two lists in DevTools > Application > WebMCP, one per window.

The role comes from a capability key in the URL, and the server re-derives it on every write. If the pharmacist's agent tries to accept its own proposal, the response is a 403 that reads "Only the caregiver can accept change. You are the pharmacist: propose a change instead and the caregiver confirms it." A hidden tool is never the security boundary here; the server is.

## How it creates a better user experience

I say "he started ciprofloxacin yesterday." The agent calls `check_interactions` with `add: "ciprofloxacin"`, so the new drug is tested against the whole list before it is even added. Two rows go red. Each flag carries the exact sentence from the FDA label that caused it, the label's `set_id`, the openFDA URL, and a severity derived from which section the sentence came from (boxed warning, contraindication, warning, interaction). Nothing is paraphrased. You can click the set_id and read the label yourself.

That "nothing is paraphrased" rule cost me most of the data work. openFDA returns combination products first (the label for "Amlodipine and Atorvastatin" is not the label for atorvastatin), so the index aggregates brand names, pharmacologic classes and section text across every prescription label for a generic instead of trusting the first hit. 64 drugs, 1,012 interaction sentences, 497 geriatric-use sentences, all tied to the set_id they came from. The seed set is stated on the page. It is not the whole formulary and I do not pretend it is.

`check_duplicate_therapy` catches two drugs in the same class. `check_geriatric_warnings` returns the label's own geriatric-use text. `check_recalls` returns ongoing enforcement actions by generic.

## What people and agents can now do together that was difficult before

The pharmacist's agent calls `propose_change` ("hold warfarin until INR is rechecked"). It pauses in a confirmation card until the pharmacist presses Confirm. Then it shows up in my window over a live stream, no reload, with Accept and Reject buttons the pharmacist never sees. My agent calls `accept_change`; I press Confirm; warfarin flips to held and the flags recompute against what is actually active. If I reject, my reason goes back to the pharmacist's agent as a sentence, not a status code.

The side-effect report is a declarative form (`<form toolname="report_side_effect">`, `toolparamdescription` on each field, no `toolautosubmit`). The agent fills it; only a person can send it. `print_round_card` snapshots the list into a printable grid by time of day, which is the thing that actually goes on the fridge.

The page carries openFDA's disclaimer in the footer. This is label text for discussion with a pharmacist, not a diagnosis, and the copy never says otherwise.

## How WebMCP was implemented

`document.modelContext.registerTool` only. The runtime reads the native object once, falls back to `@mcp-b/webmcp-polyfill`, and a badge on the page prints which one is live.

Fourteen tools with strict `inputSchema` and `readOnlyHint`. `untrustedContentHint` is true on `lookup_label_section` and `check_geriatric_warnings` because label prose is third-party text; it is wrapped in `<untrusted-user-text>` before the model sees it, on the tool path and on the REST and SSE paths alike. Descriptions change with state: `accept_change` says how many proposals are pending, `list_medications` how many are active and how many held.

Every mutating tool builds its own confirm gate inside `execute`. Seventeen eval fixtures assert the expected call per user message; the negative ones assert the denied tool is absent from that session's `toolsForRole`. 132 tests. Writes are versioned (409 after four losing retries) and rate limited (60 per minute per IP and per case, 429 with Retry-After); I burst-tested that against the live deploy with 70 concurrent requests and got the mix of 200, 409 and 429 I expected.

One thing I got wrong and fixed: the first deploy mounted `<WebMCPTools reportForm={false}>`, so the side-effect form never registered. Five of seven reviewers I ran caught it. It is mounted now and the tool shows in the caregiver's list.

---

## What is new since 25 August 2026

All of it. The repository was created on 4 September 2026 and every line, including the openFDA index, the two-role spine, the tools and the UI, was written for this entry.

## Built with

Next.js 16, React 19, TypeScript, Tailwind CSS 4, WebMCP (`document.modelContext`), `@mcp-b/webmcp-polyfill`, `@mcp-b/webmcp-types`, Server-Sent Events, Vercel, Upstash Redis, Vitest, openFDA (drug label, NDC directory, drug enforcement).

---

## Testing instructions (submission field)

No login, no API key, no setup. Chrome 149 or later with WebMCP turned on at
`chrome://flags/#enable-webmcp-testing`. Open https://pillbox-care.vercel.app.

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
