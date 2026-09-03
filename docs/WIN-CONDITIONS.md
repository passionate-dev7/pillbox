# Win conditions

This repo is not itself a hackathon submission. It is the extracted, domain-stripped spine of
`out-of-service` (WebMCP Challenge entry, scored 16.9/20 with the judge panel), published as a
public template so two *other* Devpost entries under different accounts (`docs/NEXT-ENTRIES.md`
in the `webmcp` project: Order to Correct, Pill Round) can clone it tonight and start from a
working two-role WebMCP app instead of an empty Next.js project.

- **Scoreboard**: not competing on its own scoreboard. It exists to raise the floor of the two
  entries that do: both were scoped assuming this fork exists (`docs/NEXT-ENTRIES.md`, "Fork
  recipe (30 min)").
- **Bar to beat**: `out-of-service` itself, 16.9/20. The fork must not regress any of the
  properties that scored it: role-derived capability keys (never a self-declared label),
  confirm-before-mutate on every write tool, a declarative form with no `toolautosubmit`,
  server-side role re-checks independent of which tools a session was handed, SSE-shared state,
  spotlighted free text.
- **Asset we will own**: the spine itself — `kamalbuilds/webmcp-two-agent-spine`, a public
  GitHub template repo. The asset is the working code plus the "how to add a domain" README
  section, not a hosted deployment.
- **Off-platform buyer**: none; this is infrastructure for two sibling submissions, not a
  product with its own user.
- **Single entry**: N/A here. The eligibility risk this repo exists to remove is stated in
  `docs/NEXT-ENTRIES.md`: one Devpost account per submission, so Order to Correct and Pill Round
  ship from two different accounts, each forking this repo independently rather than sharing one
  submission.
- **Verb the brief names**: "clone it and have a working two-role WebMCP app in minutes."
- **Our product performs that verb**: `pnpm install && pnpm dev` boots a case page where an
  owner and a partner, in two browser tabs, each get an asymmetric WebMCP tool set, propose and
  confirm a change, and see it land over SSE, with zero domain code written yet.
- **Metric plan**: `npx tsc --noEmit`, `npx vitest run` (evals + store + webmcp lifecycle
  suites), and `pnpm build` all pass clean before this is pushed; that is the fork-readiness bar.
- **Live by**: tonight (2026-09-03 close window per `docs/NEXT-ENTRIES.md`), so the two forking
  entries have time left to build their own domain on top of it.
- **Deviation from research**: `docs/NEXT-ENTRIES.md`'s fork recipe says "delete data/ and
  src/lib/index, src/lib/route, src/lib/live, keep src/lib/store... DESIGN.md, globals.css" — this
  repo does exactly that, plus generalises the domain nouns (trip/rider/companion to
  case/owner/partner) and the tool set (route/elevator tools to a generic
  item/propose/accept/note/report set) so a fork does not have to un-rename transit vocabulary
  before writing its own.
