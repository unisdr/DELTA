# Phase 0 — Critical Fixes

> Zero-risk, zero-breaking-change. All items can be done in any order within this phase. Ship as a rapid patch batch.
>
> **28 items** — check status in [`../INDEX.md`](../INDEX.md)

---

### P0-0 · Remove or Guard Example & Dev-Example Routes in Production

| | |
|---|---|
| **Issue** | Security / information exposure |
| **Files** | `app/routes/$lang+/examples+/` (30 routes), `app/routes/$lang+/api+/dev-example1+/` (7 routes) |
| **Current** | No auth guard. `/en/examples/...` and `/en/api/dev-example1/...` are publicly accessible in production, exposing internal implementation patterns, component demos, and scaffolding API endpoints. |

**Fix options (pick one):**

1. **Delete them** — if `dev-example1` and `examples` serve only as developer reference, remove them entirely. The patterns they demonstrate exist in the real domain routes.
2. **Guard with super admin session** — add an auth check at the top of each `_index.tsx` loader redirecting non-super-admins to 404.
3. **Compile-time exclusion** — move to a separate route directory excluded by `flatRoutes` in non-dev builds (requires `vite.config.ts` environment-based config).

**Recommended: Option 1 (delete)** — scaffolding templates belong in documentation or a separate dev branch, not in the production bundle.

**No TDD needed** — deletion verified by confirming routes return 404 after removal.

---

---

### P0-1 · Fix `NODE_ENV` in Production Dockerfile

| | |
|---|---|
| **Issue** | ISSUE-009 |
| **File** | `Dockerfile.app:27` |
| **Current** | `ENV NODE_ENV=development` |
| **Impact** | Session cookies lack `Secure` flag; React runs in dev mode in production |

**TDD steps:**
1. `test(red):` Add CI check asserting `docker inspect` shows `NODE_ENV=production`
2. `fix:` Change `ENV NODE_ENV=development` → `ENV NODE_ENV=production`

**No OpenAPI spec needed** — infrastructure change only.

---

---

### P0-2 · Fix No-Op Existence Check in `deleteById`

| | |
|---|---|
| **Issue** | ISSUE-008 |
| **File** | `app/backend.server/models/common.ts:67` and `:78` |
| **Current** | `const existingRecord = tx.select({})...` — missing `await`, always truthy |

**TDD steps:**
1. `test(red):` Write test in `tests/integration-realdb/` calling `deleteByIdForNumberId` with a non-existent ID. Assert it throws or returns `{ok: false}`. This test currently passes silently — it must fail.
2. `fix:` Add `await` + `.limit(1)` to both functions. Check result length before delete.

```typescript
// app/backend.server/models/common.ts:63 — target state
const existingRecord = await tx.select({}).from(table).where(eq(table.id, id)).limit(1);
if (existingRecord.length === 0) {
  throw new Error(`Record with ID ${id} not found`);
}
```

---

---

### P0-3 · Remove Debug `console.log` Calls + Add `no-console` Lint Rule

| | |
|---|---|
| **Issue** | ISSUE-015 |
| **Files** | `app/utils/auth.ts:433` (`console.log("1")`), `app/utils/auth.ts:448` (`console.log("2")`), `app/backend.server/services/emailValidationWorkflowService.ts:173` (`console.log("record", record)`) |
| **Scale** | 274 `console.*` calls across 55 files |

**Highest-priority removals (before lint rule):**
1. `auth.ts:433` — `console.log("1")` in auth critical path — leaks information on every forbidden request
2. `auth.ts:448` — `console.log("2")` in auth critical path
3. `emailValidationWorkflowService.ts:173` — `console.log("record", record)` — logs the full hazardous event record object to stdout on **every** validation workflow status change (published, validated, needs-revision)

**Steps:**
1. Remove the three priority calls above immediately.
2. Add `"no-console": "error"` to ESLint config (or equivalent Biome rule).
3. Run lint — the remaining violations become the backlog. Address module by module, starting with `app/utils/` and `app/backend.server/`.

