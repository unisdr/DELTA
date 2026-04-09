## Layer 4 — Backend Handlers & Business Logic

### The Form-CSV-API Triple — the codebase's best abstraction

`app/backend.server/handlers/form/` contains three closely related files forming the central mutation engine:

| File                  | Handles                     | Entry point                                 |
| --------------------- | --------------------------- | ------------------------------------------- |
| `form.ts` (820 lines) | HTML form POST              | `formSave()`                                |
| `form_csv.ts`         | CSV file upload, batch rows | `csvCreate()`, `csvUpdate()`, `csvUpsert()` |
| `form_api.ts`         | JSON API batch operations   | `jsonCreate()`, `jsonUpsert()`              |

All three share the same interface contract: `fieldsDef` (field rules), `create(ctx, tx, data)`, `update(ctx, tx, id, data)`. The `fieldsDef` is the single source of truth that propagates to all three ingestion channels simultaneously. Adding or changing a field touches one place and propagates everywhere. Both `form_csv.ts` and `form_api.ts` use all-or-nothing transactions — if any row fails validation, the entire batch is rolled back.

`form_test.ts` (820+ lines) covers this triple thoroughly: `formSave`, `jsonCreate`, `jsonUpdate`, `jsonUpsert`, `csvCreate`, `csvUpdate`, `csvUpsert`, `csvImportExample`. However it uses **Node.js's built-in test runner** (`import { describe, it } from "node:test"`), not Vitest. It lives under `app/backend.server/handlers/form/`, not under `tests/`. The Vitest configs only include `tests/**`. These tests are almost certainly not running in `yarn test:run2` — the best-covered abstraction in the codebase may be excluded from CI. The aggregator chain is: `backend.server/all_test.ts` → `handlers/all_test.ts` → `form_test.ts`, all using Node runner.

---

### Three-way fragmentation: query logic lives in three different places

What should be a clear two-layer pattern (handler → model) is actually a three-way split:

| Location                               | Examples                                                     | Status                                                      |
| -------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| Inside handlers                        | `disaster_record.ts`, `disasterevent.ts`, `hazardevent.ts`   | Old — but still the authoritative runtime version           |
| `app/backend.server/utils/`            | `dateFilters.ts`, `geographicFilters.ts`, `hazardFilters.ts` | Partial refactor — created but not adopted by main handlers |
| `app/backend.server/models/analytics/` | All analytics models                                         | Target pattern — clean handler-to-model delegation          |

The `backend.server/utils/` directory shows that someone started the right refactoring — extracting query-building utilities — but the handlers were never updated to use them. Both versions coexist, doing similar things differently. A developer reading the codebase has no signal which is authoritative.

---

### Handler-model separation: clean in analytics, violated in core domain

**Analytics handlers** (correct pattern): handler sanitizes inputs via `sanitizeInput()` from `~/utils/security`, calls a model function, model performs the Drizzle query. Clean separation.

**Core domain handlers** (`disaster_record.ts`, `disasterevent.ts`, `hazardevent.ts`, `asset.ts`): raw Drizzle queries built directly inside the handler. These files are 240–335 lines each, mixing request coordination with data access. They bypass the model layer entirely.

`disasterevent.ts` additionally uses a **correlated subquery** for `recordCount`:

```ts
recordCount: sql<number>`(
    SELECT COUNT(*) FROM ${disasterRecordsTable}
    WHERE ${disasterRecordsTable.disasterEventId} = ${disasterEventTable.id}
)`.as("recordCount"),
```

One sub-select per row returned in the list. At 1,000 events, this executes 1,001 queries' worth of work in one SQL call.

---

### The date CASE/regex — now confirmed duplicated in three handlers

The 32-line SQL CASE expression handling six date format variants (text stored as `YYYY`, `YYYY-M`, `YYYY-MM`, `YYYY-M-D`, `YYYY-M-DD`, `YYYY-MM-DD`) is duplicated **verbatim** in:

- `handlers/disaster_record.ts` (lines 99–157)
- `handlers/events/disasterevent.ts`
- `handlers/events/hazardevent.ts` (lines 115–130)

`app/backend.server/utils/dateFilters.ts` was created to consolidate this. However, `createDateCondition()` in that file only compares the **year** portion (`SUBSTRING(column FROM 1 FOR 4)::integer`). It is less accurate than the handlers' CASE/regex, which compares full year-month-day precision. The handlers were correct not to adopt it — but now the utility just sits unused, while three handler copies remain. P3-1 (migrating text dates to a proper `date` column) is the permanent fix that deletes all three copies.

---

### `backend.server/utils/geographicFilters.ts` — full table scan to traverse a tree

`getDescendantDivisionIds()` fetches **all rows** from `divisionTable`, builds a JavaScript `Map`, then traverses the tree in-memory to find descendants of one node:

```ts
const allDivisions = await dr.select({ id, parentId }).from(divisionTable); // all rows
// builds JS childrenMap, traverses in memory
```

Countries with hundreds of administrative divisions transfer all of them on every geographic filter call. The correct approach — using a PostgreSQL recursive CTE or stored procedure — is already demonstrated elsewhere in the codebase (`dts_get_sector_descendants` in `disaster_record.ts`, `dts_get_sector_children_idonly` in `asset.ts`).

Additionally, `divisionCache` is a **module-level `Map` singleton**:

```ts
const divisionCache = new Map<string, GeographicFilter>();
```

This cache lives for the lifetime of the Node.js process with no TTL and no invalidation. If an admin updates a division's geometry, the cache never refreshes until server restart.

---

### Dev/prod behavioral split in `applyGeographicFilters`

