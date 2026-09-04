---
version: alpha
name: Pill-Round-design-system
description: A pharmacy round card / medication administration record (MAR) aesthetic. Warm off-white paper canvas, near-black ink, one clinical teal accent, square panels with a 2px control radius, hairline borders, no shadows, no gradients, tabular numerals everywhere a number appears. Reads like a printed MAR sheet clipped to a chart, not a SaaS dashboard.
structure_source: "Structure adapted from Vercel DESIGN.md, awesome-design-md, https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/vercel/DESIGN.md"
research_source: "Surface, ink, tier colours, type, spacing, and the Web Interface Guidelines checklist below are merged in verbatim from the research pass in docs/DESIGN.md, which scouted aura.build (https://www.aura.build) — the guidelines are upstream vercel-labs/web-interface-guidelines surfaced via an aura.build skill; typography/layout prose was mined from two aura.build design systems ('Portfolio - Technical System' by Sourasith Phomhome, 'Enterprise Payment Infrastructure' by Meng To — their color stories were rejected, their prose was not). This file is the single source of truth."

colors:
  surface: "#F2EFE9"
  surface-soft: "#ECE8DC"
  surface-inset: "#E4DFCE"
  ink: "#0A0A0A"
  ink-muted: "#4A4A46"
  ink-subtle: "#7A776D"
  hairline: "#DDD8C8"
  hairline-strong: "#B8B29C"
  accent: "#0B6E6E"
  accent-soft: "#DCEDEB"
  accent-on: "#FFFFFF"
  reliable: "#0C6B3D"
  watch: "#8A5A00"
  out: "#7A1010"

typography:
  display-xl:
    fontFamily: Archivo, Helvetica, Arial, sans-serif
    fontSize: 48px
    fontWeight: 700
    lineHeight: 52px
    letterSpacing: -0.5px
    fontFeature: '"tnum", "lnum"'
  display-lg:
    fontFamily: Archivo, Helvetica, Arial, sans-serif
    fontSize: 32px
    fontWeight: 700
    lineHeight: 36px
    letterSpacing: -0.3px
    fontFeature: '"tnum", "lnum"'
  headline:
    fontFamily: Archivo, Helvetica, Arial, sans-serif
    fontSize: 24px
    fontWeight: 700
    lineHeight: 28px
    letterSpacing: 0px
  subhead:
    fontFamily: Archivo, Helvetica, Arial, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: 0px
  body:
    fontFamily: Archivo, Helvetica, Arial, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 22px
    letterSpacing: 0px
    fontFeature: '"tnum", "lnum"'
  body-strong:
    fontFamily: Archivo, Helvetica, Arial, sans-serif
    fontSize: 16px
    fontWeight: 600
    lineHeight: 22px
    letterSpacing: 0px
    fontFeature: '"tnum", "lnum"'
  body-sm:
    fontFamily: Archivo, Helvetica, Arial, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
    fontFeature: '"tnum", "lnum"'
  caption:
    fontFamily: Archivo, Helvetica, Arial, sans-serif
    fontSize: 12px
    fontWeight: 600
    lineHeight: 16px
    letterSpacing: 0.6px
    textTransform: uppercase
  chart-figure:
    fontFamily: Archivo, Helvetica, Arial, sans-serif
    fontSize: 16px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0px
    fontFeature: '"tnum", "lnum", "zero"'
  button:
    fontFamily: Archivo, Helvetica, Arial, sans-serif
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0.2px
    textTransform: uppercase

rounded:
  none: 0px
  control: 2px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 64px

