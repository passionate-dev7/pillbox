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

Every Sunday I photograph the grid on my dad's fridge and text it to myself. Eleven prescriptions, four doctors, his handwriting. He is 78 and I live in another city. When a fifth doctor added ciprofloxacin last week, nobody checked it against the warfarin. The interaction checker I found online said "moderate." That was the entire explanation.

Pillbox is my answer to "moderate."

**One list, two links.** I open the medication list with my link and get 12 WebMCP tools. His pharmacist opens the same list with a different link and gets 9. Same page, same origin. `add_medication`, `accept_change`, `print_round_card` and the side-effect form only exist in my window. `propose_change` and `add_counsel_note` only exist in the pharmacist's. If you open DevTools, Application, WebMCP in each window the lists disagree, and that disagreement is the product.

**The label, verbatim.** I tell my agent "he started ciprofloxacin yesterday." It calls `check_interactions` with `add: "ciprofloxacin"`, so the new drug is checked against the list before it is added. Two rows go red. Each flag shows the exact sentence from the FDA label that triggered it, the label's `set_id`, the openFDA URL, and a severity taken from which section the sentence lives in (boxed warning, contraindication, warning, interaction). Nothing is rephrased. Click the set_id and read the label yourself.

That rule cost me most of the data work. openFDA hands you combination products first, so the label for "Amlodipine and Atorvastatin" would have stood in for atorvastatin and given it no pharmacologic class at all. The index now aggregates brands, classes and section text across every prescription label for a generic instead of trusting the first hit. 64 drugs, 1,012 interaction sentences, 497 geriatric-use sentences, each tied to its set_id. The seed set is printed on the page; it is not the whole formulary.


![Architecture](https://raw.githubusercontent.com/passionate-dev7/pillbox/main/video/diagrams/architecture.png)

*openFDA labels become a sentence index keyed by every drug each sentence names; check_interactions returns the sentence, the set_id and a severity; the page registers tools per link and the server re-checks every write.*

**Who gets to say yes.** The pharmacist's agent calls `propose_change`, hold warfarin until the INR is rechecked. It pauses in a confirmation card until the pharmacist clicks Confirm, then shows up in my window over a live stream, no reload, with Accept and Reject buttons the pharmacist never sees. My agent calls `accept_change`; I press Confirm; warfarin flips to held and the flags recompute against what is actually active. If the pharmacist's agent tries to accept its own proposal, the server answers 403: "Only the caregiver can accept change. You are the pharmacist: propose a change instead and the caregiver confirms it." The role comes from the capability key in the URL, re-derived on every write. Hiding a tool is not the boundary; the server is.

**Two things only a person can do.** The side-effect report is a real `<form toolname="report_side_effect">` with `toolparamdescription` on each field and no `toolautosubmit`; the agent fills it, a human presses Send. `print_round_card` snapshots the list into a grid by time of day, which is the thing that actually replaces the photo on the fridge.


![Two sessions, one page](https://raw.githubusercontent.com/passionate-dev7/pillbox/main/video/diagrams/two-sessions.png)

*The caregiver's window and the pharmacist's window on the same list. The pharmacist can propose; only the caregiver can accept, and the server enforces it.*

**Under the hood.** `document.modelContext.registerTool`, native first, `@mcp-b/webmcp-polyfill` behind it, a badge on the page saying which is live. Fourteen tools with strict schemas and `readOnlyHint`. `untrustedContentHint` is true on `lookup_label_section` and `check_geriatric_warnings` because label prose is third-party text; it is wrapped in `<untrusted-user-text>` on the tool, REST and SSE paths alike. Descriptions change with state: `accept_change` says how many proposals are pending. Confirm gates live inside each mutating tool's `execute`. Seventeen eval fixtures, the negative ones asserting the denied tool is absent from that session's `toolsForRole`; 132 tests. Versioned writes (409 after four losing retries) and a rate limit of 60 per minute per IP and per list (429 with Retry-After), which I burst-tested against the live deploy with 70 concurrent requests.

**What I got wrong.** The first deploy passed `reportForm={false}` to the tools panel, so the side-effect form never registered. Five of the seven review passes I ran caught it. It is mounted now.

The footer carries openFDA's disclaimer. This is label text for discussion with a pharmacist, not a diagnosis, and nothing on the page says otherwise.

Everything here was written on 4 September 2026 with Next.js 16, TypeScript, Tailwind 4, Upstash Redis, Vitest and openFDA. The build script, every openFDA query URL and the eval fixtures are in the repo.

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
