# Phase 2 — Security & Quality Hardening

> Security hardening and quality gates. Some items require coordination (DB migrations, API versioning). None are breaking for existing deployments.
>
> **12 items** — check status in [`../INDEX.md`](../INDEX.md)

---

### P2-1 · Add Rate Limiting on Auth Endpoints

| | |
|---|---|
| **Issue** | ISSUE-011 |
| **Files** | No existing rate limiting middleware found in any route or Express config |

**OpenAPI spec:** Not required — this is middleware, not a new endpoint.

**TDD steps:**
1. `test(red):` Write supertest integration test: send 11 POST requests to the login endpoint from the same IP within 1 minute. Assert the 11th returns HTTP 429 with `Retry-After` header.
2. `fix:` Add `express-rate-limit` middleware applied specifically to auth routes:

```typescript
// app/entry.server.tsx or Express middleware setup
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again later." },
});

// Apply to: login, TOTP verify, password reset
app.use("/:lang/admin/login", authLimiter);
app.use("/:lang/user/login", authLimiter);
app.use("/:lang/user/password-reset", authLimiter);
```

**New dependency:** `express-rate-limit` (no additional infrastructure needed for single-node; switch to `rate-limit-redis` in Phase 4 when Redis is added).

---

---

### P2-2 · Fix Super Admin Mock Session — Use Real UUID

| | |
|---|---|
| **Issue** | ISSUE-010 |
| **File** | `app/utils/auth.ts:420–431` — hardcoded `{ id: "super_admin" }` string as userId |

**TDD steps:**
1. `test(red):` Write Playwright E2E test: perform a super admin action, query `audit_logs`, assert `userId` is a valid UUID (not the string `"super_admin"`).
2. `fix:` Fetch the actual `super_admin_users` row in `getSuperAdminSession()` and include it. Replace the mock object with a typed `SuperAdminUserSession`.

---

---

### P2-3 + P2-4 · API Key Table Migration (Hash Secrets + Add `assigned_to_user_id`)

> **One migration, two issues.** Both touch `api_key` table. Execute together.

| | |
|---|---|
| **Issues** | ISSUE-004 (plaintext secret) + ISSUE-005 (metadata in name string) |
| **File** | `app/backend.server/models/api_key.ts:40` (secret), `api_key.ts:43–44` (`__ASSIGNED_USER_` pattern) |

**OpenAPI spec required:** Yes — `POST /api/api-keys`, `GET /api/api-keys`, `DELETE /api/api-keys/:id` responses change shape.

Spec location: `_docs/api-specs/api-keys-v2.yaml`

**Strangler Fig migration sequence:**

**Step A — Additive migration (non-breaking):**
```sql
ALTER TABLE api_key
  ADD COLUMN secret_hash text,           -- SHA-256 of the raw secret
  ADD COLUMN assigned_to_user_id uuid REFERENCES "user"(id);
```

**Step B — Backfill:**
```typescript
// Migration script: hash existing plaintext secrets, parse __ASSIGNED_USER_ names
for (const key of existingKeys) {
  const hash = createHash("sha256").update(key.secret).digest("hex");
  const userId = TokenAssignmentParser.parse(key.name)?.userId ?? null;
  const cleanName = key.name.replace(/__ASSIGNED_USER_.+$/, "");
  await db.update(apiKeyTable).set({
    secretHash: hash,
    assignedToUserId: userId,
    name: cleanName,
  }).where(eq(apiKeyTable.id, key.id));
}
```

**Step C — Cut over application code:**
- `generateSecret()` → store hash in `secretHash`, return raw secret to caller once
- `apiAuth()` → hash incoming token, compare to `secretHash`
- `getTokensAssignedToUser()` → query via `assigned_to_user_id` FK (index seek, not full scan)
- Delete `TokenAssignmentParser`

**Step D — Drop legacy columns (after validation period):**
```sql
ALTER TABLE api_key DROP COLUMN secret;
```

