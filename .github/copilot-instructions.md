# Agent Instructions

DELTA Resilience (**D**isaster & Hazardous **E**vents, **L**osses and **D**amages **T**racking & **A**nalysis) is a full-stack TypeScript disaster tracking system built for UNDRR. It supports multi-tenant, multi-language national disaster tracking with geospatial features. Stack: React Router v7 (Remix-style SSR) + Express 5 + Drizzle ORM + PostgreSQL 16/17 + PostGIS.

## Commands

```bash
# Development
yarn dev           # Start dev server on port 3000 (also runs install + dbsync)
yarn dbsync        # Apply DB migrations (drizzle-kit migrate — NEVER drizzle-kit push)
yarn build         # Production build
yarn tsc           # TypeScript type checking

# Testing
yarn test:run2     # Unit + PGlite integration tests (no external DB needed)
yarn test:run3     # Integration tests against a real PostgreSQL instance (needs .env.test)
yarn test:e2e      # Playwright end-to-end tests
yarn coverage      # Code coverage report
yarn vitest run path/to/test.ts   # Run a single test file
yarn vitest run -t "test name"    # Run tests matching a name pattern

# Code quality
yarn format        # Prettier format all files
yarn format:check  # Check formatting without writing

# i18n
yarn i18n:extractor                 # Extract/update translation strings in locales/app/
yarn export_tables_for_translation  # Export DB content for translation (CSV)
yarn import_translation_tables      # Import translated CSV back

# Docker (via Makefile)
make build && make start   # Start full stack (app + PostGIS DB + Adminer)
make migrate               # Run DB migrations in Docker
make db-shell              # Open DB shell
```

## Key conventions

- **Migrations**: `yarn dbsync` only. Never `drizzle-kit push`. See [`_docs/code-structure/drizzle.md`](../_docs/code-structure/drizzle.md).
- **Multi-tenancy**: always scope queries with `countryAccountsId`. See [`_docs/code-structure/models.md`](../_docs/code-structure/models.md).
- **Auth**: wrap every loader/action with an `authLoader*` / `authAction*` helper from `~/utils/auth`. Use `authLoaderWithPerm` as the default — not `authLoaderApiDocs` (see Known Bugs). See [`_docs/code-structure/handlers.md`](../_docs/code-structure/handlers.md).
- **Routes**: all user routes live under `app/routes/$lang+/`. Use `LangLink` for internal links. See [`_docs/code-structure/routes.md`](../_docs/code-structure/routes.md).
- **Translation**: `ctx.t({ code: "key", msg: "Fallback" })`. Run `yarn i18n:extractor` after adding strings. See [`_docs/translations/app-ui/index.md`](../_docs/translations/app-ui/index.md).
- **Server-only files**: use `.server.ts(x)` suffix for all new server-only files. Path alias `~/*` maps to `app/*`.
- **New env vars**: add to `example.env` with a comment.
- **Branches**: from `dev`, not `main`. PRs target `dev`. See [`CONTRIBUTING.md`](../CONTRIBUTING.md).
- **Commit prefixes**: `Bug:`, `Feature:`, `Refactor:`, `Docs:`, or component name (e.g. `Damages:`).
- **Style**: Prettier uses tabs (not spaces), 80-char width, trailing commas. TypeScript strict mode enforced.

## Architecture

### Layer structure

- **`app/routes/`** — React Router route modules (file-based routing via `remix-flat-routes`). All user-facing routes are nested under `$lang+/` (language parameter in URL).
- **`app/backend.server/`** — Server-only code (never bundled to client):
  - `models/` — Database access layer; one file per table. Use `dev_example1.ts` as the template.
  - `handlers/` — Shared request handlers used across routes (form, CSV, API).
  - `services/` — Business logic (access management, organisations, country accounts).
- **`app/frontend/`** — Shared frontend components and form definitions.
- **`app/components/`** — Reusable React components (maps, charts, UI elements).
- **`app/drizzle/`** — Database schema (`schema/`) and migrations.
- **`app/utils/`** — Shared utilities (auth, session, email, logging, geo).