components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: 10px 16px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline-strong}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: 10px 16px
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-on}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: 10px 16px
  text-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline-strong}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: 10px 12px
    height: 40px
  tier-label-reliable:
    textColor: "{colors.reliable}"
    typography: "{typography.body-strong}"
  tier-label-watch:
    textColor: "{colors.watch}"
    typography: "{typography.body-strong}"
  tier-label-out:
    textColor: "{colors.out}"
    typography: "{typography.body-strong}"
  chip-accent:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
    padding: 2px 8px
  chip-simulated:
    backgroundColor: "{colors.surface-inset}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
    padding: 2px 8px
  table-header:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    borderColor: "{colors.hairline-strong}"
    rounded: "{rounded.none}"
    padding: 8px 12px
  table-cell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.chart-figure}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.none}"
    padding: 8px 12px
  timeline-rail:
    backgroundColor: "{colors.hairline-strong}"
    width: 2px
  timeline-node-reliable:
    backgroundColor: "{colors.reliable}"
    rounded: "{rounded.none}"
    size: 8px
  timeline-node-watch:
    backgroundColor: "{colors.watch}"
    rounded: "{rounded.none}"
    size: 8px
  timeline-node-out:
    backgroundColor: "{colors.out}"
    rounded: "{rounded.none}"
    size: 8px
  round-card-cell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline-strong}"
    typography: "{typography.chart-figure}"
    rounded: "{rounded.none}"
    padding: 10px 8px
  top-nav:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline-strong}"
    typography: "{typography.body-sm}"
    height: 56px
    padding: 0px 16px
  footer:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    padding: 32px 16px
---

## Overview

