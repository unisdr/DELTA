# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DELTA Resilience (**D**isaster & Hazardous **E**vents, **L**osses and Damages **T**racking & **A**nalysis) is a full-stack disaster and hazard tracking system built for UNDRR. It supports multi-tenant, multi-language national disaster tracking with geospatial features.

## Commands

```bash
# Development
yarn dev           # Start dev server with DB sync (port 3000)
yarn dbsync        # Apply Drizzle ORM migrations

# Build
yarn build         # Production build
yarn tsc           # TypeScript type checking

# Testing
yarn test:run2     # Vitest unit/integration tests
yarn test:run3     # Integration tests with real DB
yarn test:e2e      # Playwright E2E tests
yarn coverage      # Code coverage

# Code quality
yarn format        # Prettier format all files
yarn format:check  # Check formatting

# i18n
yarn i18n:extractor                 # Extract i18n strings from code
yarn export_tables_for_translation  # Export DB content for translation (CSV)
yarn import_translation_tables      # Import translated CSV back

# Docker (via Makefile)
make build && make start   # Start full stack (app + PostGIS DB + Adminer)
make migrate               # Run DB migrations in Docker
make db-shell              # Open DB shell
```

Running a single Vitest test:
```bash
yarn vitest run tests/unit/path/to/test.ts
```

## Architecture

**Stack:** React Router v7 (Remix-style SSR) + Express 5 + Drizzle ORM + PostgreSQL 16 + PostGIS

### Layer Structure

- **`app/routes/`** — React Router route modules (file-based routing via `remix-flat-routes`). Folders with `+` suffix are route groups. All user-facing routes are nested under `$lang+/` (language parameter in URL).
- **`app/backend.server/`** — Server-only code (never bundled to client):
  - `models/` — Database access layer; one file per table. Use `dev_example1.ts` as template.
  - `handlers/` — Shared request handlers used by multiple routes (form, CSV, API).
  - `services/` — Business logic (access management, organizations, country accounts).
- **`app/frontend/`** — Shared frontend components and form definitions.
- **`app/components/`** — Reusable React components (maps, charts, UI elements).
- **`app/drizzle/`** — Database schema (`schema/`) and migrations.
- **`app/utils/`** — Shared utilities (auth, session, email, logging, geo).

### The Form-CSV-API Pattern

The core abstraction for all data types is `fieldsDef` — a definition that drives forms, CSV import/export, and REST API simultaneously. Adding or changing a field only requires updating the Drizzle schema and the `fieldsDef` in the model file; the change propagates to forms, views, CSV, and API automatically.

To add a new data type, copy the `dev_example1` template across all layers:
1. `app/drizzle/schema/` — table definition
2. `app/backend.server/models/dev_example1.ts` — `fieldsDef`, `validate()`, `create()`, `update()`, `byId()`, `deleteById()`, `idByImportId()`
3. `app/frontend/dev_example1.tsx` — form rendering and view layout
4. `app/routes/.../dev_example1+/` — route files (`_index.tsx`, `$id.tsx`, `edit.$id.tsx`, `delete.$id.tsx`, `csv-import.tsx`, `csv-export.tsx`)
5. `app/routes/api+/dev-example1+/` — API routes (`_index.tsx`, `add.ts`, `update.ts`, `upsert.ts`, `list.ts`)

### Database Conventions

- All models follow a consistent interface: `validate()`, `create(tx, fields)`, `update(tx, id, fields)`, `byId(id)`, `deleteById(id)`, `idByImportId(tx, importId)`
- Multi-language text is stored as JSONB: `{"en": "...", "it": "..."}`. Use `selectTranslated` from `common.ts` for language-aware queries.
- `constraintErrors()` in `common.ts` converts PostgreSQL constraint violations into readable error codes.
- Drizzle config (`drizzle.config.ts`) excludes PostGIS tables from migration introspection.

### Authentication

Two modes configured via `AUTHENTICATION_SUPPORTED` env var: `form` (local username/password) and `sso_azure_b2c`. Session management via cookie-based sessions (`app/utils/session.ts`). API key authentication is also supported for programmatic access and the MCP endpoint.

### Routing

- Language is the first URL segment: `/:lang/...`
- `$lang+/admin+/` — login/logout
- `$lang+/disaster-event+/` — hazardous event management
- `$lang+/disaster-record+/` — disaster record CRUD
- `$lang+/analytics+/` — dashboards and reports
- `$lang+/api+/` — JSON API endpoints (returns JSON/QR, not standard Remix responses)
- `sso+/` — Azure B2C callback routes

### UI Design Systems — In-Progress Migration

The frontend is mid-migration between two design systems. **Both coexist and are intentional** — do not assume one is wrong.

**Old system** (being phased out):
- Custom CSS classes: `dts-form`, `dts-form-component`, `mg-button`, `mg-button-primary`
- Forms rendered via `formScreen()` from `app/frontend/form.tsx`, driven by `fieldsDef`
- Still used by: most create/edit routes (hazardous events, disaster records, assets, etc.)