**TDD steps:**
1. `test(red):` Assert `apiAuth` with correct raw secret succeeds; assert querying DB directly shows no plaintext match.
2. `test(red):` Assert `getTokensAssignedToUser` query plan uses index on `assigned_to_user_id`.
3. `fix:` Implement Steps A–C above.

---

---

### P2-5 · Move File Uploads to Shared Object Storage

| | |
|---|---|
| **Issue** | Hard blocker for any horizontal scaling |
| **Files** | `app/utils/paths.ts`, `app/components/ContentRepeater/PreUploadFile.tsx:99`, `app/backend.server/models/event.ts:1809` |
| **Current** | All uploads written to local filesystem under `uploads/` — `fs.writeFileSync` to local disk |
| **Impact** | Cannot run more than one Node.js instance. Node B cannot serve files written by Node A. Disaster event/record attachments would randomly 404 under a load balancer. |

**Target:** Replace local `fs` writes/reads with an object storage client (S3-compatible API — works with AWS S3, MinIO self-hosted, Azure Blob via S3 compatibility layer).

**Strangler Fig sequence:**

**Step A — Abstract the storage layer:**
Introduce a `StorageProvider` interface wrapping read/write/delete/exists operations. Implement `LocalStorageProvider` (current behaviour) and `S3StorageProvider`. Switch via env var `STORAGE_BACKEND=local|s3`.

**Step B — Migrate upload writes:**
Replace `fs.writeFileSync` in `PreUploadFile.tsx` and all paths in `event.ts` to use `StorageProvider`.

**Step C — Migrate file serving:**
Routes that stream files back to the client must read from `StorageProvider`, not `fs.readFileSync`.

**Step D — Migrate temp upload cleanup:**
`uploads/temp/` cleanup logic must go through `StorageProvider.delete()`.

**New env vars:** `STORAGE_BACKEND`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` (for MinIO).

**TDD steps:**
1. `test(red):` Write integration test: upload a file, restart server with a fresh process (simulating a different node), assert file is still retrievable.
2. `fix:` Implement `StorageProvider` abstraction + `S3StorageProvider`.

**Measure:** File retrieval succeeds regardless of which node handles the request.

---

---

### P2-6 · Fix Translation Import Startup Race Condition

| | |
|---|---|
| **File** | `app/backend.server/services/translationDBUpdates/update.ts:116` |
| **Current** | `importTranslationsIfNeeded()` runs on every process start. Two nodes starting simultaneously both detect "import needed" and both run the full import concurrently. |
| **Impact** | Under multi-node deployment: redundant double-import on every deploy. Low data-integrity risk (last write wins on JSONB merge) but wastes DB resources at the worst possible time (startup under load). |

**Fix:** Use a PostgreSQL advisory lock to ensure only one node runs the import at a time:

```typescript
// update.ts — wrap import in advisory lock
const TRANSLATION_IMPORT_LOCK_KEY = 123456789; // arbitrary stable integer

