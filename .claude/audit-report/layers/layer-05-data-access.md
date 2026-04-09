## Layer 5 — Data Access Layer

### Audit methodology correction

**Before starting Layer 5, a flat directory scan was run.** The audit had previously relied on documentation-guided traversal (CLAUDE.md layer diagram) rather than enumerating `app/` directly. This caused `app/db/queries/` — a complete second data access tier — to be missed entirely during Layers 0–4. From this layer onward, flat directory scans precede each layer's analysis.

---

### Four parallel data access layers — structural fragmentation

This is the most significant architectural finding in the codebase. Four distinct patterns are used to access the database, with no convention governing which to use:

| Layer                        | Location                                                                                           | Files     | Used by                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------- | --------- | --------------------------------- |
| **Fat models**               | `app/backend.server/models/`                                                                       | ~30 files | Handlers, routes, services        |
| **Thin repositories**        | `app/db/queries/`                                                                                  | 33 files  | Routes directly, models, services |
| **Handler-embedded Drizzle** | `app/backend.server/handlers/disaster_record.ts`, `disasterevent.ts`, `hazardevent.ts`, `asset.ts` | 4 files   | Routes only                       |
| **Partial utilities**        | `app/backend.server/utils/`                                                                        | 4 files   | Partially adopted                 |

A route can access data through any of these four paths. There is no enforcement layer preventing routes from importing directly from `app/db/queries/` bypassing the service/handler layer. The `app/db/queries/` repositories are imported in 47+ locations including `app/routes/` directly — the boundary that should separate presentation from data access does not exist structurally.

**Why this matters for tenant isolation:** Fat models (`models/disaster_record.ts`, etc.) consistently check `country_accounts_id` FK before every write. Thin repositories (`db/queries/DisasterRecordsRepository.ts`) accept `countryAccountsId` as a parameter but trust the caller to pass the right value. A route importing a repository directly and passing an arbitrary tenant ID would bypass the model's tenant checks. Row-Level Security (P3-2) is the structural fix — the application layer defence alone is insufficient across four access paths.

---

### `app/db/queries/` — the missed repository tier

33 files organized around domain entities:

```
app/db/queries/
  UserRepository.ts
  DisasterRecordsRepository.ts
  HazardousEventRepository.ts
  ApiKeyRepository.ts
  InstanceSystemSettingRepository.ts
  CountryAccountsRepository.ts
  OrganizationRepository.ts
  ... (26 more)
```

**Pattern:** Plain object exports (not classes), every method accepts `tx?: Tx` for transaction participation, typed with Drizzle's `$inferInsert` / `$inferSelect`. Example:

```ts
// app/db/queries/UserRepository.ts
export const UserRepository = {
    async getById(id: string, tx?: Tx): Promise<User | undefined> { ... },
    async getByEmail(email: string, tx?: Tx): Promise<User | undefined> { ... },
    async create(data: NewUser, tx?: Tx): Promise<User> { ... },
    async updateById(id: string, data: Partial<User>, tx?: Tx): Promise<User> { ... },
};
```

**Positive traits:** Consistent `tx?: Tx` design enables transaction composition. Typed with Drizzle inference. `UserRepository.getById` includes UUID format validation before querying — defensive input handling. `ApiKeyRepository.getBySecret` does a hash comparison correctly.

**The contradiction:** `app/db/queries/` was clearly intended as the canonical repository tier, following the Repository pattern more cleanly than the fat models. But it was never designated as such — fat models and direct Drizzle in handlers coexist and are actively imported alongside it. The designation was implied, never enforced.

---

### `common.ts` — P0-2 confirmed at source

`app/backend.server/models/common.ts` contains the central model utilities. The P0-2 bug is here:

```ts
// common.ts:67
const existingRecord = tx.select({}).from(table).where(eq(table.id, id)); // no await
if (!existingRecord) {
	// always truthy — returns Drizzle query builder, never null
	throw new Error(`Record with id ${id} not found`);
}
```

The existence check is present in both `deleteByIdForNumberId` and `deleteByIdForStringId`. Both are broken identically — neither ever throws "not found" regardless of whether the record exists. `dev_example1.ts` contains a third copy of the same bug in its own `devExample1DeleteByIdAndCountryAccounts` function (same pattern, same missing `await`).

---

### `handleTransaction` — sentinel string fragility

```ts
// common.ts
export const TransactionAbortError = "TransactionAbortError";

export async function handleTransaction<T>(fn: ...) {
    try {
        return await dr.transaction(fn);
    } catch (e) {
        if (e === TransactionAbortError) return null; // intentional abort
        throw e; // unexpected error — re-throw
    }
}
```

The sentinel is a plain `string`. Any code that coincidentally `throw`s the exact string `"TransactionAbortError"` (a library, a linter rule printing to stderr, a test harness) will cause `handleTransaction` to silently return `null` instead of propagating the error. TypeScript allows `throw "string"` without warning. The correct pattern is a custom `Error` subclass (`class TransactionAbortError extends Error {}`), which is unforgeable and distinguishable from arbitrary thrown strings.

---

### `logAudit` — audit writes may escape transaction

```ts
// models/auditLogs.ts
export async function logAudit(
    action: string,
    entityType: string,
    entityId: string,
    userId: string,
    tx?: Tx,            // ← optional transaction
): Promise<void> {
    const db = tx ?? dr;
    await db.insert(auditLogsTable).values({ ... });
}
```