`applyGeographicFilters()` contains a development-only branch:

```ts
if (process.env.NODE_ENV === "development" && rawSpatialData) {
    const preferred = matchedFormats.find(f => [...].includes(f));
    if (preferred) {
        return baseConditions; // ← spatial filter is NOT applied in dev
    }
}
```

In development mode, if a "preferred format" is detected in the raw spatial data, the entire geographic filter condition is skipped. Production applies the full 100-line spatial SQL. Geographic filtering behavior is different in dev vs production — spatial filtering cannot be properly tested in the development environment. This is a structural testing blind spot.

---

### `hazardFilters.ts` — 12-parameter function, mutates query builder

```ts
export async function applyHazardFilters(
	filters,
	dr,
	baseConditions,
	eq,
	hipTypeTable,
	hipClusterTable,
	hipHazardTable,
	hazardousEventTable,
	disasterEventTable,
	disasterRecordsTable,
	query,
): Promise<any>; // 12 params, all typed as `any`
```

The function mutates the `query` object passed in (calls `.innerJoin()` on it as a side effect). Hierarchical validation makes extra DB calls just to log warnings — these do not affect query results but fire on every call. Poor API design that accumulated without a structured options object.

---

### Notification service — three issues

`app/backend.server/services/emailValidationWorkflowService.ts`:

**1. N+1 loop in `emailAssignedValidators`:**

```ts
for (const userId of validatorUserIds) {
    const validatorUser = await UserRepository.getById(userId); // DB call per validator
    await sendEmail(validatorUser.email, ...);
}
```

5 assigned validators = 6 sequential DB calls (1 submitter + 5 validators). Fixable with a single batch fetch `UserRepository.getByIds(validatorUserIds)`.

**2. Hardcoded `/en/` URL — language-unaware notifications:**

```ts
recordUrl += `/en/hazardous-event/${entityId}`;
```

Email links are always generated with `/en/` regardless of the recipient's configured language or `BackendContext.lang`. A French-speaking user receives an email with an English URL.

**3. Debug log in production-path code:**

```ts
console.log("record", record); // line 173 — fires on every status change
```

Logs the full event record object to stdout on every validation workflow status change.

---

### `human_effects.ts` — silent error swallow in `deleteAllData`

```ts
export async function deleteAllData(ctx, recordId) {
	for (let def of getHumanEffectTableDefs(ctx)) {
		let r = await clear(def.id, recordId); // returns Response
		if (!r.ok) {
			return r;
		} // checks HTTP status, not JSON body
	}
}
```

`clear()` returns `Response.json({ ok: false, error: e })` with **no explicit status** — defaults to HTTP 200. `Response.ok` is `true` for any 2xx status. So `deleteAllData`'s error check is always `false` — it will never detect that a `clear()` call failed. Individual table clear failures are silently swallowed and iteration continues.

---

### `asset.ts` — domain logic and N+1 in wrong layer

`isAssetInSectorByAssetId()` is pure domain logic (does an asset belong to a sector?) sitting in a handler file. It loops over each sector ID of an asset making a DB call per sector to get its children:

```ts
for (const itemSectorId of sectorIdsArray) {
    const children = await dr.select(...).from(sectorTable)
        .where(eq(sectorTable.id, itemSectorId)); // DB call per sector ID
}
```

N+1 pattern. Should use the existing stored procedure `dts_get_sector_children_idonly` in a single call, and belong in `models/asset.ts`.

---

### `view.ts` — good factories, underused; duplicate helpers

`createPaginatedLoader()` and `createApiListLoader()` are the right abstractions for pagination. But the three main domain handlers (`disaster_record.ts`, `disasterevent.ts`, `hazardevent.ts`) implement pagination manually rather than using these factories.

`getItem1` and `getItem2` in `view.ts` are byte-for-byte identical implementations. One is dead code; naming gives no hint which is correct.

---

### `apiContext.ts` — small, clean, correct

`app/backend.server/apiContext.ts` is a well-scoped context helper for API routes: extracts API key auth, country account ID, and configured currencies in one call. Reduces repetition across API endpoints. A good pattern worth extending to session-based routes.

---

### `translationDBUpdates/update.ts` — confirmed race + N+1 updates + hardcoded entity list

Three issues:

1. **TOCTTOU race** (already tracked as P2-6): `shouldImportTranslations()` and `importTranslationsIfNeeded()` are not atomic. Two nodes starting simultaneously both pass the check and import concurrently.
2. **N+1 UPDATE loop**: one `UPDATE` per `type:id` combination. For 200 translation entries, up to 200 sequential UPDATE queries at startup.
3. **Hardcoded `typeToTable` map**: 9 entity types hardcoded at lines 139–176. Adding a new translatable entity requires a code change here; nothing enforces registration.

---

### What works well

- The Form-CSV-API triple is the most elegant abstraction in the codebase — `fieldsDef` as single source of truth driving three ingestion channels is architecturally sound and consistently applied
- `formSave` is exemplary: validate → role check → transaction → audit log → redirect — all composable, transaction-wrapped, audit-logged
- Analytics handlers cleanly separate handler concerns from model concerns — the right reference pattern for the rest of the codebase
- `geography_upload.ts` error handling with `UserError` vs `Error` class hierarchy is a clean, explicit pattern for user-facing vs internal errors
- `createPaginatedLoader` / `createApiListLoader` factories in `view.ts` are the right abstractions — just need broader adoption
- The notification service has tests (`emailValidationWorkflowService.test.ts`) — rare for a service file
- `apiContext.ts` is a well-scoped, reusable API context helper that demonstrates good extraction patterns

---