await dr.execute(sql`SELECT pg_advisory_lock(${TRANSLATION_IMPORT_LOCK_KEY})`);
try {
  await runImport();
} finally {
  await dr.execute(sql`SELECT pg_advisory_unlock(${TRANSLATION_IMPORT_LOCK_KEY})`);
}
```

PostgreSQL advisory locks are connection-scoped — if the process crashes, the lock is automatically released. No Redis required.

**TDD steps:**
1. `test(red):` Simulate two concurrent calls to `importTranslationsIfNeeded()`. Assert the import logic runs exactly once.
2. `fix:` Wrap with advisory lock.

---

---

### P2-7 · Add Zod Input Validation to All API Write Endpoints

| | |
|---|---|
| **Issue** | Data quality / security — unvalidated external inputs reach the model layer |
| **Files** | All `add.ts` and `upsert.ts` routes across every API group |
| **Current** | Routes cast the request body directly to Drizzle schema types (e.g., `let data: SelectDisasterEvent[] = await request.json()`). TypeScript type annotations are erased at runtime — no runtime schema enforcement. Malformed, missing, or out-of-range fields produce obscure database errors rather than clear 422 responses. |

**Fix:** Introduce Zod schemas generated from (or aligned with) the Drizzle table definitions. Validate the request body before passing to `jsonCreate` / `jsonUpsert`. Return structured 422 responses on validation failure.

Suggested location: `app/backend.server/handlers/form/form_api_validate.ts` — a thin validation wrapper that `add.ts` and `upsert.ts` call before delegating.

**TDD steps:**
1. `test(red):` POST to `disaster-event/add` with a missing required field (`startDate`). Assert 422 with an error body identifying the field.
2. `fix:` Add Zod schema for `DisasterEventFields`. Wire into `jsonCreate`.
3. `refactor:` Apply the same pattern to all other domain `add.ts` / `upsert.ts` files.

**Measure:** All API write endpoints return 422 with a structured error body for invalid input, not a 500 from the database layer.

---

---

### P2-8 · Run E2E Tests Against Production Build

| | |
|---|---|
| **File** | `playwright.config.ts:19` |
| **Current** | `webServer: { command: "yarn dev", port: 4000 }` — E2E tests run against the Vite dev server (`NODE_ENV=development`, HMR enabled, source maps). The production build (`yarn build` + `react-router-serve`) is never tested end-to-end. A build-time error or production-only behaviour difference goes undetected. |

**Fix:**
```ts
webServer: {
  command: "yarn build && react-router-serve ./build/server/index.js",
  port: 4000,
  env: { NODE_ENV: "production" },
}
```

**Measure:** E2E tests start `react-router-serve` against the production build. A broken `yarn build` fails the E2E run.

---

---

### P2-9 · Extract Inline GeoJSON Fixtures from `geoValidation.test.ts`

| | |
|---|---|
| **Issue** | Test maintainability — 875KB test file |
| **File** | `tests/unit/utils/geoValidation.test.ts` |
| **Current** | Cyprus SALB GeoJSON feature collections (administrative boundary data) are embedded directly as TypeScript object literals inside the test file. The file is 875KB. This slows the editor on open, inflates `git diff` output on every fixture update, and buries the actual assertions inside hundreds of lines of geometry coordinates. |

**Fix:** Extract each fixture into a separate `.json` file under `tests/fixtures/geo/` and load them in the test:
```ts
import { readFileSync } from "fs";
import { join } from "path";

const cyprusSalb = JSON.parse(
  readFileSync(join(__dirname, "../../fixtures/geo/cyprus-salb.json"), "utf-8")
);
```

**Measure:** `geoValidation.test.ts` is < 5KB. Fixture files live in `tests/fixtures/geo/`. `yarn test:run2` still passes.

---

---

### P2-10 · Remove Hardcoded Country UUID from E2E Fixtures

| | |
|---|---|
| **Issue** | Test fragility — E2E fixture tied to specific seed row |
| **File** | `tests/e2e/disaster-event/add-disaster-event.spec.ts:35` |
| **Current** | `countryId: "e34ef71f-0a72-40c4-a6e0-dd19fb26f391"` is hardcoded. This UUID must pre-exist in the seeded database from `dts_db_schema.sql`. If the snapshot is regenerated without that row, the test fails with a FK constraint violation rather than a meaningful assertion. |

**Fix:** In `global.setup.ts` (or a shared fixture helper), insert a known test country row with a deterministic UUID as part of the setup transaction. Reference the UUID from a shared `TEST_FIXTURES` constant:
```ts
// tests/e2e/fixtures.ts
export const TEST_COUNTRY_ID = "e34ef71f-0a72-40c4-a6e0-dd19fb26f391";