**New system** (target state):
- PrimeReact components (`Card`, `DataTable`, `Button`, `Dialog`, etc.) + Tailwind utility classes
- Hand-crafted JSX per page
- Already adopted by: list pages, modals, settings, user/auth pages, admin pages

**Critical constraint when migrating a form:** `fieldsDef` must be preserved on the model even after replacing `formScreen()` with PrimeReact JSX — it still drives CSV import/export and the REST API.

### Key Conventions

- Files with `.server.ts(x)` suffix are server-only and never bundled to the browser. **Note:** most files in `app/backend.server/` currently lack this suffix — this is a known issue under audit (see refactoring plan P1-4). Always add `.server.ts` to new server-only files.
- Path alias `~/*` maps to `app/*`
- TypeScript strict mode is enforced
- Prettier uses tabs (not spaces), 80-char width, trailing commas

### Database Migrations — One System Only

There are two migration artefacts in the repo. **Only one is correct:**

| Artefact | Status | Use? |
|---|---|---|
| `app/drizzle/` + `drizzle-kit migrate` | ✅ Canonical | Yes — always |
| `scripts/dts_database/dts_db_schema.sql` | ⚠️ Stale snapshot | No — do not use for new schema work |

Never apply the SQL snapshot as a migration. It diverges from the Drizzle schema and is only used (incorrectly) by E2E test setup. Always run `yarn dbsync` / `drizzle-kit migrate`.

### Test Infrastructure — Know the Tiers

Four test suites exist. Only two are wired to CI:

| Suite | Runner | Command | CI? |
|---|---|---|---|
| Unit + PGlite integration | Vitest | `yarn test:run2` | ✅ |
| Real-DB integration | Vitest | `yarn test:run3` | ✅ |
| E2E | Playwright | `yarn test:e2e` | ✅ |
| Model + handler tests | **node:test** | none | ❌ **Orphaned** |

`app/backend.server/models/*_test.ts` and `app/backend.server/handlers/form/form_test.ts` use Node.js's built-in `node:test` and are **not run by any yarn script**. Do not add new tests using `node:test` — use Vitest instead, placing files under `tests/`.

`tests/integration/db/testSchema/` manually mirrors `app/drizzle/schema/`. When adding a column to the production schema, update both locations until P1-42 is resolved.

### Known Bugs — Do Not Reproduce or Extend

These are confirmed bugs awaiting fixes. Do not copy these patterns, extend these functions, or use them as implementation templates:

- **`deleteById` in `app/backend.server/models/common.ts`** — missing `await` on the delete query. It silently succeeds regardless of whether the row existed. (P0-2)
- **`sanitizeInput` in `app/utils/security.ts`** — strips apostrophes from user input, corrupting French/Arabic names and possessives. Do not use for user-generated text content. (P0-14)
- **`revokeUserApiAccess` in `app/backend.server/models/api_key.ts`** — incorrectly sets `emailVerified: false` as a side-effect. Do not replicate this pattern. (P0-8)
- **`env.ts`** — logs all environment variable values at startup, including secrets. Do not add more logging here before P0-12 is resolved. (P0-12)
- **`authLoaderApiDocs` in `app/utils/auth.ts`** — skips the tenant check on the API key authentication path. Do not use as a template for new API route auth. Use `authLoaderWithPerm` instead. (P1-22)
- **`handleTransaction` in `app/backend.server/models/common.ts`** — uses a sentinel string for control flow instead of an Error subclass. Do not extend this pattern. (P0-9)

## Developer Documentation

Architecture docs in `_docs/code-structure/`:
- `models.md` — Database access layer patterns
- `handlers.md` — Request handler patterns
- `routes.md` — Routing patterns
- `frontend.md` — Frontend component architecture
- `form-csv-api.md` — The Form/CSV/API abstraction (including how to add a new type)
- `drizzle.md` — Database/migration notes

Full codebase audit and refactoring plan (generated April 2026):
- `.claude/audit-report/OVERVIEW.md` — 12-layer health dashboard; start here for project context
- `.claude/audit-report/layers/layer-XX.md` — deep findings per domain (routing, auth, schema, tests, docs, etc.)
- `.claude/refactoring-plan/INDEX.md` — 123-item status tracker across all phases
- `.claude/refactoring-plan/phases/phase-0-critical.md` — 28 P0 bugs to fix first (zero-risk, no breaking changes)

## Environment Setup

Copy `example.env` to `.env`. Required variables:
- `DATABASE_URL` — PostgreSQL connection string (must have PostGIS extension enabled)
- `SESSION_SECRET` — Random string for session signing
- `EMAIL_TRANSPORT` — `smtp` or `file` (`file` writes emails to disk, useful for dev)
- `AUTHENTICATION_SUPPORTED` — `form`, `sso_azure_b2c`, or comma-separated