**No TDD needed** — this is a lint rule addition. Lint gate is the verification.

---

---

### P0-4 · Add Coverage Thresholds to `vitest.config.ts`

| | |
|---|---|
| **Issue** | ISSUE-014 |
| **File** | `vitest.config.ts:30` — `coverage` block has no `thresholds` |

**Steps:**
1. Run `yarn coverage` and record the current baseline percentages.
2. Add thresholds at the current measured values (do not set them lower than reality):

```typescript
// vitest.config.ts — add inside coverage block
thresholds: {
  branches: <current_measured>,
  functions: <current_measured>,
  lines: <current_measured>,
},
```

3. From this point forward, coverage cannot regress. Increment thresholds by 5% per phase until targets are met (see Phase 4).

---

---

### P0-5 · Fix Placeholder Support Email in Production Error Boundary

| | |
|---|---|
| **Issue** | Production quality / user trust |
| **File** | `app/root.tsx:430` |
| **Current** | `<a href="mailto:support@example.org">support@example.org</a>` — placeholder email hardcoded in the global `ErrorBoundary`. Any user hitting a 500 error is directed to a non-existent address. |

**Fix:** Replace with the real support contact, or read from an environment variable:

```tsx
// Option A — env var (recommended, configurable per deployment)
{process.env.SUPPORT_EMAIL && (
    <a href={`mailto:${process.env.SUPPORT_EMAIL}`}>{process.env.SUPPORT_EMAIL}</a>
)}

// Option B — remove the contact line entirely until a real address is configured
```

**No TDD needed** — visual/content fix. Verify by triggering a 500 error in dev and confirming the correct email appears.

---

---

### P0-6 · Fix Hardcoded `/en/` URL in Email Notification Service

| | |
|---|---|
| **Issue** | Correctness — language-unaware notifications |
| **File** | `app/backend.server/services/emailValidationWorkflowService.ts:42–46` |
| **Current** | `recordUrl += '/en/hazardous-event/${entityId}'` — all three entity types hardcode `/en/` in the URL. Every validation email sent to a French, Spanish, or Arabic user contains an English link. |

**Fix:** Use `configPublicUrl()` + `ctx.lang` (already available as a parameter) to build the URL:

```ts
// emailAssignedValidators — target
recordUrl += `/${ctx.lang}/hazardous-event/${entityId}`;
```

**Note:** `ctx` is not currently a parameter of `emailAssignedValidators`. Add `ctx: BackendContext` as the first parameter and thread it through from the call site (`emailValidationWorkflowStatusChangeNotificationService` already receives `ctx`).

**No TDD needed** — verify by sending a test notification in a non-English language and confirming the URL uses the correct locale.

---

---

### P0-7 · Fix `deleteAllData` Silent Error Swallow in `human_effects.ts`

| | |
|---|---|
| **Issue** | Correctness — data integrity |
| **File** | `app/backend.server/handlers/human_effects.ts:355–366` |
| **Current** | `deleteAllData` calls `clear()` in a loop and checks `!r.ok`. But `r` is a `Response` object, and `Response.ok` reflects HTTP status (always `true` for 200). `clear()` returns status 200 even on error. Individual table clear failures are silently swallowed — the loop continues even if data was not cleared. |

**Fix:** Either return the error Response body directly, or refactor `clear()` to return a typed result instead of a `Response`:

```ts
// Option A — check parsed body (minimal change)
const body = await r.json();
if (!body.ok) { return r; }

// Option B (preferred) — refactor clear() to return typed result
interface ClearResult { ok: true } | { ok: false; error: string }
export async function clear(...): Promise<ClearResult>
```

**TDD steps:**
1. `test(red):` Call `deleteAllData` where one `clear()` call fails. Assert the returned result indicates failure, not success.
2. `fix:` Apply the fix.

---

---

