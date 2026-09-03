# webmcp-two-agent-spine

Two people, two agents, one WebMCP page: capability-key roles, confirm-before-mutate, shared
state over SSE. This is a template, extracted from a working WebMCP Challenge entry
(`out-of-service`, an accessible NYC subway router) with the transit domain removed. What's left
is the part every "two people on the same case, asymmetric agent tools" product needs before it
can be about anything: an owner and a partner open the same case from two different links, each
gets a different WebMCP tool set on the same origin, and the server enforces the asymmetry
independently of which tools either browser tab happens to have registered.

Clone it, run it, and you have a working two-role WebMCP app in minutes. Then replace one file
(`src/lib/webmcp/tools.ts`) and one type file (`src/lib/types.ts`) with your own domain.

## The two-role capability-key model

There is no login. Creating a case mints two long random tokens, an `ownerKey` and a
`partnerKey`. The URL a person opens with (`?k=...`) is the only thing that determines their
role — the server looks up which key matches and derives `owner` or `partner` from that, never
from a query param that claims a role or from anything the client asserts. A guessed or edited
key matches neither token and gets no role at all (`InvalidLink`), not "partner by default."

Every server route re-checks this independently (`src/lib/store/actions.ts`, `roleForKey` +
`assertRole`), so even if a WebMCP tool were somehow reachable from the wrong session — a bug in
registration, a forged `executeTool` call — the mutation still 403s. The client-side tool list
(`isAllowed()` in `src/lib/webmcp/tools.ts`) is a UX nicety, not the security boundary.

## Confirm-before-mutate

WebMCP's `ToolAnnotations` has exactly two fields, `readOnlyHint` and `untrustedContentHint`.
There is no `destructiveHint` and no shipped "ask the user" primitive, so a page that wants a
human in the loop before a mutation lands has to build that gate itself, inside the tool's
`execute`. `src/lib/webmcp/confirm.ts` does this: every write tool calls `await ctx.confirm(...)`
before it touches the store, which suspends the call and renders `<ConfirmCard>` in the page.
The call only resolves when a person clicks Confirm; clicking Reject rejects the tool call with a
message written for the model to act on, not a status code.

The one declarative tool, `report_form` (`src/components/webmcp/ReportForm.tsx`), is the other
half of the same idea: a real `<form toolname="report_form" tooldescription="...">` with
`toolparamdescription` on each field, and deliberately **no** `toolautosubmit`. An agent can fill
the form; only a human can press Send.

## Adding your own domain

Two files carry the whole domain. Everything else — `src/lib/webmcp/{register,confirm,log,
runtime}.ts`, `src/lib/store/{backend,ratelimit}.ts`, the API route shapes, the confirm card,
the SSE plumbing — is domain-agnostic and untouched by a fork.

1. **`src/lib/types.ts`** — replace `CaseItem` / `Proposal` / `CaseReport` / `CaseState` with
   your own shape. Keep `ownerKey` / `partnerKey` / `version` on whatever your top-level state
   type is called; the store (`src/lib/store/index.ts`, `src/lib/store/actions.ts`) is written
   against those three fields plus whatever you add.
2. **`src/lib/store/actions.ts`** — the `mutate()` switch is the one place server-side business
   logic lives. Add your own action types to `CaseActionType`, one `case` per type, and put each
   one in `OWNER_ONLY` or `PARTNER_ONLY` (or neither, if both roles can do it).
3. **`src/lib/webmcp/tools.ts`** — one factory per tool, the same shape as the eight already
   here. Read tools get `annotations: READ`; every write tool calls `ctx.confirm(...)` first.
   Put every result's provenance in a `source` field (`sourceRef()` in this file is a
   placeholder pointing at the case store itself — point it at your real dataset instead, the
   same `{ dataset, query, rows }` shape `out-of-service` used for its MTA citations). Update
   `OWNER_ONLY` / `PARTNER_ONLY` in this file to match your new tool names.
