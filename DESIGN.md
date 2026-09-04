---
version: alpha
name: Pillbox-design-system
description: A modern clinical app, not a printout. White canvas, near-black ink, one emerald primary, a dark contrast header band that carries the patient label and role chip. Humanist sans (Manrope) for display and body, monospace (JetBrains Mono) for doses, times, and set_ids. Medication rows are soft-radius cards with a left status stripe; flags are bordered callouts with a severity pill and a quiet mono FDA sentence; the round card is a clean time-of-day grid. Adapted from the Supabase design language (docs/DESIGN-SOURCE-supabase.md): white/near-black/emerald, not paper/ink/teal, and not white-broadsheet/serif.
structure_source: "Structure adapted from docs/DESIGN-SOURCE-supabase.md, itself sourced from Vercel DESIGN.md / awesome-design-md conventions."
research_source: "Tokens adapted from the Supabase visual language captured in docs/DESIGN-SOURCE-supabase.md. Branding not copied: no Supabase wordmark, no Circular font. Domain severity colors (boxed/warning/reliable) are Pillbox's own, chosen for AA contrast on white."

colors:
  primary: "#3ecf8e"
  primary-deep: "#24b47e"
  on-primary: "#171717"
  ink: "#171717"
  ink-mute: "#707070"
  ink-faint: "#9a9a9a"
  on-dark: "#ffffff"
  canvas: "#ffffff"
  canvas-soft: "#fafafa"
  canvas-night: "#1c1c1c"
  canvas-night-soft: "#242424"
  hairline: "#e5e7eb"
  hairline-strong: "#c7c7c7"
  out: "#b42318"
  out-soft: "#fef2f1"
  watch: "#b54708"
  watch-soft: "#fffaeb"
  reliable: "#067647"
  reliable-soft: "#ecfdf3"
  held: "#9a9a9a"
  sim: "#6b01c2"

typography:
  display-lg:
    fontFamily: "var(--font-manrope), Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.8px
  display-md:
    fontFamily: "var(--font-manrope), Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.4px
  heading-lg:
    fontFamily: "var(--font-manrope), Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: 0
  heading-md:
    fontFamily: "var(--font-manrope), Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0.02em
    textTransform: uppercase
  body:
    fontFamily: "var(--font-manrope), Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-sm:
    fontFamily: "var(--font-manrope), Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0
  label:
    fontFamily: "var(--font-manrope), Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.08em
    textTransform: uppercase
  button:
    fontFamily: "var(--font-manrope), Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.0
    letterSpacing: 0.01em
  mono:
    fontFamily: "var(--font-jbmono), 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0.01em
    fontFeature: '"tnum" 1'

rounded:
  control: 8px
  card: 8px
  pill: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px

shadow:
  card: "0 1px 2px rgba(0,0,0,.06)"
---

## Overview

Pillbox reads as a modern clinical app: a white body, near-black ink, and a single emerald
event color. The one deliberate departure from an all-white page is a **dark contrast band**
(`{colors.canvas-night}` `#1c1c1c`) at the top of every round, carrying the patient label and the
current role as an emerald chip. That band is the app's signature: it says "you are inside a
system," the way a lab or pharmacy dashboard would, and it is what separates this entry from a
warm-paper MAR sheet or a white broadsheet.

Below the band, everything is white (`{colors.canvas}`) or barely-tinted white
(`{colors.canvas-soft}`), with hairline borders (`{colors.hairline}` `#e5e7eb`) doing the
structural work instead of heavier panel frames. Medication rows are soft `{rounded.card}` 8px
cards with a colored left stripe for status, not a table row. Flags are bordered callouts with the
severity word in a pill and the FDA sentence set in a quiet mono block. The round card is a clean
grid: medication rows against time-of-day columns, check marks in the cells that apply.

**Key characteristics:**
- One chromatic event: emerald `{colors.primary}` `#3ecf8e` (CTA) / `{colors.primary-deep}`
  `#24b47e` (pressed, and the accessible emerald for text-on-white use).
- A dark `{colors.canvas-night}` header band per round: the one signature dark surface in the
  whole app.
- Domain severity colors are their own ladder, not the brand emerald: out `#b42318`, watch
  `#b54708`, reliable `#067647`, all chosen to hold 4.5:1+ on white.
- Manrope for display and body (humanist, rounder than a grotesk); JetBrains Mono for anything
  that is a dose, a time, or a set_id.
- 8px radius everywhere: cards, buttons, inputs. No square corners, no pill-shaped buttons.
- Shadows never exceed `{shadow.card}` `0 1px 2px rgba(0,0,0,.06)`. No gradients.

## Colors

### Brand & Accent
- **Primary** (`{colors.primary}` `#3ecf8e`): the one filled-button and chip-accent color.
  Reserved for the header-band role chip and primary CTAs.