### P0-8 · Fix `revokeUserApiAccess` Destructive Side Effect on Login

| | |
|---|---|
| **Issue** | Critical correctness bug — security |
| **File** | `app/backend.server/models/api_key.ts` — `revokeUserApiAccess` |
| **Current** | `revokeUserApiAccess` sets `emailVerified = false` on the user record as a side effect of revoking API tokens. `emailVerified` is checked during login — this inadvertently prevents the user from logging in via the web UI. An admin revoking a user's API access locks that user out of the application entirely. |

```ts
// Current — WRONG
await dr.update(userTable)
    .set({ emailVerified: false })  // breaks login
    .where(eq(userTable.id, userId));

// Fix — remove the emailVerified mutation entirely
// API revocation should only touch api_key rows, not the user table
```

**TDD steps:**
1. `test(red):` Write integration test: revoke API access for user X. Then attempt login with user X's credentials. Assert login succeeds.
2. `fix:` Remove the `emailVerified: false` update from `revokeUserApiAccess`. If disabling login is ever a desired feature, it must be a separate explicit operation (`deactivateUser`) with its own permission check and audit log.

**Measure:** `revokeUserApiAccess` no longer touches `userTable`. User can still log in after API access is revoked.

---

---

### P0-9 · Fix `handleTransaction` Sentinel String — Use Error Subclass

| | |
|---|---|
| **Issue** | Correctness / reliability |
| **File** | `app/backend.server/models/common.ts` — `handleTransaction`, `TransactionAbortError` |
| **Current** | `TransactionAbortError = "TransactionAbortError"` is a plain string constant. `handleTransaction` catches it with `if (e === TransactionAbortError)`. Any code that throws the identical string — from a library, a test harness, or a copy-paste — will be silently swallowed as an "intentional abort" instead of propagating as an error. TypeScript permits `throw "string"` with no warning. |

```ts
// Current — fragile
export const TransactionAbortError = "TransactionAbortError";

// Fix — unforgeable
export class TransactionAbortError extends Error {
    constructor() { super("TransactionAbortError"); this.name = "TransactionAbortError"; }
}

// handleTransaction becomes:
if (e instanceof TransactionAbortError) return null;
```

**TDD steps:**
1. `test(red):` Write test: `handleTransaction` that throws a string `"TransactionAbortError"` must NOT return null — it must re-throw. Currently it silently swallows it.
2. `fix:` Replace string constant with `Error` subclass. Update all `throw TransactionAbortError` call sites to `throw new TransactionAbortError()`.

**Measure:** `throw "TransactionAbortError"` is not caught by `handleTransaction`. Only `throw new TransactionAbortError()` triggers the intentional-abort path. `grep "throw TransactionAbortError"` (without `new`) returns zero results.

---

---

### P0-10 · Fix Type Export Bugs in `humanCategoryPresenceTable.ts` and `hipHazardTable.ts`

| | |
|---|---|
| **Issue** | Correctness — wrong types silently exported |
| **Files** | `app/drizzle/schema/humanCategoryPresenceTable.ts:39–41`, `app/drizzle/schema/hipHazardTable.ts:32–33` |
| **Current** | `humanCategoryPresenceTable.ts` exports `SelectHumanCategoryPresence` and `InsertHumanCategoryPresence` aliasing `humanDsgConfigTable.$inferSelect/Insert` — wrong table. `hipHazardTable.ts` exports `SelectDisasterRecords` and `InsertDisasterRecords` aliasing `disasterRecordsTable` — wrong file. Both are copy-paste accidents. |

**Fix (zero-risk, immediate):**

```ts
// humanCategoryPresenceTable.ts — fix both lines
export type SelectHumanCategoryPresence = typeof humanCategoryPresenceTable.$inferSelect;
export type InsertHumanCategoryPresence = typeof humanCategoryPresenceTable.$inferInsert;

// hipHazardTable.ts — remove the stray types entirely (they already exist in disasterRecordsTable.ts)
// Delete lines 32–33
```

