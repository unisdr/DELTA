## Layer 11 — Test Suite

**Files read:** `vitest.config.ts`, `vitest.integration-realdb.config.ts`, `playwright.config.ts`, `tests/integration/db/setup.ts`, `tests/integration-realdb/setup.ts`, `tests/integration-realdb/test-helpers.ts`, `tests/integration-realdb/routes/disaster-record/damages/_index.test.ts`, `tests/e2e/global.setup.ts`, `tests/e2e/global.teardown.ts`, `tests/e2e/disaster-event/add-disaster-event.spec.ts`, `tests/unit/routes/mcp.test.ts`, `tests/unit/util/array.test.ts`, `tests/unit/routes/lang/examples/test-route-module/_index.test.ts`, `tests/integration/db/queries/user.test.ts`, `app/backend.server/models/all_test.ts`, `app/backend.server/models/disaster_record_test.ts`, `app/backend.server/handlers/all_test.ts`, `app/backend.server/handlers/form/form_test.ts`

---

### Architecture overview

**Four active test suites — three Vitest, one Playwright:**

| Suite               | Config                                | DB strategy                             | Files                                   |
| ------------------- | ------------------------------------- | --------------------------------------- | --------------------------------------- |
| Unit                | `vitest.config.ts`                    | PGlite in-memory (mocked `~/db.server`) | 5 test files                            |
| Integration/PGlite  | `vitest.config.ts`                    | PGlite in-memory                        | 1 test file (`db/queries/user.test.ts`) |
| Integration/real DB | `vitest.integration-realdb.config.ts` | Real PostgreSQL via `.env.test`         | 19 test files                           |
| E2E                 | `playwright.config.ts`                | Real PostgreSQL (fresh DB per run)      | 13 spec files                           |

**One orphaned test system — node:test:**

`app/backend.server/models/all_test.ts` aggregates 5 model test files (`disaster_record_test.ts`, `disaster_event_test.ts`, `event_test.ts`, `hip_test.ts`, `human_effects_test.ts`) — all using `node:test` from Node.js stdlib. `app/backend.server/handlers/all_test.ts` aggregates `handlers/form/form_test.ts` in the same way. **None are included in any Vitest config.** None are run by `yarn test:run2` or `yarn test:run3`. They are invisible to CI and the coverage tool.

**One legacy file:**

`tests/selenium/browser.side` — Selenium IDE recording. Not wired into any test runner.

---

### Test suite inventory

**`tests/unit/` (5 files)**

- `routes/mcp.test.ts` — 21 test cases covering MCP auth, request validation, and all MCP methods (initialize, tools/list, prompts/_, resources/_, shutdown). Uses `vi.mock` for `apiAuth`.
- `util/array.test.ts` — 5 cases for `eqArr` utility
- `util/id.test.ts` — utility tests (not read in detail)
- `utils/geoValidation.test.ts` — GeoJSON validation tests. **File is 875KB** — almost entirely inline Cyprus SALB GeoJSON fixture data embedded directly in the test file.
- `routes/lang/examples/test-route-module/_index.test.ts` — 3 cases for the dev example route. Tests exist only for the template route, not production routes.

**`tests/integration/db/queries/` (1 file)**

- `user.test.ts` — Tests `UserRepository.getById` only: happy path, not-found, and invalid UUID. Uses PGlite (in-memory). Setup in `tests/integration/db/setup.ts` uses `pushSchema` from `drizzle-kit/api` against a locally duplicated testSchema.

**`tests/integration-realdb/` (19 files across 4 domains)**

- `routes/disaster-record/damages/` — 6 files: `_index`, `$id`, `edit.$id`, `delete.$id`, `csv-import`, `csv-export`
- `routes/disaster-record/disruptions/` — 4 files: `_index`, `$id`, `edit.$id`, `delete.$id`
- `routes/disaster-record/losses/` — 4 files: `_index`, `$id`, `edit.$id`, `delete.$id`
- `routes/settings/assets/` — 6 files: `_index`, `$id`, `edit.$id`, `delete.$id`, `csv-import`, `csv-export`
- Pattern: `setupSessionMocks()` in `beforeEach` bypasses auth HOFs, real DB fixtures created/cleaned per test, route loader/action called directly (not over HTTP).

**`tests/e2e/` (13 spec files)**

- `login/login.spec.ts`
- `disaster-event/` — add, edit, delete, list (4 specs)
- `disaster-records/` — add, edit, delete, list (4 specs)
- `hazardous-event/` — add, edit, delete, list (4 specs)
- `global.setup.ts` — Creates a fresh PostgreSQL database, then applies `scripts/dts_database/dts_db_schema.sql` (static SQL snapshot).
- `global.teardown.ts` — Drops the test database.

---

### Gaps

**Gap L11-1: node:test suites invisible to CI and coverage**

`app/backend.server/models/*_test.ts` (6 files) and `app/backend.server/handlers/form/form_test.ts` all use `node:test` + `assert`. Neither Vitest config includes these files. `yarn test:run2` and `yarn test:run3` both exclude them. No `package.json` script runs them. Coverage tool (`v8`) never processes them.

These tests cover: `formSave`, `jsonCreate`, `jsonUpdate`, `csvCreate`, `csvUpsert` (form handler), plus `disaster_record`, `disaster_event`, `event`, `hip`, and `human_effects` models. All the business-critical model layer is tested only by orphaned code.