- **Primary Deep** (`{colors.primary-deep}` `#24b47e`): pressed state, and the version used
  wherever emerald sits on top of text-weight contrast needs (see contrast table: `#3ecf8e` on
  white text fails AA, `#24b47e` on white body and on dark surfaces both pass).

### Surface
- **Canvas** (`{colors.canvas}` `#ffffff`): default page and card background.
- **Canvas Soft** (`{colors.canvas-soft}` `#fafafa`): panel header strips, alternating rows.
- **Canvas Night** (`{colors.canvas-night}` `#1c1c1c`): the header band. Used nowhere else, so it
  stays a signal, not a texture.
- **Canvas Night Soft** (`{colors.canvas-night-soft}` `#242424`): nested chrome inside the band
  (e.g. a secondary stat inside the dark header).
- **Hairline** (`{colors.hairline}` `#e5e7eb`) / **Hairline Strong** (`{colors.hairline-strong}`
  `#c7c7c7`): borders on cards, table dividers, input strokes.

### Text
- **Ink** (`{colors.ink}` `#171717`): default body text on white.
- **Ink Mute** (`{colors.ink-mute}` `#707070`): secondary text, meta, helper copy.
- **Ink Faint** (`{colors.ink-faint}` `#9a9a9a`): tertiary and disabled text. Non-text
  decoration use only (2.81:1, below AA for text; do not set body copy in this token).
- **On Primary** (`{colors.on-primary}` `#171717`): ink on the emerald CTA, never white.
- **On Dark** (`{colors.on-dark}` `#ffffff`): text on the canvas-night header band.

### Domain Severity
- **Out** (`{colors.out}` `#b42318`) / **Out Soft** (`{colors.out-soft}` `#fef2f1`): boxed warning
  / contraindicated. Stopped medication stripe.
- **Watch** (`{colors.watch}` `#b54708`) / **Watch Soft** (`{colors.watch-soft}` `#fffaeb`):
  warning-tier interaction. Held medication stripe.
- **Reliable** (`{colors.reliable}` `#067647`) / **Reliable Soft** (`{colors.reliable-soft}`
  `#ecfdf3`): no material interaction found. Active medication stripe.
- **Held** (`{colors.held}` `#9a9a9a`): neutral grey for a stopped/held row's status text when
  severity does not apply.
- **Sim** (`{colors.sim}` `#6b01c2`): a simulated/demo control is never mistaken for a real one.

## Contrast Table (WCAG 2.1, computed)

| Foreground | Background | Ratio | Use |
|---|---|---|---|
| `{colors.ink}` `#171717` | `{colors.canvas}` `#ffffff` | 17.93:1 | Body text |
| `{colors.ink}` `#171717` | `{colors.canvas-soft}` `#fafafa` | 17.18:1 | Body text on soft panels |
| `{colors.ink-mute}` `#707070` | `{colors.canvas}` `#ffffff` | 4.95:1 | Secondary text (AA) |
| `{colors.ink-mute}` `#707070` | `{colors.canvas-soft}` `#fafafa` | 4.74:1 | Secondary text (AA) |
| `{colors.ink-faint}` `#9a9a9a` | `{colors.canvas}` `#ffffff` | 2.81:1 | Non-text decoration only, fails AA |
| `{colors.on-dark}` `#ffffff` | `{colors.canvas-night}` `#1c1c1c` | 17.04:1 | Header band text |
| `{colors.primary}` `#3ecf8e` | `{colors.canvas-night}` `#1c1c1c` | 8.54:1 | Role chip fill on band (AA) |
| `{colors.on-primary}` `#171717` | `{colors.primary}` `#3ecf8e` | 8.98:1 | CTA text on primary (AA) |
| `{colors.on-primary}` `#171717` | `{colors.primary-deep}` `#24b47e` | 6.75:1 | CTA text on pressed state (AA) |
| `{colors.out}` `#b42318` | `{colors.canvas}` `#ffffff` | 6.57:1 | Boxed/out severity text (AA) |
| `{colors.watch}` `#b54708` | `{colors.canvas}` `#ffffff` | 5.43:1 | Watch severity text (AA) |
| `{colors.reliable}` `#067647` | `{colors.canvas}` `#ffffff` | 5.69:1 | Reliable severity text (AA) |

`{colors.hairline}` on white is 1.24:1 and is used for non-text borders only, never for text.

## Typography

### Font Family
Display and body: **Manrope**, loaded via `next/font/google` as `--font-manrope`, bound on
`<html>`. Manrope is a humanist geometric sans with a rounder aperture than a grotesk, which
reads as approachable clinical rather than a printed chart or a broadsheet serif.

Doses, times, set_ids: **JetBrains Mono**, loaded via `next/font/google` as `--font-jbmono`. Every
figure that must be compared against another figure carries tabular numerals.