**TDD steps:**
1. `fix:` Apply corrections.
2. `test:` Run `yarn tsc` — zero type errors. Confirm `SelectHumanCategoryPresence` has `deaths`, `injured`, `missing` boolean fields (not `hidden`, `custom` from humanDsgConfig).

**Measure:** `yarn tsc` passes. `SelectHumanCategoryPresence` correctly reflects `human_category_presence` columns.

---

---

### P0-11 · Remove Dead `countryName` Column from `instance_system_settings`

| | |
|---|---|
| **Issue** | Schema clutter + misleading default value |
| **File** | `instanceSystemSettingsTable.ts:25` |
| **Current** | `countryName varchar NOT NULL DEFAULT 'United State of America'` — column has a self-documenting removal comment and a typo in its default value ("United State"). Still present in schema, migrations, and seeds. |

**Strangler Fig (two steps to be safe):**

**Step A — Nullable:** `ALTER TABLE instance_system_settings ALTER COLUMN country_name DROP NOT NULL;` — makes it safe to ignore.

**Step B — Drop (after confirming no code reads it):**
```sql
ALTER TABLE instance_system_settings DROP COLUMN country_name;
```
Grep for `countryName` / `country_name` in `app/` before Step B to confirm no active readers.

**TDD steps:**
1. `chore:` Grep `countryName` across the codebase. If zero readers, proceed directly to Step B.
2. `migration:` Drop column.

**Measure:** `country_name` column absent from `instance_system_settings`. `yarn tsc` passes.

---

---

### P0-12 · Remove Secret Logging in `env.ts`

| | |
|---|---|
| **Issue** | Critical security — credential leak on every startup |
| **File** | `app/utils/env.ts:39` |
| **Current** | `console.log("kv", k, v)` prints every `.env` key-value pair to stdout including `SESSION_SECRET`, `DATABASE_URL`, `SSO_AZURE_B2C_CLIENT_SECRET`, `SMTP_PASS` |

**Fix:** Delete line 39 (`console.log("kv", k, v)`) and the `console.log(\`Loaded env vars from ${file}\`)` line above it. Keep only `console.warn` for missing file.

**TDD steps:**
1. `test(red):` Assert `loadEnvFile` with a file containing `SESSION_SECRET=abc123` does not write `abc123` to stdout.
2. `fix:` Remove the log lines.

**Measure:** `grep "kv"` in `env.ts` returns zero results. `yarn dev` startup logs contain no env var values.

---

---

### P0-13 · Fix `rejectUnauthorized: false` in SMTP Transport

| | |
|---|---|
| **Issue** | High security — TLS certificate verification disabled on email transport |
| **File** | `app/utils/email.ts:26` |
| **Current** | `rejectUnauthorized: false` disables certificate verification on SMTP connections. Comment reads "Debugging, remove this if working fine." Password reset links, invite codes, and validation notifications can be intercepted. |

**Fix:**
```ts
tls: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,   // enforce certificate verification
}
```

If the SMTP server uses a self-signed certificate (common in internal deployments), the correct fix is to add the CA certificate via `tls.ca`, not to disable verification entirely.

**Measure:** SMTP connections reject servers with invalid or self-signed certificates. `rejectUnauthorized: false` does not appear in the codebase.

---

---

### P0-14 · Fix `sanitizeInput` — Remove Destructive Quote Stripping

| | |
|---|---|
| **Issue** | High correctness — silently corrupts legitimate user input |
| **File** | `app/utils/security.ts:17` |
| **Current** | `input.replace(/['";]/g, "")` strips single quotes, double quotes, and semicolons from all user input under the label "SQL injection prevention". Drizzle ORM uses parameterized queries — SQL injection is impossible regardless of input content. This strip silently corrupts names like `O'Neill`, institution names with semicolons, and any text field containing quotes. |

