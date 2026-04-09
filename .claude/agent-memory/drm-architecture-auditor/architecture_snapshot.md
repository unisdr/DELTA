---
name: Architecture Snapshot
description: Full-stack architecture as observed in the 2026-04-01 audit — stack, patterns, auth, DB, test structure
type: project
---

## Stack (as of 2026-04-01)
- React Router v7 (Remix-style SSR) + Express 5 + Node.js 22
- Drizzle ORM + PostgreSQL 16 + PostGIS
- PrimeReact + Tailwind v4 + OpenLayers
- Vitest (unit + integration) + Playwright (E2E)
- Docker single-container deployment (no orchestration)

## Dominant Pattern
Modular Monolith. All code runs in one Node.js process. No message queue, no cache layer (Redis), no separate services. SSR route modules handle both data loading and UI rendering.

## Multi-Tenancy Model
Row-level tenancy via `country_accounts_id` UUID column on every domain table. No PostgreSQL Row-Level Security policies — isolation enforced purely in application code. The `countryAccountsId` is stored in the cookie session and retrieved via `getCountryAccountsIdFromSession()` on each request.

## Auth
- Cookie-based sessions stored in DB (`session` table)
- `getUserFromSession()` does a DB query AND a DB write (lastActiveAt update) on EVERY authenticated request
- Two parallel session types: regular user (`__session`) and super admin (`__super_admin_session`), both using the same SESSION_SECRET
- TOTP (OTP) 2FA supported via `otpauth` library
- API key auth via `X-Auth` header; keys stored plaintext in DB (not hashed)

## DB Connection
- `db.server.ts` calls `drizzle(process.env.DATABASE_URL!)` — uses `drizzle-orm/node-postgres` which internally uses `pg` Pool
- No pool size, connection timeout, or idle timeout configured — all default values
- Single global `dr` instance shared across all requests

## Four-Tier Data Access Problem (discovered 2026-04-07)

The codebase has four distinct data access layers operating in parallel with no enforced ownership boundary:

1. `app/db/queries/` — 33 repository files (plain object exports, `tx?: Tx` pattern, `$inferInsert`/`$inferSelect` types). Thin query wrappers with no business logic. Some include tenant-unscoped `delete(id)` methods alongside tenant-scoped bulk methods.
2. `app/backend.server/models/` — Fat models with `fieldsDef`, `validate()`, `create()`, `update()`, `byId()`, `deleteById()`. Drive the Form-CSV-API abstraction. Import from `app/db/queries/` themselves.
3. `app/services/` (top-level, undocumented in CLAUDE.md) — 7 service files that import from `app/db/queries/` directly and contain business logic. Parallel to `app/backend.server/services/`.
4. `app/backend.server/services/` — The documented service layer. Contains `emailValidationWorkflowService.ts` and MCP/translation services. Only 3 service files here.

Routes import directly from `app/db/queries/` in 28+ route files, completely bypassing the service/handler layer. The `app/services/countryAccountService.ts` is the primary orchestrator for tenant lifecycle (creation, deletion, cloning) and imports all 33 repositories. This is the correct usage pattern — but it is the exception, not the rule.

The `app/db/queries/` directory was entirely missing from CLAUDE.md documentation, which caused it to be missed in Layers 0-4 of the audit.

## Key Models
- `disaster_records` — core DRM entity; tenant-scoped; linked to disaster_event and hazardous_event
- `division` — geospatial boundaries (PostGIS geometry); per-tenant; imported via ZIP upload
- `hazardous_event` — extends `event` table via shared UUID PK (table-per-type inheritance)
- `session` — DB-persisted sessions (no Redis/in-memory)
- `audit_logs` — application-level audit trail (not DB trigger-based)

## Test Structure
- `tests/unit/` — 4 unit tests total (util functions only, no model or handler tests)
- `tests/integration/` — 1 integration test file (UserRepository)
- `tests/integration-realdb/` — ~25 tests against real DB (damages, disruptions, losses, assets routes)
- `tests/e2e/` — 13 Playwright specs (disaster events, records, hazardous events, login)
- No coverage thresholds configured in vitest.config.ts
- No mutation testing

## File Uploads
- Geography ZIP: parsed fully in memory (50MB limit), synchronous import in request handler
- CSV imports: 10MB limit, also fully in-memory
- No background job processing; no async queue
