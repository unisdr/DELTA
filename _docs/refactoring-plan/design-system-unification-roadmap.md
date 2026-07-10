# Design System Unification — Draft Roadmap

## Status: DRAFT — context capture only, not yet scheduled

This document exists so the reasoning below isn't lost between sessions. It is **not** ready
to execute. Revisit and plan out the concrete phases/intents after the Notices pilot
(`_docs/refactoring-plan/notices-pilot-roadmap.md`) finishes.

## Purpose

Capture the strategy for closing the design-token gap discovered while building the Notices
pilot's presentation layer (`ca-notices-route-adapter`, 2026-07-07), and the sequencing decision
around it, before the next domain migrations (Hazardous Event, Disaster Event, ...) begin their
own presentation-layer work.

## The problem this solves

DELTA has no unified design-token system today — see `[[project_delta_design_system_gap]]`
memory for the verified specifics. Three uncoordinated styling layers exist: PrimeReact's stock
`lara-light-blue` theme (unmodified), a bare/uncustomized Tailwind v4 import, and a legacy
3,484-line `style-dts.css` with hardcoded hex color literals. No dark mode. No shared tokens.

If each domain migration defers this individually ("just this once, we'll fix it later"), two
bad outcomes compound:
1. **The refactor is never actually "done."** Backend architecture gets migrated domain by
   domain; the presentation layer accumulates the same inconsistency it started with, just
   wrapped in newer components. "We completed the Clean Architecture refactor" becomes true only
   for the backend, not the product experience.
2. **Two visible product experiences during the Strangler Fig transition.** Some pages
   (migrated, PrimeReact-based) look different from others (unmigrated, raw-table/legacy CSS)
   for however long the migration takes — confusing for end users, and there's no natural point
   at which that confusion resolves itself.

## The agreed middle-ground strategy: extract now, re-skin later

Two decoupled passes, so engineering work is never blocked on design-team availability:

**Pass 1 — Token extraction (mechanical, no design input needed, do this soon):**
- Extract today's actual colors/spacing into a real token layer (a Tailwind v4 `@theme` block,
  or equivalent), calibrated to **visually match the current app exactly** — not a new look.
- Critically, this must cover **two** surfaces, not one:
  - The custom `dts-*` CSS classes (`style-dts.css`) — straightforward extraction.
  - **PrimeReact's own component theme CSS variables** (`--p-*`, e.g. `--p-primary-color`).
    PrimeReact's stock `lara-light-blue` theme does NOT currently match the custom hex values
    used elsewhere in the app (e.g. `#004f91`) — a new PrimeReact `DataTable`/`Card`/etc. would
    render in PrimeReact's own blue, not the app's actual blue, unless these variables are
    remapped to the same extracted token values. This is the part most likely to be
    under-scoped if this initiative isn't planned carefully.
- End state: new components (built with PrimeReact, consuming tokens) are visually
  indistinguishable from old components (raw HTML + legacy CSS) to an end user. No UI
  difference, no design-team dependency, no blocking Clean Architecture migration work.
- Note: today's own styling already has minor inconsistencies (e.g. two slightly different
  blues, `#004f91` and `#106cb8`, used in different places) — extraction will require picking
  one canonical value per token, not a perfect 1:1 preservation of every inconsistency. This is
  a small, low-risk judgment call, not a blocker.

**Pass 2 — Re-skin (design-team-driven, do this once, later — after most/all domains are
migrated and the old raw-table/legacy-CSS UI is deleted):**
- Design team provides new token *values* (not a new token *system* — that already exists from
  Pass 1).
- Because every migrated page already consumes tokens rather than hardcoded styles, updating
  token values cascades the new look/feel across the entire app in one motion — no per-page
  rework needed.
- This is the point at which "the refactor is done" becomes true for the presentation layer too,
  not just the backend.

## Sequencing relative to domain migrations

- **Notices pilot**: explicitly exempted. It's a tiny, read-only, two-page pilot proving the
  backend architecture — proceeding with `DataTable` against PrimeReact's stock theme as-is
  (see `ca-notices-route-adapter` design.md Decision 8 and its Risks entry). Not worth blocking
  a backend-architecture pilot on a presentation-layer initiative.
- **Before Hazardous Event (or whichever domain comes next) begins presentation-layer work**:
  Pass 1 (token extraction) should land as its own, separately-scoped OpenSpec intent —
  cross-cutting infrastructure, same pattern as the request-context-middleware and
  ILogger-production-impl prerequisites were for the backend. Not owned by any single domain's
  PR, so no single domain can "defer it" again.
- **Pass 2 (re-skin)**: deliberately not scheduled yet. Revisit once most/all domains are
  migrated and legacy UI can actually be deleted.

## Open questions to resolve when this is actually planned

- Exact mechanism: Tailwind v4 `@theme` block mapping to PrimeReact CSS variables directly, or
  an intermediate token layer both consume? (Needs investigation, not decided here.)
- Which existing color values become the canonical "primary"/"secondary" tokens, given today's
  minor inconsistencies?
- Whether dark-mode support is in scope for Pass 1 (build the capability, defer using it) or
  entirely out of scope until Pass 2.
- Whether this becomes its own roadmap document (like this one, formalized) or a phase inserted
  into the main Notices/domain-migration roadmap.

## References

- `[[project_delta_design_system_gap]]` memory — verified specifics (file paths, hex values,
  dependency versions) behind this document's claims.
- `openspec/changes/ca-notices-route-adapter/design.md` — Decision 8 and its Risks entry, where
  this gap was first surfaced and explicitly deferred for the Notices pilot specifically.
