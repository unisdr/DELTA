# DELTA Refactoring Plan — Status Index

> Master status table. Each ID links to its full item in the relevant phase file.

> **Legend:** `todo` · `in_progress` · `done` · `skip`

---

## Status Tracker

| ID | Title | Phase | Status |
|----|-------|-------|--------|
| P0-0 | Remove/guard example & dev-example routes in production | 0 | `todo` |
| P0-1 | Fix NODE_ENV in Dockerfile | 0 | `todo` |
| P0-2 | Fix no-op `deleteById` await | 0 | `todo` |
| P0-3 | Remove debug console.log + lint rule | 0 | `todo` |
| P0-4 | Add coverage thresholds baseline | 0 | `todo` |
| P0-5 | Fix placeholder support email in ErrorBoundary | 0 | `todo` |
| P0-6 | Fix hardcoded `/en/` URL in email notifications | 0 | `todo` |
| P0-7 | Fix `deleteAllData` silent error swallow | 0 | `todo` |
| P0-8 | Fix `revokeUserApiAccess` sets emailVerified=false | 0 | `todo` |
| P0-9 | Fix `handleTransaction` sentinel string | 0 | `todo` |
| P0-10 | Fix type export bugs in humanCategoryPresence + hipHazard | 0 | `todo` |
| P0-11 | Remove dead `countryName` column from instance_system_settings | 0 | `todo` |
| P0-12 | Remove secret logging in env.ts | 0 | `todo` |
| P0-16 | Delete dead cost calculation API endpoints (4 files, zero callers) | 0 | `todo` |
| P0-17 | Fix `export_tables_for_translation.ts` — writes to directory not file | 0 | `todo` |
| P0-18 | Add `.dockerignore` — prevent image bloat and secret leak | 0 | `todo` |
| P0-19 | Fix `build_binary.sh` — build failure must be fatal | 0 | `todo` |
| P0-20 | Add CSP header to `entry.server.tsx` — missing from production | 0 | `todo` |
| P0-13 | Fix `rejectUnauthorized: false` in SMTP transport | 0 | `todo` |
| P0-14 | Fix `sanitizeInput` — remove destructive quote stripping | 0 | `todo` |
| P0-15 | Fix `destroyUserSession` graceful handling of missing session | 0 | `todo` |
| P0-21 | Delete dead Selenium legacy file (`tests/selenium/browser.side`) | 0 | `todo` |
| P0-22 | Fix `readme.md` factual errors — Jest→Vitest, Remix→React Router v7, correct test command | 0 | `todo` |
| P0-23 | Fill Apache 2.0 LICENSE copyright placeholder — year + UNDRR legal entity | 0 | `todo` |
| P0-24 | Create `CONTRIBUTING.md` — dev setup, branching, commit format, PR process | 0 | `todo` |
| P0-25 | Create `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1 | 0 | `todo` |
| P0-26 | Create `SECURITY.md` — vulnerability disclosure policy and contact | 0 | `todo` |
| P0-27 | Add `NOTICE` file — Apache 2.0 Section 4(d) attribution requirement | 0 | `todo` |
| P1-1 | Configure DB connection pool | 1 | `todo` |
| P1-2 | Session write threshold | 1 | `todo` |
| P1-3 | Cost calculator single SQL query | 1 | `todo` |
| P1-4 | Server-only file suffix audit | 1 | `todo` |
| P1-5 | Authenticated root layout route | 1 | `todo` |
| P1-6 | Consistent route index files | 1 | `todo` |
| P1-7 | Type-safe link registry | 1 | `todo` |
| P1-8 | Migrate remaining routes to nested layouts | 1 | `todo` |
| P1-9 | Replace ViewContext class with hook | 1 | `todo` |
| P1-10 | Design tokens in tailwind.config.ts | 1 | `todo` |
| P1-11 | Enforce props-down contract for page components | 1 | `todo` |
| P1-12 | Parallelize root loader async calls | 1 | `todo` |
| P1-13 | Request-scoped session memoization | 1 | `todo` |
| P1-14 | Use `defer()` for heavy loaders | 1 | `todo` |
| P1-15 | Fix `defer()` for heavy loaders | 1 | `todo` |
| P1-16 | Fix N+1 in email validator loop | 1 | `todo` |
| P1-17 | Register form_test.ts with Vitest | 1 | `todo` |
| P1-18 | Fix getDescendantDivisionIds full table scan | 1 | `todo` |
| P1-19 | Remove dev/prod split in geographic filter | 1 | `todo` |
| P1-20 | Enforce `tx` on all `logAudit` calls inside transactions | 1 | `todo` |
| P1-21 | Move model integration tests to `tests/integration-realdb/` | 1 | `todo` |
| P1-22 | Fix `authLoaderApiDocs` tenant check on API key path | 1 | `todo` |
| P1-23 | Remove `hasPermission` dead code branch | 1 | `todo` |
| P1-24 | Fix SSO `editProfile`/`passwordReset` empty functions | 1 | `todo` |
| P1-25 | Add startup validation for required environment variables | 1 | `todo` |
| P1-26 | Fix email transporter — singleton, not per-send | 1 | `todo` |
| P1-27 | Consolidate two logging systems | 1 | `todo` |
| P1-28 | Make session timeout configurable via env var | 1 | `todo` |
| P1-29 | Fix cross-tenant leak in `spatial-footprint-geojson.ts` | 1 | `todo` |
| P1-30 | Fix cross-tenant leak in `geojson.$id.ts` | 1 | `todo` |
| P1-31 | Add auth to `subsectors.tsx` | 1 | `todo` |
| P1-32 | Complete `organization+/` API module (add list, update, upsert) | 1 | `todo` |
| P1-33 | Fix `mcp.ts` — auth on GET/SSE + `notifications/initialized` handler | 1 | `todo` |
| P1-34 | Align language availability — expose fr, es, zh in language picker | 1 | `todo` |
| P1-35 | Remove duplicate `loadTranslations`/`createTranslationGetter` logic | 1 | `todo` |
| P1-36 | Fail build on duplicate translation keys (extractor-i18n.ts) | 1 | `todo` |
| P1-37 | Add CI/CD pipeline (GitHub Actions — tests, build, security on PR) | 1 | `todo` |
| P1-38 | Consolidate to single migration system — Drizzle only, retire SQL scripts | 1 | `todo` |
| P1-39 | Harden docker-compose — healthcheck, credentials, Adminer, compose v2 | 1 | `todo` |
| P1-40 | Isolate migrations as pre-deploy step — not at app startup | 1 | `todo` |
| P1-41 | Add Docker Swarm deploy config for 3-node horizontal scaling | 1 | `todo` |
| P1-42 | Fix `testSchema` duplication — import prod schema directly in PGlite tests | 1 | `todo` |
| P1-43 | Fix E2E global.setup.ts — use Drizzle migrations, not static SQL snapshot | 1 | `todo` |
| P1-44 | Add dedicated unit tests for `auth.ts` and `session.ts` | 1 | `todo` |
| P1-45 | Add `.github/` — issue templates, PR template, CODEOWNERS | 1 | `todo` |
| P1-46 | Adopt Conventional Commits + `release-please` for automated changelog | 1 | `todo` |
| P1-47 | Fix `_docs/api.md` — write REST API overview | 1 | `todo` |
| P1-48 | Formalize ADR system under `_docs/decisions/` | 1 | `todo` |
| P2-1 | Rate limiting on auth endpoints | 2 | `todo` |
| P2-2 | Fix super admin mock session UUID | 2 | `todo` |
| P2-3/4 | API key: hash secrets + assignedToUserId | 2 | `todo` |
| P2-5 | Move file uploads to object storage | 2 | `todo` |
| P2-6 | Fix translation import startup race | 2 | `todo` |
| P2-7 | Add Zod input validation to all API write endpoints | 2 | `todo` |
| P2-8 | Run E2E tests against production build, not dev server | 2 | `todo` |
| P2-9 | Extract inline GeoJSON fixtures from `geoValidation.test.ts` (875KB) | 2 | `todo` |
| P2-10 | Remove hardcoded country UUID from E2E fixture | 2 | `todo` |
| P2-11 | Publish versioned docs site — MkDocs Material + `mike` + GitHub Pages | 2 | `todo` |
| P2-12 | Auto-generate API reference with TypeDoc | 2 | `todo` |
| P2-13 | Write user-facing onboarding tutorial ("my first disaster record") | 2 | `todo` |
| P3-1 | Date column migration | 3 | `todo` |
| P3-2 | PostgreSQL RLS (PERMISSIVE → RESTRICTIVE) | 3 | `todo` |
| P3-3 | Async geography import (pg-boss) | 3 | `todo` |
| P3B-1 | DB-level CASCADE on human effects FK chain | 3B | `todo` |
| P3B-2 | Add `country_accounts_id` to leaf tables | 3B | `todo` |
| P3B-3 | Migrate UUID v4 → UUIDv7 | 3B | `todo` |
| P3B-4 | Fix cross-tenant GeoJSON endpoint | 3B | `todo` |
| P3C-1 | Fix CASCADE chain across full event hierarchy | 3C | `todo` |
| P3C-2 | Add `country_accounts_id` to damages, losses, disruption | 3C | `todo` |
| P3C-3 | Replace `asset.sector_ids` text with join table | 3C | `todo` |
| P3C-4 | Add primary key to `human_dsg_config` | 3C | `todo` |
| P3C-5 | Fix polymorphic FK integrity on validation tables | 3C | `todo` |
| P3C-6 | Add DB FK constraints for `approvalWorkflowFields` user refs | 3C | `todo` |
| P3C-7 | Add unique constraint to `event_relationship` | 3C | `todo` |
| P4-1 | Health endpoint + Kubernetes | 4 | `todo` |
| P4-2 | Add Redis | 4 | `todo` |
| P4-3 | Read replica for analytics | 4 | `todo` |
| P5-0 | PWA installable layer | 5 | `todo` |
| P5-1 | Domain module boundaries | 5 | `todo` |
| P5-2 | MCP endpoint evolution | 5 | `todo` |
| P5-3 | AI classification workers | 5 | `todo` |
| P5-4 | Architecture decision: three-tier separation | 5 | `todo` |
| P5-5 | Bounded context directory restructure | 5 | `todo` |
| P5-6 | Extract ApprovalWorkflowService | 5 | `todo` |
| P5-7 | Move domain concepts out of frontend/ | 5 | `todo` |
| P5-8 | Repository interfaces for core domain models | 5 | `todo` |
| P5-9 | Reconcile backend.server/utils/ partial refactoring | 5 | `todo` |
| P5-10 | Designate db/queries/ as single repository tier | 5 | `todo` |
| P5-11 | Normalise disaster_event repeated column groups → child tables | 5 | `todo` |
| P5-12 | Merge two parallel service layers (app/services/ + backend.server/services/) | 5 | `todo` |
| P5B-1 | Stabilise API URLs (remove lang prefix) | 5B | `todo` |
| P5B-2 | Outbound webhook engine | 5B | `todo` |
| P5B-3 | Sendai Framework data export | 5B | `todo` |
| P5B-4 | Generic OIDC SSO (replace Azure B2C hardcode) | 5B | `todo` |
| P5B-5 | PostGIS native geometry (replace JSONB spatial) | 5B | `todo` |
| P3D-1 | Namespace-based translation splitting — replace full-dictionary inline injection | 3D | `todo` |