### Hierarchy
| Token | Size | Weight | Use |
|---|---|---|---|
| `{typography.display-lg}` | 40px | 700 | Home hero |
| `{typography.display-md}` | 28px | 700 | Header band patient name |
| `{typography.heading-lg}` | 20px | 600 | Section title, invalid-link title |
| `{typography.heading-md}` | 15px, uppercase | 600 | Panel header label |
| `{typography.body}` | 15px | 400 | Default body |
| `{typography.body-sm}` | 13px | 400 | Meta, helper copy |
| `{typography.label}` | 11px, uppercase | 700 | Status word, severity pill |
| `{typography.button}` | 13px | 600 | Button label |
| `{typography.mono}` | 13px | 400 | Dose, time, set_id, FDA quote block |

## Layout

- Base unit 8px: `{spacing.xxs}` 4 · `{spacing.xs}` 8 · `{spacing.sm}` 12 · `{spacing.md}` 16 ·
  `{spacing.lg}` 24 · `{spacing.xl}` 32.
- Marketing/home content centers at max 1120px; the round view centers at max 1360px with a
  two-column grid (`1.4fr` medications/flags, `1fr` proposals/notes/tools) collapsing to one
  column under `lg`.
- The header band spans full width, edge to edge, above the centered content column: it is the
  one element that breaks the container.

## Elevation

| Level | Treatment | Use |
|---|---|---|
| 0 | Flat, 1px `{colors.hairline}` border | Default cards, panels |
| 1 | `{shadow.card}` `0 1px 2px rgba(0,0,0,.06)` | Medication row cards, callouts |

No shadow in this system exceeds Level 1. No gradients anywhere.

## Shapes

| Token | Value | Use |
|---|---|---|
| `{rounded.control}` | 8px | Inputs, buttons |
| `{rounded.card}` | 8px | Medication row cards, flag callouts, panels |
| `{rounded.pill}` | 9999px | Severity pills, role chip, status badges |

## Components

### Header Band (signature)
Full-width `{colors.canvas-night}` bar at the top of every round view. Holds the patient label in
`{typography.display-md}` `{colors.on-dark}`, and a role chip: a `{rounded.pill}` pill filled
`{colors.primary}` with `{colors.on-primary}` text reading "Caregiver" or "Pharmacist". No other
surface in the app uses `{colors.canvas-night}`.

### Medication Row (signature)
A `{rounded.card}` 8px card, `{shadow.card}` elevation, white background, with a 4px-wide left
status stripe: `{colors.reliable}` active, `{colors.watch}` held, `{colors.held}` stopped. Generic
name in `{typography.body}` semibold, dose and schedule in `{typography.mono}`, prescriber in
`{typography.body-sm}` `{colors.ink-mute}`.

### Severity Pill + Flag Callout (signature)
A flag is a bordered callout (`{colors.hairline}` border, `{rounded.card}`) with the drug pair as
the title, a `{rounded.pill}` severity pill (`{colors.out}`/`{colors.watch}`/`{colors.reliable}`
background-soft, matching text) top-right, and the openFDA sentence set in a `{typography.mono}`
block on `{colors.canvas-soft}` with the source `set_id` as a dotted-underline link.

### Round Card Grid (signature)
A clean grid: medication rows down the left, `{typography.heading-md}` time-of-day column headers
(Morning / Noon / Evening / Bedtime) across the top, a check mark in `{colors.primary-deep}` in
each cell where the schedule applies. Kept in `@media print` as black-on-white only, per the print
rule below.

### Buttons
- **Primary**: `{colors.primary}` fill, `{colors.on-primary}` text, `{rounded.control}` 8px,
  pressed state `{colors.primary-deep}`.
- **Ghost**: transparent fill, `{colors.ink}` text, `{colors.hairline-strong}` 1px border,
  `{rounded.control}`.
- **Danger**: transparent fill, `{colors.out}` text and border, fills `{colors.out}` with white
  text on hover.

### Print
`.round-card` and its descendants are the only content that survives `@media print`. Forced to
black-on-white (`#000` on `#fff`), hairlines-only, no chrome, `@page { margin: 0.5in; }`. This
section is unchanged from the prior system by design: a printed sheet is not a place for brand
color.

## Do's and Don'ts

### Do
- Keep `{colors.canvas-night}` to the header band only, so it stays a signal.
- Use `{colors.primary-deep}` `#24b47e` anywhere emerald needs to carry text-weight contrast;
  `{colors.primary}` `#3ecf8e` is for fills and dot accents only.
- Render the FDA sentence in `{typography.mono}` so it reads as a quoted source, not prose.
- Keep severity colors distinct from the brand emerald: they are clinical judgments, not brand
  moments.

### Don't
- Don't add a second dark surface elsewhere in the app: it dilutes the header band's signal.
- Don't set body copy in `{colors.ink-faint}` `#9a9a9a` on white: it fails AA (2.81:1).
- Don't use pure black or pure white for text and canvas respectively where a near-black/near-
  white token exists.
- Don't use gradients or shadows beyond Level 1.