Already partially tracked: P1-17 (`form_test.ts`) and P1-21 (model tests). But no plan exists for the `all_test.ts` aggregator files.

**Gap L11-2: testSchema duplication in integration/PGlite tests**

`tests/integration/db/testSchema/` contains ~30 Drizzle schema files that mirror `app/drizzle/schema/`. When a new column is added to production schema, the test schema silently goes stale — PGlite tests pass against an outdated schema. There is no sync check. Fix: import production schema directly (`import * as schema from "~/drizzle/schema"` in `tests/integration/db/setup.ts`) — PGlite supports this.

**Gap L11-3: geoValidation.test.ts is 875KB due to inline fixture data**

`tests/unit/utils/geoValidation.test.ts` embeds massive GeoJSON feature collections (Cyprus administrative boundaries) directly as TypeScript literals. The file is 875KB. This: (1) slows the editor, (2) makes the test harder to read and maintain, (3) inflates git history on every update. Fixtures should be external `.json` files loaded with `fs.readFileSync` or `import`.

**Gap L11-4: E2E database setup uses static SQL snapshot, not Drizzle migrations**

`tests/e2e/global.setup.ts:54-64` reads `scripts/dts_database/dts_db_schema.sql` to create the E2E test database. This is the same static snapshot already identified as diverging from Drizzle migrations (P1-38). If the Drizzle schema has advanced beyond the snapshot, E2E tests run against a stale schema — tests may pass against the wrong structure, or fail due to missing columns.

The correct approach is to run `drizzle-kit migrate` on the fresh test database in `global.setup.ts`. This is blocked until P1-40 (migration isolation) and P1-38 (single migration system) are resolved.

**Gap L11-5: Hardcoded country UUID in E2E fixture setup**

`tests/e2e/disaster-event/add-disaster-event.spec.ts:35` hardcodes `countryId: "e34ef71f-0a72-40c4-a6e0-dd19fb26f391"`. This UUID must exist as a seeded row in `dts_db_schema.sql`. If the schema snapshot is regenerated without seed data, or the seed data changes, this test silently uses a non-existent FK and fails with a constraint violation rather than a meaningful test assertion.

**Gap L11-6: Auth is fully mocked away in integration-realdb tests**

`tests/integration-realdb/test-helpers.ts:29-67` mocks `requireUser`, `authLoaderWithPerm`, `authActionWithPerm`, `authActionWithPerm`. All integration-realdb tests call `setupSessionMocks()` which bypasses the real auth HOF logic. Auth bugs in those wrappers (e.g., the tenant check gap in P1-22) will not be caught by integration-realdb tests. No dedicated test file exists for `app/utils/auth.ts` or `app/utils/session.ts`.

**Gap L11-7: No tests for any P0 security bugs**

Zero test coverage exists for:

- `sanitizeInput` stripping apostrophes — P0-14 (`app/utils/security.ts`)
- `revokeUserApiAccess` sets `emailVerified=false` — P0-8 (`app/backend.server/models/api_key.ts`)
- `deleteById` missing `await` — P0-2 (`app/backend.server/models/common.ts`)
- Cross-tenant leak in `spatial-footprint-geojson.ts` — P1-29
- `env.ts` secret logging — P0-12

These are the highest priority bugs in the plan. None have regression guards.

**Gap L11-8: Broad application coverage missing**

Modules with zero test coverage (unit or integration):

- All auth routes (`$lang+/admin+/`, login, logout, TOTP, SSO callback)
- Organization model and routes (`app/backend.server/models/organization.ts`)
- All analytics and dashboard routes
- i18n pipeline (`app/backend.server/translations.ts`, `scripts/extractor-i18n.ts`)
- CSV handlers (`app/backend.server/handlers/form/form_csv.ts`) — only covered by orphaned node:test
- Sector, category, division models
- `app/db/queries/` repository layer (only `UserRepository.getById` tested)
- All admin routes (user management, access management, country account settings)

**Gap L11-9: Selenium legacy file is dead**

`tests/selenium/browser.side` is a Selenium IDE JSON recording. Not wired into any test runner, not referenced from `package.json`. It is untriggered, unmaintained dead weight.

---

### Already tracked — reference only

- **P0-4** — Add coverage thresholds baseline
- **P1-17** — Register `form_test.ts` with Vitest
- **P1-21** — Move model integration tests to `tests/integration-realdb/`
- **P2-8** — Run E2E tests against production build (not dev server)

---

### What works well

- `tests/integration-realdb/` pattern is solid: real DB, direct loader/action calls, per-test fixture creation and teardown with `beforeEach`/`afterEach`. This is the right model for the rest of the app.
- `test-helpers.ts` factory functions (`createTestIds`, `createTestUser`, `cleanupTestUser`, `mockSessionValues`) are clean and reusable — good design for scaling test coverage.
- MCP unit test is comprehensive: 21 cases covering all MCP methods, auth failure paths, malformed requests, and SSE response shape.
- E2E global setup/teardown creates and drops a dedicated test database — correct isolation, no shared state between runs.
- E2E specs manipulate DB directly (Drizzle) for fixture setup — avoids the brittle "create via UI" antipattern.
- Playwright config retains screenshots and videos on failure — good DX for CI debugging.

---