**Fix:**
```ts
export function sanitizeInput(input: string | null): string | null {
    if (input === null) return null;
    // Only strip HTML tags to prevent XSS in rendered text
    return input.replace(/<[^>]*>/g, "").trim();
    // Do NOT strip quotes — Drizzle parameterized queries prevent SQL injection
}
```

**TDD steps:**
1. `test(red):` Assert `sanitizeInput("O'Neill")` returns `"O'Neill"` (not `"ONeill"`).
2. `fix:` Remove the quote-stripping regex.

**Measure:** `sanitizeInput("O'Neill")` === `"O'Neill"`. No `['";]` replacement in `security.ts`.

---

---

### P0-15 · Fix `destroyUserSession` — Graceful Handling of Missing Session

| | |
|---|---|
| **Issue** | Correctness — 500 error on double-logout or expired cookie |
| **File** | `app/utils/session.ts:131` |
| **Current** | `if (!sessionId) { throw new Error("Session is missing sessionId") }` — a user logging out with an expired or absent cookie gets a 500 instead of a redirect to login. |

**Fix:**
```ts
if (!sessionId) {
    // Already logged out — return a cleared cookie and let the caller redirect
    const session = await sessionCookie().getSession();
    return { "Set-Cookie": await sessionCookie().destroySession(session) };
}
```

**Measure:** Calling the logout route with no active session returns a redirect to login, not a 500.

---

---

### P0-16 · Delete Dead Cost Calculation API Endpoints

| | |
|---|---|
| **Issue** | Dead code — no callers, no auth, no tenant scope |
| **Files** | `app/routes/$lang+/api+/disaster-events.$disaster_event_id+/recovery-cost.ts`, `rehabilitation-cost.tsx`, `repair-cost.tsx`, `replacement-cost.tsx` |
| **Current** | Four bare loaders with no HOF wrapper and no `apiAuth()` call. Grep confirms zero callers in the entire codebase. Cost calculations are performed server-side via direct imports of `disaster-events-cost-calculator.ts` — not via HTTP. These files are dead code that also happen to have zero authentication and no tenant scoping. |

**Fix:** Delete all four files. Confirm the `disaster-events.$disaster_event_id+` route group becomes empty and can also be removed.

**No TDD needed** — deletion verified by confirming the routes return 404 after removal and no existing tests reference them.

---

---

### P0-17 · Fix `export_tables_for_translation.ts` — Writes to Directory, Not File

| | |
|---|---|
| **Issue** | Broken script — content translation export never runs correctly |
| **File** | `scripts/export_tables_for_translation.ts:26` |
| **Current** | `const filePath = path.resolve(process.cwd(), "locales", "content")` — resolves to the `content` directory path, not a file. `fs.writeFileSync(filePath, ...)` then tries to write to a directory and fails with `EISDIR`. The commented-out line above it shows the intended path: `'app/locales/content/en.json'`. `locales/content/en.json` must have been created by a previous correct version of the script. |

**Fix:**
```ts
const filePath = path.resolve(process.cwd(), "locales", "content", "en.json");
```

**Measure:** Running `yarn export_tables_for_translation` successfully writes `locales/content/en.json` and exits 0.

---

---

### P0-18 · Add `.dockerignore`

| | |
|---|---|
| **Issue** | Build correctness + security — Docker image includes `node_modules/`, `.git/`, `logs/`, local `.env` |
| **File** | Missing: `.dockerignore` at repo root |
| **Current** | `COPY . .` in `Dockerfile.app` copies the entire working directory with no exclusions. A local `.env` file is baked into the image layer. `node_modules/` (hundreds of MB) is copied then immediately overwritten by `yarn install --frozen-lockfile`. `logs/` and `.git/` add unnecessary size. |

**Fix:** Create `.dockerignore`:
```
node_modules/
.git/
logs/
.env
*.env
build/
dts_shared_binary/
.claude/
tests/e2e/
```

**Measure:** `docker build` produces an image without `node_modules/` or `.env` in the pre-install layer. Image size drops significantly.