`tx` is optional. If a caller omits it, the audit log write uses the global `dr` connection — outside any surrounding transaction. The main write can roll back on error; the audit log write already committed. The codebase has callers of both types: `formSave` always passes `tx` (correct), but several model functions call `logAudit` without passing `tx`. The result: audit logs can contain entries for operations that were rolled back.

---

### `api_key.ts` — over-engineering signs, two critical bugs

`app/backend.server/models/api_key.ts` (818 lines) shows signs of incremental AI additions:

- Comment markers throughout: `// ORIGINAL:`, `// ENHANCED:`, `// NEW:`
- Four classes: `TokenAssignmentParser`, `UserStatusValidator`, `ApiSecurityAudit`, `UserAccessManager`
- The repository-like queries that belong in `db/queries/ApiKeyRepository.ts` are duplicated here

**Critical bug 1 — Full table scan:**

```ts
// api_key.ts — getTokensAssignedToUser
const allKeys = await dr.query.apiKeyTable.findMany({
	with: { managedByUser: true },
});
const assignedKeys = allKeys.filter(
	(key) => parseAssignedUserId(key.name) === userId,
);
```

Fetches **all API keys in the database** (across all tenants), then filters in JavaScript. In a multi-tenant deployment with 10,000 keys, every call transfers the full table. Extends the scope of P2-3/P2-4 which adds a proper `assigned_to_user_id` column.

**Critical bug 2 — Destructive side effect on login:**

```ts
// revokeUserApiAccess
await dr
	.update(userTable)
	.set({ emailVerified: false }) // ← breaks login as side effect
	.where(eq(userTable.id, userId));
```

Revoking API access sets `emailVerified = false` on the user record. `emailVerified` is checked during login — this prevents the user from logging in at all. An admin revoking API tokens inadvertently locks the user out of the web UI.

**Regex inconsistency in `TokenAssignmentParser`:**

- `parseAssignedUserId`: uses `/.+$/` — matches any characters after the prefix (UUIDs)
- `getCleanTokenName`: uses `/\d+$/` — only strips trailing digits (not UUIDs)

Result: token names with UUID suffixes are never cleaned. Display of assigned tokens always shows the raw internal suffix.

---

### Model tests inside `app/` — real DB required, not registered

```
app/backend.server/all_test.ts          → imports models/all_test.ts + handlers/all_test.ts
app/backend.server/models/all_test.ts   → imports password_check_test, disaster_event_test, etc.
app/backend.server/handlers/all_test.ts → imports form_test.ts
```

All test files use `import { describe, it, before } from "node:test"` — Node.js's built-in runner. All import `dr` directly, requiring a live PostgreSQL connection. None are under `tests/` — excluded from Vitest configs. These are integration tests masquerading as unit tests, using a different test runner, located in the source tree rather than the test tree. They almost certainly do not run in CI via `yarn test:run2` or `yarn test:run3`.

The correct home for these is `tests/integration-realdb/` with the `vitest.integration-realdb.config.ts` config. Moving them would bring them under proper CI coverage reporting and make their real-DB requirement explicit.

---

### `db.server.ts` — connection pool not configured

```ts
// app/db.server.ts:20
dr = drizzle(process.env.DATABASE_URL!, { logger: false, schema });
```

Drizzle is initialized with a connection string only. No `pg.Pool` with explicit `max`, `min`, `idleTimeoutMillis`, or `connectionTimeoutMillis`. Under default `node-postgres` settings, the pool grows unbounded until PostgreSQL's `max_connections` limit is hit and new connections start failing. At load-spike scale (100× traffic during a national emergency), this can exhaust the DB connection limit silently. Tracked as P1-1.

---

### `disaster_record.ts` — correct tenant isolation, but analytics coupled to write path

**Tenant isolation done right:** Every write operation checks that the referenced `disasterEventId` belongs to the same `countryAccountsId` as the caller before inserting. This is the correct application-level pattern.

**Analytics coupling:** `updateTotalsUsingDisasterRecordId(tx, id)` is called inside `disasterRecordsCreate` and `disasterRecordsUpdate` — analytics recalculation is triggered synchronously in the write transaction. A slow analytics query (joining across large datasets) can hold the write transaction open, increasing lock contention on the `disaster_records` table under concurrent writes.

**HIP validation duplication:** The 20-line HIP hierarchy validation block (`validateHazardImpactProfile`) is copy-pasted verbatim into both `disasterRecordsCreate` and `disasterRecordsUpdate`. Three total copies across the codebase (also in `event.ts`).

---

### `event.ts` — domain logic in the model layer

`processValidationAssignmentWorkflow` in `models/event.ts` is a full approval workflow orchestrator: validates roles, inserts validator assignments, updates status, sends email notifications. This is application-layer business logic — it belongs in a service or use case, not in the data access layer. The model should not know about email sending. Tracked as P5-6 (`ApprovalWorkflowService` extraction).

---

### What works well

- `UserRepository.getById` in `db/queries/` validates UUID format before querying — defensive input handling at the repository boundary
- Consistent `tx?: Tx` on every `db/queries/` method — correct design for transaction composition
- `selectTranslated` in `common.ts` — clean COALESCE pattern for multi-language JSONB fields; used consistently across models
- `constraintErrors()` in `common.ts` — translates PostgreSQL constraint violations into readable error codes; prevents raw SQL errors from leaking to users
- `formSave` always passes `tx` to `logAudit` — the most critical call path is correctly transactional
- `byId` in all models enforces `countryAccountsId` tenant isolation correctly for read operations
- `DisasterRecordsRepository.getByIdAndCountryAccountsId` — the repository tier also enforces tenant isolation on reads

---