// global.setup.ts — ensure the country row exists
await db.insert(countryAccounts).values({ id: TEST_COUNTRY_ID, ... }).onConflictDoNothing();
```

**Measure:** E2E tests pass even if `dts_db_schema.sql` is regenerated without pre-seeded rows. The fixture dependency is explicit and self-creating.

---

---

### P2-11 · Publish Versioned Docs Site — MkDocs Material + `mike`

| | |
|---|---|
| **Issue** | No published docs site — all docs are raw GitHub markdown with no versioning |
| **Current** | Countries running different versions of DELTA read the same `main` branch docs, which may not match their installed version. No searchable, navigable docs site exists. The planned API specs have no publication pipeline. |

**Recommended stack:** [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) + [`mike`](https://github.com/jimporter/mike) for versioning, deployed to GitHub Pages.

- **Why MkDocs over Docusaurus:** Zero JavaScript framework dependency, Markdown-native, excellent i18n support (mirrors DELTA's multi-language design), government-appropriate aesthetic, and the `_docs/` directory structure maps directly to MkDocs's `docs/` convention with minimal restructuring.
- **Versioning:** `mike deploy v0.2 latest --push` after each release. `mike set-default latest`. Docs for each version remain accessible at `/v0.1.3/` while `latest` always tracks `main`.

**CI integration (add to P1-37 pipeline):**
```yaml
docs:
  - pip install mkdocs-material mike
  - mkdocs build --strict   # fail if any cross-reference is broken
  - mike deploy $VERSION --push   # only on release tags
```

**Docs-as-code quality gates (add to PR CI):**
```yaml
  - npx markdownlint-cli '_docs/**/*.md' 'readme.md' 'CONTRIBUTING.md'
  - npx markdown-link-check '_docs/**/*.md'
  - mkdocs build --strict
```

**Measure:** Published docs site at `https://unisdr.github.io/delta/` (or custom domain). Version selector shows all releases. `mkdocs build --strict` runs in CI on every PR and fails on broken links or cross-references.

---

---

### P2-12 · Auto-Generate API Reference with TypeDoc

| | |
|---|---|
| **Issue** | No reference documentation for the TypeScript codebase |
| **Files** | `package.json`, `typedoc.json` (new), `_docs/api-reference/` (generated) |
| **Current** | The TypeScript codebase has strict types throughout but no TSDoc comments on public interfaces and no generated API reference. The empty `_docs/api.md` leaves integrators and AI assistants without a machine-readable reference. |

**Fix:**
```bash
yarn add -D typedoc typedoc-plugin-markdown
```
`typedoc.json`:
```json
{
  "entryPoints": ["app/routes/api+/", "app/backend.server/models/"],
  "out": "_docs/api-reference",
  "plugin": ["typedoc-plugin-markdown"],
  "excludePrivate": true
}
```
Add `yarn typedoc` to CI (runs on every merge to `main`). Output committed to `_docs/api-reference/` or published as part of the MkDocs site (P2-11).

Add TSDoc comments progressively to public model interfaces and route loaders as part of normal development — AI assistants can be prompted to add TSDoc to any file they touch.

**Measure:** `yarn typedoc` generates a complete API reference from existing type signatures. `_docs/api-reference/` is always current with `main`. AI assistants can reference the generated docs for accurate type information.

---

---

### P2-13 · Write User-Facing Onboarding Tutorial

| | |
|---|---|
| **Issue** | No tutorial for the actual end users — country-level disaster recording staff |
| **Current** | The only end-user documentation is `_docs/dashboards/sectors/user-guide.md`. There is no tutorial covering the primary use case: a national staff member creating their first hazardous event, attaching disaster records with losses and damages, running an analytics report, and exporting data. DPG Indicator 5 explicitly requires documentation sufficient for country-level deployment and use. |

**Content to write (`_docs/tutorials/my-first-disaster-record.md`):**
1. Logging in and navigating the dashboard
2. Creating a hazardous event with geospatial footprint
3. Adding a disaster record and linking it to the event
4. Entering losses and damages by sector
5. Reviewing the analytics dashboard
6. Exporting data as CSV

**Note:** This tutorial is the single highest-impact contribution for DPG Indicator 5 compliance and for onboarding national data producers — DELTA's primary user group.

**Measure:** A national staff member with no prior DELTA experience can set up their first complete disaster record by following the tutorial with no additional assistance.

---

---