4. **`src/lib/webmcp/contracts.ts`** — extend `CaseActions` with your new mutations. If your
   domain reads external data (an API, a dataset), add a `CaseReaders` interface here the way
   `out-of-service` had `TripReaders`, and thread it through `WebMCPTools` the same way `actions`
   is threaded now.
5. Adjust `src/components/case/CaseView.tsx` to render your new fields, and
   `evals/fixtures/*.json` to cover your new tools (`npx vitest run evals` checks that every
   registered tool has at least one fixture, both roles are covered, and every fixture's
   `arguments` validate against that tool's real `inputSchema` — see `evals/README.md`).

## Running it

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`, create a case, then open the owner URL it redirects you to in one
tab and the partner URL (`PartnerLink` on the owner's page) in a second tab. In each tab, open
Chrome DevTools > Application > WebMCP (Chrome 149+, or turn on
`chrome://flags/#enable-webmcp-testing`) to see the two different tool lists.

`pnpm build` and `pnpm typecheck` (`tsc --noEmit`) should both stay clean; `pnpm test`
(`vitest run`) runs the store, webmcp-lifecycle and evals suites, 88 tests over 4 files as
shipped.

## Deploying

```bash
vercel
vercel integration add upstash/upstash-kv --plan free -m primaryRegion=iad1 --non-interactive
```

`src/lib/store/backend.ts` picks its backend at runtime from env vars, in this order:
`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, then `KV_REST_API_URL` +
`KV_REST_API_TOKEN` (Vercel KV, identical REST protocol), then `BLOB_READ_WRITE_TOKEN` (Vercel
Blob, one immutable object per case version), then an in-memory `Map` if none of those are set
(fine for local dev, not shared across serverless instances, so don't ship to production without
one of the above). No new dependency is needed for any of the three: each is plain `fetch`
against its documented REST API.

## The `executeTool` JSON-string note

In Chrome 149, the second argument to `document.modelContext.executeTool` is a JSON **string**,
not an object (this is being tracked as an ambiguity upstream; passing an object throws
`UnknownError: Failed to parse input arguments`):

```js
const tools = await document.modelContext.getTools();
const tool = tools.find((t) => t.name === "list_items");
await document.modelContext.executeTool(tool, JSON.stringify({}));
```

`registerTool`'s own `execute` callback still receives a plain parsed object
(`(input: Record<string, unknown>, options?) => ...`), same as every tool factory in
`src/lib/webmcp/tools.ts` — the string-vs-object distinction is only at the `executeTool` call
site, which matters for manual testing and for the evals harness, not for tool authors.

## The DESIGN.md pipeline

`DESIGN.md` in this repo is kept as a worked example of what a design-token extraction pipeline
(`uicraft`, or any tool that reads a reference brand and emits a tokens file) produces: exact
color, type, spacing, radius and motion tokens, written the way `out-of-service`'s transit-signage
look was specified. It describes that original visual system, not this template's (deliberately
plainer) UI, since the domain-specific components that used its line-bullet and reliability-tier
tokens were removed along with the transit domain. Read it as the reference for the *shape* a
DESIGN.md should take — a real fork should regenerate its own from whatever visual reference it
picks, then wire the tokens into `src/app/globals.css`'s `@theme` block the same way this one
does.

## Evals

`evals/` ships the same two-tier eval structure Chrome's WebMCP evals guidance describes: a
deterministic suite (`evals/evals.test.ts`, runs in `vitest`) that checks every fixture's
expected tool call actually exists, is registered for that fixture's role, and has arguments
that validate against the tool's real `inputSchema`; and a probabilistic half (fixtures fed to a
real model against the live page) described in `evals/README.md`. Twelve fixtures ship, covering
all eight tools and both roles, including one negative fixture
(`12-partner-cannot-accept.json`) that asserts a partner session cannot even see `accept_change`,
let alone call it.

## License

MIT, see `LICENSE`.