### The Form-CSV-API pattern

The core abstraction for all data types is `fieldsDef` — a definition that drives forms, CSV import/export, and the REST API simultaneously. Adding or changing a field only requires updating the Drizzle schema and the `fieldsDef` in the model file; the change propagates to forms, views, CSV, and API automatically.

To add a new data type, copy the `dev_example1` template across all layers:

1. `app/drizzle/schema/` — table definition
2. `app/backend.server/models/dev_example1.ts` — `fieldsDef`, `validate()`, `create()`, `update()`, `byId()`, `deleteById()`, `idByImportId()`
3. `app/frontend/dev_example1.tsx` — form rendering and view layout
4. `app/routes/.../dev_example1+/` — route files (`_index.tsx`, `$id.tsx`, `edit.$id.tsx`, `delete.$id.tsx`, `csv-import.tsx`, `csv-export.tsx`)
5. `app/routes/api+/dev-example1+/` — API routes (`_index.tsx`, `add.ts`, `update.ts`, `upsert.ts`, `list.ts`)

See [`_docs/code-structure/form-csv-api.md`](../_docs/code-structure/form-csv-api.md) for the full walkthrough.

### Database conventions

- All models follow a consistent interface: `validate()`, `create(tx, fields)`, `update(tx, id, fields)`, `byId(id)`, `deleteById(id)`, `idByImportId(tx, importId)`.
- Multi-language text is stored as JSONB: `{"en": "...", "it": "..."}`. Use `selectTranslated` from `common.ts` for language-aware queries.
- `constraintErrors()` in `common.ts` converts PostgreSQL constraint violations into readable error codes.
- `ourRandomUUID()` for primary keys; `uuid` type for foreign key references; always include `countryAccountsId` for tenant scoping.
- Drizzle config excludes PostGIS tables from migration introspection.

### Authentication

Two modes configured via `AUTHENTICATION_SUPPORTED` env var: `form` (local username/password) and `sso_azure_b2c`. Session management via cookie-based sessions (`app/utils/session.ts`). API key authentication is also supported for programmatic access and the MCP endpoint.

### Routing

- Language is the first URL segment: `/:lang/...`
- `$lang+/admin+/` — login/logout
- `$lang+/disaster-event+/` — hazardous event management
- `$lang+/disaster-record+/` — disaster record CRUD
- `$lang+/analytics+/` — dashboards and reports
- `$lang+/api+/` — JSON API endpoints
- `sso+/` — Azure B2C callback routes

## Critical constraints

### Database migrations — one system only

Two migration artefacts exist in the repo. **Only one is correct:**

| Artefact                                 | Status            | Use?                                |
| ---------------------------------------- | ----------------- | ----------------------------------- |
| `app/drizzle/` + `drizzle-kit migrate`   | ✅ Canonical      | Yes — always                        |
| `scripts/dts_database/dts_db_schema.sql` | ⚠️ Stale snapshot | No — do not use for new schema work |

Never apply the SQL snapshot as a migration. Always run `yarn dbsync` / `drizzle-kit migrate`.

When adding a column to the production schema, also update `tests/integration/db/testSchema/` until issue P1-42 is resolved.

### Test infrastructure — four tiers, two orphaned

| Suite                     | Runner        | Command          | CI?         |
| ------------------------- | ------------- | ---------------- | ----------- |
| Unit + PGlite integration | Vitest        | `yarn test:run2` | ✅          |
| Real-DB integration       | Vitest        | `yarn test:run3` | ✅          |
| E2E                       | Playwright    | `yarn test:e2e`  | ✅          |
| Model + handler tests     | **node:test** | none             | ❌ Orphaned |