---

---

### P0-19 · Fix `build_binary.sh` — Build Failure Must Be Fatal

| | |
|---|---|
| **File** | `scripts/build_binary.sh:32` |
| **Current** | `if ! yarn build; then echo "WARNING: yarn build failed, continuing anyway..."; fi` — a broken production build is packaged and distributed to country teams. |

**Fix:** Add `set -e` at the top of the script (it already has this on line 2 but the `if !` construct suppresses it) or replace with a hard exit:
```bash
yarn build  # set -e at top of script will exit on failure
```

**Measure:** Running `build_binary.sh` when `yarn build` fails exits non-zero and produces no `dts_shared_binary/` output.

---

---

### P0-20 · Add CSP Header to `entry.server.tsx`

| | |
|---|---|
| **Issue** | Security — production responses have no Content-Security-Policy |
| **Files** | `app/entry.server.tsx`, `vite.config.ts:35` |
| **Current** | `Content-Security-Policy` is set only inside `configureServer` in `vite.config.ts` — which runs exclusively on the Vite **dev** server. `entry.server.tsx` sets all other security headers on production SSR responses but is missing the CSP header. Security headers are also duplicated across both files with no shared source of truth. |

**Fix:** Move security headers (including CSP) to a single shared constant and import it in both places:
```ts
// app/utils/security-headers.ts
export const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'self'; ...",
  "X-Frame-Options": "SAMEORIGIN",
  // ... all headers
};
```
Apply in `entry.server.tsx` from this constant. Apply in `vite.config.ts` from the same constant.

**Measure:** Production HTML responses include `Content-Security-Policy` header with the same value as dev.

---

### P0-21 · Delete Dead Selenium Legacy File

| | |
|---|---|
| **Issue** | Dead test file — wired to nothing, maintained by nobody |
| **File** | `tests/selenium/browser.side` |
| **Current** | Selenium IDE JSON recording. Not referenced from `package.json`, not run by any CI step, not part of the Playwright or Vitest suites. Untriggered, unmaintained dead weight. |

**Fix:** Delete `tests/selenium/browser.side`. If the `tests/selenium/` directory becomes empty, delete the directory too.

**Measure:** `tests/selenium/` directory does not exist. No `package.json` script references Selenium.

---

---

### P0-22 · Fix `readme.md` Factual Errors

| | |
|---|---|
| **Issue** | Wrong information in the first file any contributor reads |
| **File** | `readme.md` |
| **Current** | Three factual errors: (1) Testing section says "Jest" — project uses Vitest. (2) Test command shown is `yarn run test` which does not exist — correct command is `yarn test:run2`. (3) Tech stack lists "Remix (React)" — project migrated to React Router v7. |

**Fix:**
1. Replace "Jest" with "Vitest" in the Testing section.
2. Replace `yarn run test` with `yarn test:run2` (unit/integration) and `yarn test:e2e` (E2E).
3. Replace "Remix (React)" with "React Router v7" in the Technology stack section.
4. Replace `yarn run dbsync` with `yarn dbsync` (cosmetic consistency with `package.json`).

**Measure:** `readme.md` testing section references Vitest and correct commands. Tech stack names match the actual framework in use.

---

---

### P0-23 · Fill Apache 2.0 License Copyright Placeholder

| | |
|---|---|
| **Issue** | Legal — Apache 2.0 license is incomplete without a named rights holder |
| **Files** | `LICENSE`, `_docs/License/LICENSE.md` |
| **Current** | `LICENSE` contains `Copyright [yyyy] [name of copyright owner]` — the placeholder text from the Apache 2.0 template. Without the actual year and rights holder, the license grant is ambiguous. This is also the primary gap under DPG Indicator 2 (Open License). |

**Fix:** Replace the placeholder with the correct UNDRR/UNISDR attribution and year of first publication. Confirm the exact legal entity name with UNDRR before committing.