Pill Round reads like a paper medication administration record clipped to the fridge, not a SaaS
dashboard. The canvas is `{colors.surface}` (#F2EFE9), a warm off-white paper tone that never goes
pure white; text is `{colors.ink}` (#0A0A0A), never pure black. The only chromatic accent on chrome
is clinical teal `{colors.accent}` (#0B6E6E), reserved for links, the primary interactive
affordance, focus rings, and the accent button. Everything else in the interface is monochrome:
paper, ink, and two graded warm grays for hairlines and muted text.

Panels are square. Cards, chips, tables, and timeline nodes carry `{rounded.none}` (0px) — no
exceptions. Interactive controls that a finger or cursor presses — buttons and text inputs — get a
small `{rounded.control}` (2px) so the tap target reads as "pressable" without softening into a
consumer-app pill.

Depth is built from hairlines, not shadows. `{colors.hairline}` (1px, #DDD8C8) separates table rows
and card edges; `{colors.hairline-strong}` (#B8B29C) frames buttons, inputs, cards, and the top nav.
There is no drop shadow, no blur, no gradient anywhere in this system — a chart does not float.

Type is Archivo throughout — a grotesk with true tabular lining figures, which matters because this
product is mostly numbers and structured rows: doses, schedules, ages, timestamps. Every context
that renders a number turns on `"tnum" "lnum"` (tabular, lining figures) via
`font-variant-numeric: tabular-nums`, so digits never jitter in width as they update — exactly like
a printed dosage table where each column lines up.

**Key characteristics:**
- Paper canvas (`{colors.surface}` #F2EFE9), ink text (`{colors.ink}` #0A0A0A) — 17.25:1 contrast, WCAG AAA, computed.
- Clinical teal (`{colors.accent}` #0B6E6E) is the single chromatic UI accent — 5.27:1 contrast against surface, computed. Nothing else in the chrome carries a saturated hue.
- Three status tiers — reliable (ok) / watch / out — set directly as ink-weight colored text on the paper surface, each individually checked against `{colors.surface}` below.
- Zero radius on every panel, card, chip, and table; a 2px control radius on buttons and inputs only.
- Hairline borders carry every edge; zero shadows, zero gradients, zero `backdrop-filter`.
- Tabular numerals (`"tnum" "lnum"`) on every numeric field: doses, ages, timestamps, version counters.
- A dedicated print stylesheet renders the round card as black-on-white with no chrome, for a
  caregiver who wants a physical sheet on the counter.

## Colors

### Surface
- **Paper** (`{colors.surface}` — `#F2EFE9`): the default background for every screen. Warm off-white, never pure white.
- **Paper Soft** (`{colors.surface-soft}` — `#ECE8DC`): table headers, footer band, one step warmer/darker than paper for light sectioning.
- **Paper Inset** (`{colors.surface-inset}` — `#E4DFCE`): recessed wells — disabled fields, held-medication row background, simulated-only chip.
- **Hairline** (`{colors.hairline}` — `#DDD8C8`): 1px dividers — table rows, list separators.
- **Hairline Strong** (`{colors.hairline-strong}` — `#B8B29C`): 1px borders on buttons, inputs, cards, nav.

### Text
- **Ink** (`{colors.ink}` — `#0A0A0A`): headlines, body, primary numerals. Contrast against `{colors.surface}` = **17.25:1** (WCAG AAA, computed).
- **Ink Muted** (`{colors.ink-muted}` — `#4A4A46`): secondary text, table headers, captions. Contrast against `{colors.surface}` = **7.76:1** (computed, WCAG AAA).
- **Ink Subtle** (`{colors.ink-subtle}` — `#7A776D`): timestamps, placeholder text, lowest-emphasis labels. Contrast against `{colors.surface}` = **3.90:1** (computed — passes AA large text/UI components only; never body copy at this weight).

### Accent
- **Clinical Teal** (`{colors.accent}` — `#0B6E6E`): the single chromatic accent for chrome — primary links, the accent CTA, focus rings, the active-state underline. Contrast against `{colors.surface}` (#F2EFE9) = **5.27:1** (computed, WCAG AA for normal text and UI components).
- **Accent Soft** (`{colors.accent-soft}` — `#DCEDEB`): tinted background for the accent chip and the "active" schedule cell in the round card.

### Semantic status tiers
Each tier's foreground color is computed against `{colors.surface}` (#F2EFE9), not guessed. All
three pass WCAG AA (4.5:1) directly as ink-weight text on the paper surface — no separate chip fill
is required to make a tier legible. Names read as clinical outcomes, not traffic-light metaphors:
- **Reliable / OK** (`{colors.reliable}` — `#0C6B3D`, dark green): dose confirmed, no open flag. Contrast against `{colors.surface}` = **5.74:1** (computed).
- **Watch** (`{colors.watch}` — `#8A5A00`, dark amber): a warning-level interaction or a proposal awaiting review. Contrast against `{colors.surface}` = **5.16:1** (computed).
- **Out / Boxed / Contraindicated** (`{colors.out}` — `#7A1010`, deep red): a boxed-warning or contraindicated interaction, or a held/stopped medication. Contrast against `{colors.surface}` = **9.58:1** (computed) — deliberately the highest-contrast tier since it is the most consequential state.

Tier state never carries meaning by color alone: a tier label always pairs its color with the tier
word itself ("Reliable", "Watch", "Boxed") and, where space allows, an icon.

## Typography

### Font Family
**Archivo** (Google Fonts, loadable via `next/font/google`) carries every size in the system —
display, body, caption, and numerals. Chosen because Archivo ships true tabular lining figures out
of the box and needs no substitute. Load weights 400 / 600 / 700 only; the system never goes lighter
than 400 or beyond 700.

Enable `font-variant-numeric: tabular-nums` (equivalently `font-feature-settings: "tnum", "lnum"`)
on every numeric context — doses, ages, timestamps, version counters — via the
`{typography.chart-figure}` token or by adding the feature flag to any token rendering a number.
Without it, digits shift width as a list re-sorts and the "printed chart" illusion breaks.

### Hierarchy

| Token | Size | Weight | Line Height | Tracking | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 48px | 700 | 52px | -0.5px | Patient label on the case header |
| `{typography.display-lg}` | 32px | 700 | 36px | -0.3px | Section headline ("Medication list", "Flags") |
| `{typography.headline}` | 24px | 700 | 28px | 0 | Card and panel titles |
| `{typography.subhead}` | 18px | 600 | 24px | 0 | Medication generic name row, panel sub-title |
| `{typography.body}` | 16px | 400 | 22px | 0 | Default paragraph and list text, tabular numerals on |
| `{typography.body-strong}` | 16px | 600 | 22px | 0 | Emphasized body, tier labels, status chips |
| `{typography.body-sm}` | 14px | 400 | 20px | 0 | Secondary text, nav links, table body |
| `{typography.caption}` | 12px | 600 | 16px | 0.6px, uppercase | Chip labels, table headers, timestamps |
| `{typography.chart-figure}` | 16px | 600 | 20px | 0 | Any standalone number: dose, age, version |
| `{typography.button}` | 14px | 600 | 20px | 0.2px, uppercase | All button labels |

### Principles
- **Tabular numerals are mandatory, not optional**, everywhere a digit appears next to another digit that will update (dose amounts, ages, version counters).
- **Uppercase is reserved** for captions and button labels only — never headlines, never body.
- **No italics, no serif fallback.** Archivo's fallback stack is `Helvetica, Arial, sans-serif` — never a serif substitute, which would read as editorial rather than clinical.
- **Negative tracking only at display sizes** (-0.3 to -0.5px); body and caption sit at 0 or slightly positive (caption +0.6px, matching a chart-label convention).

## Layout

### Spacing System
- **Base unit**: 4px, an 8pt grid.
- **Tokens**: `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 64px.
- Card and table-cell interior padding sits at `{spacing.md}` (16px) by default; dense round-card cells tighten to `{spacing.sm}` (12px).

### Grid & Container
- Max content width ~1360px for the case view, split into a wider medication/flags column and a narrower proposals/notes rail — this is a working chart, not a marketing page.
- Round-card grid runs full-width inside the container with `{spacing.md}` gutters, one row per medication, one column per time-of-day.

## Borders & Shadows
No shadows exist in this system. Every elevation cue is a `{colors.hairline}` or
`{colors.hairline-strong}` 1px border. A card sits on the page because it has a visible edge, not
because it floats above one.

## Motion
Motion is functional, not decorative — it signals a state change (a flag appears, a proposal is
accepted) rather than delighting.
- **Duration**: 120–150ms for color/state transitions (status text recoloring, button press). No motion longer than 200ms.
- **Easing**: linear or ease-out only. No spring, no bounce, no overshoot.
- **Never `transition: all`** — animate the specific property that changed (`color`, `background-color`, `border-color`, `transform`), per the anti-pattern list below.
- **Respect `prefers-reduced-motion`**: disable transitions and fall back to an instant swap.

## Components

### Buttons
- **`button-primary`** — ink fill, paper text, `{rounded.control}` 2px, uppercase `{typography.button}`. The default action.
- **`button-secondary`** — paper fill, ink text, 1px `{colors.hairline-strong}` border, `{rounded.control}`. Paired secondary action.
- **`button-accent`** — teal fill, white text, `{rounded.control}`. Reserved for the single most important action per screen (e.g. "Print round card"). Never more than one accent button visible at a time.

### Inputs
- **`text-input`** — paper background, 1px `{colors.hairline-strong}` border, `{rounded.control}` 2px, ink text, 40px height. Focus state: border switches to `{colors.accent}` at 2px — no glow, no shadow ring, per the Focus States guideline below.

### Tier labels
- Status is set directly as colored `{typography.body-strong}` text (`tier-label-reliable`,
  `tier-label-watch`, `tier-label-out`) on the paper surface — no fill required, since all three pass
  AA directly. Always pair the color with the tier word itself ("Reliable", "Watch", "Boxed") and,
  where space allows, an icon; never color alone.

### Chips
- `chip-accent` — `{colors.accent-soft}` fill with `{colors.accent}` text, `{rounded.none}`. Used for "active" / "pending review" badges.
- `chip-simulated` — `{colors.surface-inset}` fill with `{colors.ink-muted}` text, `{rounded.none}`, always reading exactly `SIMULATED`. The only marker used on demo-data controls; never a color the user could mistake for a clinical severity tier.

### Tables
- **`table-header`** — paper-soft background, ink-muted uppercase caption text, bottom border `{colors.hairline-strong}`, `{rounded.none}`.
- **`table-cell`** — paper background, ink text set in `{typography.chart-figure}` for any numeric column (dose, age), `{typography.body-sm}` for text columns. Row divider `{colors.hairline}` 1px, never zebra-striped. A held or stopped medication row sets its text `line-through` and drops to `{colors.ink-subtle}`.

### Timelines
- **`timeline-rail`** — a 2px vertical `{colors.hairline-strong}` line connecting events.
- **`timeline-node-*`** — an 8px square (`{rounded.none}`) in the tier color, placed on the rail at each event to show that entry's kind (counsel note, proposal, report).

### Round card
- **`round-card-cell`** — a grid cell keyed by medication x time-of-day (morning / noon / evening / bedtime), paper background, hairline-strong border, `{typography.chart-figure}`. The active/current dose window highlights with `{colors.accent-soft}` fill. Print output drops all fill colors and borders to solid black hairlines on white — see the print section below.

### Forms
- Labels set in `{typography.caption}` above the field, ink-muted color, uppercase, 0.6px tracking. Every input needs `autocomplete` and a meaningful `name`; every control needs a `<label>` or `aria-label`.
- Error states use `{colors.out}` text under the field, focus moves to the first invalid field on submit, never a red border glow — consistent with the "hairline, not shadow" elevation rule.
- Placeholders end with `…`, not `...`, and show an example pattern.

## Print

The round card is the one surface designed to leave the screen. `@media print` rules apply only to
the `.round-card` root and its descendants; everything else (nav, panels, forms, the WebMCP tools
panel) is hidden with `display: none` under print.

```css
@media print {
  body * {
    visibility: hidden;
  }
  .round-card, .round-card * {
    visibility: visible;
  }
  .round-card {
    position: absolute;
    inset: 0;
    background: #ffffff;
    color: #000000;
    box-shadow: none;
  }
  .round-card table, .round-card th, .round-card td {
    border-color: #000000 !important;
    background: #ffffff !important;
    color: #000000 !important;
  }
  .round-card .chip-accent, .round-card .chip-simulated {
    background: #ffffff !important;
    color: #000000 !important;
    border: 1px solid #000000;
  }
  @page {
    margin: 0.5in;
  }
}
```

- No color, no fill, no chrome survives to paper: black ink, white paper, 1px black hairlines only.
- The print sheet keeps the patient label, age, and the disclaimer footer text — a printed sheet
  without provenance is worse than no sheet.
- `window.print()` is the only print entry point; there is no dedicated print route.

## Interface Guidelines (verbatim)

Source: `vercel-labs/web-interface-guidelines`, surfaced via an aura.build skill
(`https://www.aura.build/skills/77b75b55-6806-4750-84b3-1e9c00b391d8/web-interface-guidelines`,
upstream `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`).
Reproduced in full for the sections that apply to a data-dense, accessible, no-motion product; every
rule below is binding for this codebase, not aspirational.

> ### Accessibility
> - Icon-only buttons need `aria-label`
> - Form controls need `<label>` or `aria-label`
> - Interactive elements need keyboard handlers (`onKeyDown`/`onKeyUp`)
> - `<button>` for actions, `<a>`/`<Link>` for navigation (not `<div onClick>`)
> - Images need `alt` (or `alt=""` if decorative)
> - Decorative icons need `aria-hidden="true"`
> - Async updates (toasts, validation) need `aria-live="polite"`
> - Use semantic HTML (`<button>`, `<a>`, `<label>`, `<table>`) before ARIA
> - Headings hierarchical `<h1>`–`<h6>`; include skip link for main content
> - `scroll-margin-top` on heading anchors
>
> ### Focus States
> - Interactive elements need visible focus: `focus-visible:ring-*` or equivalent
> - Never `outline-none` / `outline: none` without focus replacement
> - Use `:focus-visible` over `:focus` (avoid focus ring on click)
> - Group focus with `:focus-within` for compound controls
> - Sticky headers/footers/overlays must not cover the focused element
>
> ### Forms
> - Inputs need `autocomplete` and meaningful `name`
> - Use correct `type` (`email`, `tel`, `url`, `number`) and `inputmode`
> - Never block paste (`onPaste` + `preventDefault`)
> - Labels clickable (`htmlFor` or wrapping control)
> - Submit button stays enabled until request starts; spinner during request
> - Errors inline next to fields; focus first error on submit
> - Placeholders end with `…` and show example pattern
>
> ### Typography
> - `…` not `...`
> - Curly quotes `"` `"` not straight `"`
> - Non-breaking spaces: `10&nbsp;MB`, `⌘&nbsp;K`, brand names
> - Loading states end with `…`: `"Loading…"`, `"Saving…"`
> - `font-variant-numeric: tabular-nums` for number columns/comparisons
> - Use `text-wrap: balance` or `text-pretty` on headings (prevents widows)
>
> ### Content Handling
> - Text containers handle long content: `truncate`, `line-clamp-*`, or `break-words`
> - Flex children need `min-w-0` to allow text truncation
> - Handle empty states—don't render broken UI for empty strings/arrays
> - User-generated content: anticipate short, average, and very long inputs
>
> ### Content & Copy
> - Active voice: "Add the medication" not "The medication will be added"
> - Title Case for headings/buttons (Chicago style)
> - Numerals for counts: "11 medications" not "eleven"
> - Specific button labels: "Accept Proposal" not "Continue"
> - Error messages include fix/next step, not just problem
> - Second person; avoid first person
> - `&` over "and" where space-constrained
>
> ### Anti-patterns (flag these)
> - `user-scalable=no` or `maximum-scale=1` disabling zoom
> - `transition: all`
> - `outline-none` without focus-visible replacement
> - Inline `onClick` navigation without `<a>`
> - `<div>` or `<span>` with click handlers (should be `<button>`)
> - Images without dimensions
> - Form inputs without labels
> - Icon buttons without `aria-label`
> - Hardcoded date/number formats (use `Intl.*`)

## Do's and Don'ts

### Do
- Keep `{colors.surface}` (#F2EFE9) as the only background color for reading surfaces. Warm off-white, never pure white, never a colored tint.
- Reserve `{colors.accent}` (#0B6E6E) for the single chromatic accent on chrome: links, focus, one accent button per screen.
- Turn on `font-variant-numeric: tabular-nums` for every number that sits next to another number or updates over time.
- Use `{rounded.none}` (0px) for every panel, card, chip, table, and timeline node; `{rounded.control}` (2px) only on buttons and inputs.
- Carry every elevation cue with a `{colors.hairline}` or `{colors.hairline-strong}` border, never a shadow.
- Set tier state directly as colored text, always paired with the tier word and, where space allows, an icon.
- Mark every demo-only control with the `chip-simulated` chip reading exactly `SIMULATED`.

### Don't
- Don't introduce a second chromatic UI accent.
- Don't round panels, cards, chips, or tables beyond 0px, and never use a pill shape anywhere in this system.
- Don't add box-shadow, blur, `backdrop-filter`, or gradient anywhere in the system.
- Don't animate with `transition: all`; animate the specific property that changed.
- Don't render a status tier below its computed contrast ratio; if a new tint is proposed, compute its ratio against `{colors.surface}` before shipping it, don't eyeball it.
- Don't invent colors, fonts, radii, or spacing values outside this token set. If a new component needs a token that doesn't exist here, add it to this file first, in the same format, with a computed contrast ratio if it carries text.
- Don't set body copy or numerals in a serif or a display-only weight; body stays at 400, numerals in `{typography.chart-figure}` at 600.
- Don't use the phrase "medical advice" anywhere in the product. Say "for discussion with a pharmacist" instead.