`app/backend.server/models/*_test.ts` and `app/backend.server/handlers/form/form_test.ts` use Node.js's built-in `node:test` and are **not run by any yarn script**. Do not add new tests using `node:test` — use Vitest, placing files under `tests/`. See [`_docs/code-structure/testing.md`](../_docs/code-structure/testing.md).

### UI design system — mid-migration

The frontend is mid-migration between two design systems. **Both coexist intentionally** — do not assume one is wrong.

**Old system** (being phased out): custom CSS classes (`dts-form`, `dts-form-component`, `mg-button`, `mg-button-primary`), forms rendered via `formScreen()` from `app/frontend/form.tsx`. Still used by most create/edit routes.

**New system** (target state): PrimeReact components (`Card`, `DataTable`, `Button`, `Dialog`) + Tailwind utility classes, hand-crafted JSX per page. Already adopted by list pages, modals, settings, user/auth pages, and admin pages.

**Critical constraint when migrating a form:** `fieldsDef` must be preserved on the model even after replacing `formScreen()` with PrimeReact JSX — it still drives CSV import/export and the REST API.

### Known bugs — do not reproduce or extend

These are confirmed bugs awaiting fixes. Do not copy these patterns, extend these functions, or use them as implementation templates:

- **`deleteById` in `app/backend.server/models/common.ts`** (P0-2) — missing `await` on the delete query; silently succeeds regardless of whether the row existed.
- **`sanitizeInput` in `app/utils/security.ts`** (P0-14) — strips apostrophes from user input, corrupting French/Arabic names and possessives. Do not use for user-generated text content.
- **`revokeUserApiAccess` in `app/backend.server/models/api_key.ts`** (P0-8) — incorrectly sets `emailVerified: false` as a side-effect. Do not replicate this pattern.
- **`env.ts`** (P0-12) — logs all environment variable values at startup, including secrets. Do not add more logging here before this is resolved.
- **`authLoaderApiDocs` in `app/utils/auth.ts`** (P1-22) — skips the tenant check on the API key authentication path. Do not use as a template for new API route auth. Use `authLoaderWithPerm` instead.
- **`handleTransaction` in `app/backend.server/models/common.ts`** (P0-9) — uses a sentinel string for control flow instead of an Error subclass. Do not extend this pattern.

## Architecture docs

Full developer documentation is in [`_docs/index.md`](../_docs/index.md). Key pages:

- [`_docs/code-structure/models.md`](../_docs/code-structure/models.md) — `dr`/`Tx` types, multi-tenancy pattern, model conventions
- [`_docs/code-structure/handlers.md`](../_docs/code-structure/handlers.md) — `BackendContext`, auth wrappers, form/CSV/API handlers
- [`_docs/code-structure/routes.md`](../_docs/code-structure/routes.md) — `$lang+` prefix, `LangLink`, flat-routes
- [`_docs/code-structure/testing.md`](../_docs/code-structure/testing.md) — PGlite setup, single-test commands, e2e config
- [`_docs/code-structure/form-csv-api.md`](../_docs/code-structure/form-csv-api.md) — how to add a new data type end-to-end
- [`_docs/code-structure/drizzle.md`](../_docs/code-structure/drizzle.md) — database/migration notes
- [`_docs/translations/app-ui/index.md`](../_docs/translations/app-ui/index.md) — translation system, `ctx.t` API

## Environment setup

Copy `example.env` to `.env`. Required variables:

- `DATABASE_URL` — PostgreSQL connection string (must have PostGIS extension enabled)
- `SESSION_SECRET` — Random string for session signing
- `EMAIL_TRANSPORT` — `smtp` or `file` (`file` writes emails to disk, useful for dev)
- `AUTHENTICATION_SUPPORTED` — `form`, `sso_azure_b2c`, or comma-separated

## Custom agents

Specialist agents for recurring task types live in [`.github/agents/`](agents/). See [`agents/README.md`](agents/README.md) for the current list and guidance on adding new agents. An agent that points at wrong file paths or describes stale conventions is worse than no agent — update affected agents whenever you make structural changes to the codebase.
