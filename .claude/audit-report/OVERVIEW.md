# DELTA Resilience — Audit Overview

> **Audience:** Dev team and stakeholders.
> This document is the entry point to the full audit. Read this first, then drill into individual layer files or phase files for detail.
>
> **Full audit:** [`layers/`](layers/) · **Refactoring plan:** [`../refactoring-plan/`](../refactoring-plan/)

---

## Project Health Dashboard

| Layer | Domain | Worst Finding | Key Plan Items |
|---|---|---|---|
| [0 — Project Config & Toolchain](layers/layer-00-config.md) | Project Config & Toolchain | Missing .dockerignore; NODE_ENV wrong in Dockerfile | P0-1, P0-18, P0-19 |
| [1 — Routing & URL Structure](layers/layer-01-routing.md) | Routing & URL Structure | Auth missing on some routes; no central link registry | P1-5, P1-6, P1-7, P1-8 |
| [2 — UI Components & Design System](layers/layer-02-ui.md) | UI Components & Design System | Mid-migration: two coexisting design systems; no design tokens | P1-7, P1-9, P1-10, P1-11 |
| [3 — Data Loading & SSR Boundary](layers/layer-03-data-loading.md) | Data Loading & SSR Boundary | Root loader has 4 sequential awaits; heavy loaders block HTML | P1-12, P1-13, P1-14, P1-15 |
| [4 — Backend Handlers & Business Logic](layers/layer-04-handlers.md) | Backend Handlers & Business Logic | N+1 query in cost calculator; approval logic scattered | P1-3, P1-16, P5-6 |
| [5 — Data Access Layer](layers/layer-05-data-access.md) | Data Access Layer | deleteById silent no-op; full table scan in division query | P0-2, P1-18, P1-20 |
| [6 — Database Schema & Migrations](layers/layer-06-schema.md) | Database Schema & Migrations | Date columns stored as text; two migration systems coexist | P3-1, P1-38, P1-40, P3C-1→P3C-7 |
| [7 — Auth, Session & Middleware](layers/layer-07-auth.md) | Auth, Session & Middleware | Tenant check skipped on API key path; session secret logged | P0-8, P0-9, P0-12, P0-15, P1-22 |
| [8 — API Layer](layers/layer-08-api.md) | API Layer | Dead cost endpoints; MCP missing auth on GET path | P0-16, P1-29, P1-30, P1-31, P1-33 |
| [9 — i18n / Translation System](layers/layer-09-i18n.md) | i18n / Translation System | 9 serial DB round-trips on startup; duplicate load logic | P1-34, P1-35, P1-36, P3D-1 |
| [10 — Infrastructure & Build Pipeline](layers/layer-10-infra.md) | Infrastructure & Build Pipeline | No CI/CD; static SQL snapshot diverges from Drizzle migrations | P1-37, P1-38, P1-39, P1-40, P1-41 |
| [11 — Test Suite](layers/layer-11-tests.md) | Test Suite | node:test suites invisible to CI; auth fully mocked in integration | P1-17, P1-21, P1-42, P1-43, P1-44 |
| [12 — Documentation](layers/layer-12-docs.md) | Documentation | LICENSE placeholder unfilled; CONTRIBUTING/CoC/SECURITY missing | P0-22→P0-27, P1-45→P1-48 |

---

## Risk Summary

| Priority | Items | What it means |
|---|---|---|
| **P0 — Critical** | 28 | Bugs, security issues, legal gaps — fix before any other work |
| **P1 — Structural** | 48 | Performance, testability, maintainability — Phase 1 sprint |
| **P2 — Quality** | 12 | Security hardening, E2E quality, API validation |
| **P3 — Schema** | 15 | DB migrations (3-PR pattern required for each) |
| **P4 — Infra** | 3 | HA, Redis, read replica — blocked on P1 items |
| **P5 — Architecture** | 17 | Long-horizon module boundaries and AI/MCP evolution |
| **Total** | **123** | |

---

## P0 Items — Fix First

All 28 P0 items are zero-risk and can be shipped as a patch batch. None require schema changes or feature flags.

| ID | Fix | Phase file |
|---|---|---|
| `P0-0` | Remove/guard example & dev routes in production | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-1` | Fix NODE_ENV in production Dockerfile | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-2` | Fix no-op `deleteById` await | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-3` | Remove debug `console.log` + add no-console lint rule | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-4` | Add Vitest coverage thresholds baseline | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-5` | Fix placeholder support email in ErrorBoundary | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-6` | Fix hardcoded `/en/` URL in email notifications | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-7` | Fix `deleteAllData` silent error swallow | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-8` | Fix `revokeUserApiAccess` destructive emailVerified side-effect | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-9` | Fix `handleTransaction` sentinel string — use Error subclass | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-10` | Fix type export bugs in humanCategoryPresence + hipHazard | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-11` | Remove dead `countryName` column from instance_system_settings | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-12` | Remove secret logging in `env.ts` | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-13` | Fix `rejectUnauthorized: false` in SMTP transport | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-14` | Fix `sanitizeInput` — remove destructive quote stripping | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-15` | Fix `destroyUserSession` graceful handling of missing session | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-16` | Delete dead cost calculation API endpoints | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-17` | Fix `export_tables_for_translation.ts` — writes to directory not file | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-18` | Add `.dockerignore` | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-19` | Fix `build_binary.sh` — build failure must be fatal | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-20` | Add CSP header to `entry.server.tsx` | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-21` | Delete dead Selenium legacy file | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-22` | Fix `readme.md` factual errors (Jest, Remix, wrong test command) | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-23` | Fill Apache 2.0 LICENSE copyright placeholder | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-24` | Create `CONTRIBUTING.md` | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-25` | Create `CODE_OF_CONDUCT.md` | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-26` | Create `SECURITY.md` | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |
| `P0-27` | Add `NOTICE` file (Apache 2.0 requirement) | [phase-0-critical](../refactoring-plan/phases/phase-0-critical.md) |

---

## DPG Compliance

DELTA targets [Digital Public Goods](https://digitalpublicgoods.net/) registry inclusion. Current self-assessed score: **72%** (5 of 9 indicators fully compliant).

Documentation gaps (P0-22 → P0-27) directly address the remaining 28%. Completing P0-23 through P0-27 and P1-47 is the fastest path to full DPG compliance.

---

## How to Navigate This Audit

```
.claude/
  audit-report/
    OVERVIEW.md            ← you are here
    layers/
      layer-00-config.md   ← one file per domain layer
      layer-01-routing.md
      ...
      layer-12-docs.md
  refactoring-plan/
    OVERVIEW.md            ← principles, git strategy, coverage targets
    INDEX.md               ← full status tracker (all 123 items)
    phases/
      phase-0-critical.md  ← 28 items, fix first
      phase-1-structural.md
      phase-2-quality.md
      phase-3-schema.md
      phase-4-infra.md
      phase-5-architecture.md
```

**For a team meeting:** Read this file + `refactoring-plan/INDEX.md`.
**For a deep dive on one domain:** Open the relevant `layers/layer-XX.md`.
**For sprint planning:** Open the relevant `phases/phase-X.md`.
**For an AI assistant:** Point it at this file + the specific layer or phase file for the task at hand.

---