**Measure:** `grep "\[yyyy\]" LICENSE` returns no results. DPG Indicator 2 moves to fully compliant.

---

---

### P0-24 · Create `CONTRIBUTING.md`

| | |
|---|---|
| **Issue** | No authoritative contribution guide — DPG Indicator 5, GitHub Community Standards |
| **File** | `CONTRIBUTING.md` (root) |
| **Current** | `readme.md:162` asks contributors to follow `_docs/code-structure/code-structure.md`, but that file contains only a folder listing. `_docs/License/INDEX.md` plans a `Contribution-guidelines.md` but it was never written. Contributors have no documented process for: dev environment setup, running tests before submitting, branching model, commit message format, or PR review expectations. |

**Content to include:**
- Dev environment setup (pointer to Quick Start in README + `.env.test` for test DB)
- Branching model (feature branches off `main`, naming convention)
- Commit message format — this is where Conventional Commits should be introduced (see P1-45)
- How to run the full test suite before submitting (`yarn test:run2` + `yarn tsc`)
- PR process: what reviewers check, expected turnaround
- What contributions are and are not accepted (mirrors the current `readme.md:164` policy)
- License agreement: "By submitting a contribution, you agree to license your work under Apache 2.0"

**Measure:** `CONTRIBUTING.md` exists at repo root. GitHub Community Standards tab shows green for Contributing.

---

---

### P0-25 · Create `CODE_OF_CONDUCT.md`

| | |
|---|---|
| **Issue** | Required for DPG recognition and contributor community trust |
| **File** | `CODE_OF_CONDUCT.md` (root) |
| **Current** | No code of conduct exists. Without one there is no enforceable standard for community behaviour — a requirement for any UN-backed open-source tool targeting public contributor communities. |

**Fix:** Adopt the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) — the de facto standard used by the Linux Foundation, Apache Software Foundation, and most major open-source projects. Fill in the enforcement contact email (UNDRR team contact or a dedicated address).

**Measure:** `CODE_OF_CONDUCT.md` exists at repo root. GitHub Community Standards tab shows green for Code of Conduct.

---

---

### P0-26 · Create `SECURITY.md`

| | |
|---|---|
| **Issue** | No vulnerability disclosure process for a UN-backed national disaster tracking system |
| **File** | `SECURITY.md` (root) |
| **Current** | No documented security disclosure channel. If a researcher finds a vulnerability in tenant isolation, auth, or data handling, there is no process for responsible disclosure. GitHub also uses `SECURITY.md` to show a "Report a vulnerability" button on the Security tab. |

**Content:**
- Supported versions table (which versions receive security patches)
- How to report: email address or GitHub private security advisory
- Expected response timeline (e.g., acknowledgement within 72 hours)
- What to include in a report (steps to reproduce, affected version, impact assessment)
- Scope: what is in-scope vs out-of-scope for the program

**Measure:** `SECURITY.md` exists at root. GitHub Security tab shows "Report a vulnerability" button. Security researchers have a clear disclosure path.

---

---

### P0-27 · Add `NOTICE` File (Apache 2.0 Requirement)

| | |
|---|---|
| **Issue** | Legal — Apache 2.0 Section 4(d) requires a `NOTICE` file for attribution |
| **File** | `NOTICE` (root) |
| **Current** | Apache 2.0 requires that if the work contains attribution notices, they must be preserved in a `NOTICE` file included with any redistribution. No `NOTICE` file exists. Without it, redistributors (countries deploying DELTA) cannot fully comply with the license terms. |

**Fix:** Create a `NOTICE` file containing at minimum:
```
DELTA Resilience
Copyright [year] UNDRR / [full legal entity name]

This product includes software developed under the Apache License 2.0.
```
Add any required third-party attribution notices identified in `_docs/License/third-party-dependencies-review.md`.

**Measure:** `NOTICE` file exists at repo root. DPG Indicator 2 compliance is complete.

---

---

