# Phase 3 — Schema Migrations & DB Integrity

> Database schema migrations. Every item in this phase requires the `[a] additive → [b] cutover → [c] drop` three-PR pattern. Do not batch these.
>
> **15 items** — check status in [`../INDEX.md`](../INDEX.md)

---

### P3-1 · Date Column Migration — Text → Proper Date + Resolution

| | |
|---|---|
| **Issue** | ISSUE-007 |
| **File** | `app/drizzle/schema/disasterRecordsTable.ts:43–44` — `startDate: text`, `endDate: text` |
| **Impact** | Every date-range filter performs a full table scan via 32-line CASE/regex |

**Strangler Fig sequence:**

**Step A:**
```sql
ALTER TABLE disaster_records
  ADD COLUMN start_date_v2 date,
  ADD COLUMN start_date_resolution varchar(5),  -- 'year' | 'month' | 'day'
  ADD COLUMN end_date_v2 date,
  ADD COLUMN end_date_resolution varchar(5);
```

**Step B — Backfill via migration script:**
```typescript
// Parse existing text values: '2023' → date(2023-01-01) + resolution 'year'
//                              '2023-07' → date(2023-07-01) + resolution 'month'
//                              '2023-07-15' → date(2023-07-15) + resolution 'day'
```

**Step C:** Create B-tree index on `start_date_v2`, `end_date_v2`. Verify `EXPLAIN ANALYZE` switches from `Seq Scan` to `Index Scan`.

**Step D:** Update all query builders to use `start_date_v2`. Remove the 32-line CASE/regex from `app/backend.server/handlers/disaster_record.ts:99–134`.

**Step E (after validation):** Drop `start_date` and `end_date` text columns.

**OpenAPI spec:** Update `_docs/api-specs/disaster-records.yaml` to reflect `startDate: {type: string, format: date}` and new `startDateResolution: {type: string, enum: [year, month, day]}` field.

---

---

### P3-2 · PostgreSQL Row-Level Security — Tenant Isolation at DB Layer

| | |
|---|---|
| **Issue** | ISSUE-003 |
| **Current** | Tenant isolation enforced only via application WHERE clauses across 59+ files |

**This is the most consequential change in the plan.** Execute in two sub-phases.

**Sub-phase 3-2a — PERMISSIVE mode (logging, non-blocking):**
```sql
-- Enable RLS on all domain tables
ALTER TABLE disaster_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE disaster_event ENABLE ROW LEVEL SECURITY;
-- ... (all domain tables)

-- PERMISSIVE policy — does not block, but allows auditing
CREATE POLICY tenant_isolation ON disaster_records
  AS PERMISSIVE FOR ALL
  USING (country_accounts_id = current_setting('app.current_tenant', true)::uuid);
```

Add `SET LOCAL app.current_tenant = $countryAccountsId` at the start of every DB transaction in `db.server.ts`.

**TDD step:** Write test asserting that a direct DB query without `app.current_tenant` set returns zero rows from `disaster_records` (once RESTRICTIVE mode is active).

**Sub-phase 3-2b — RESTRICTIVE mode (enforce):**
After running PERMISSIVE for one full sprint with zero unexpected query results, switch to `AS RESTRICTIVE`.

---

---

### P3-3 · Geography Import — Async Background Job

| | |
|---|---|
| **Issue** | ISSUE-013 |
| **File** | `app/backend.server/handlers/geography_upload.ts:11–56` — synchronous 50MB ZIP parse in HTTP handler |

**OpenAPI spec required:** Yes — new job status endpoint.

Spec location: `_docs/api-specs/geography-import-v2.yaml`

```yaml
# _docs/api-specs/geography-import-v2.yaml (excerpt)
paths:
  /{lang}/api/geography/upload:
    post:
      summary: Enqueue geography ZIP import
      responses:
        '202':
          content:
            application/json:
              schema:
                type: object
                properties:
                  jobId: { type: string, format: uuid }
  /{lang}/api/geography/upload/{jobId}/status:
    get:
      summary: Poll import job status
      responses:
        '200':
          content:
            application/json:
              schema:
                properties:
                  status: { type: string, enum: [pending, processing, complete, failed] }
                  progress: { type: integer }
                  errors: { type: array, items: { type: string } }
```

**Implementation:** Use `pg-boss` (PostgreSQL-native job queue — no new infrastructure dependency):
```typescript
// Upload handler returns immediately
const jobId = await boss.send("geography-import", { fileBuffer, countryAccountsId });
return json({ jobId }, { status: 202 });

// Background worker
boss.work("geography-import", async (job) => {
  await importZip(job.data.fileBuffer, job.data.countryAccountsId);
});
```

---

---

### P3B-1 · Add DB-Level CASCADE on Human Effects FK Chain

| | |
|---|---|
| **Issue** | UUID-CASCADE-002 |
| **Files** | `app/drizzle/schema/humanDsgTable.ts` + 5 leaf effect tables |
| **Current** | No `onDelete: "cascade"` on human effects FK chain — orphan risk on any failed delete sequence |

**Strangler Fig sequence:**

**Step A — Audit current FK definitions:** Grep all schema files for `references` without cascade.

**Step B — Migration:**
```sql
ALTER TABLE human_dsg
  DROP CONSTRAINT human_dsg_disaster_record_id_fkey,
  ADD CONSTRAINT human_dsg_disaster_record_id_fkey
    FOREIGN KEY (disaster_record_id) REFERENCES disaster_records(id)
    ON DELETE CASCADE;
-- Repeat for all 5 leaf tables
```

**TDD:** Write integration-realdb test asserting that deleting a `disaster_record` removes all child `human_dsg` and leaf effect rows with no orphans remaining.

---

---

### P3B-2 · Add `country_accounts_id` Stamp to Leaf Tables

| | |
|---|---|
| **Issue** | UUID-CASCADE-003 |
| **Files** | `losses`, `damages`, `disruption`, `human_dsg` tables |
| **Current** | No `country_accounts_id` column — tenant context requires joining up through `disaster_record` |

This is a prerequisite for PostgreSQL RLS (P3-2) to work on leaf tables without complex join-based policies.

**Migration:** Add nullable `country_accounts_id uuid` to each leaf table. Backfill via join to `disaster_records`. Then enforce NOT NULL. Add to RLS policy scope in P3-2.

---

---

### P3B-3 · Migrate Primary Keys from UUID v4 to UUIDv7

| | |
|---|---|
| **Issue** | UUID-CASCADE-004 |
| **File** | `app/db/drizzleUtil.ts` — `ourRandomUUID()` uses `crypto.randomUUID()` (v4) |
| **Current** | UUID v4 is random — causes B-tree index fragmentation at bulk-import scale |

**UUIDv7** is time-ordered, eliminating index fragmentation and making records naturally sortable by creation time without a separate `created_at` sort column.

```typescript
// app/db/drizzleUtil.ts — target
import { uuidv7 } from "uuidv7"; // npm package
export function ourRandomUUID(): string {
  return uuidv7();
}
```

**Note:** This is a pure application-layer change — no schema migration needed. New records get UUIDv7; existing UUID v4 records are unaffected (UUIDs are opaque strings to PostgreSQL).

---

---

### P3B-4 · Fix Cross-Tenant GeoJSON Endpoint

| | |
|---|---|
| **Issue** | UUID-CASCADE (security) |
| **File** | Route handling `spatial-footprint-geojson` — no tenant ownership check |

**TDD:** Write test asserting that requesting GeoJSON for a `disasterEventId` owned by tenant B, while authenticated as tenant A, returns 403 — not the geometry data.

**Fix:** Add `AND country_accounts_id = $countryAccountsId` to the GeoJSON query.

---

---

### P3C-1 · Fix CASCADE Chain Across the Full Event Hierarchy

| | |
|---|---|
| **Issue** | Data integrity — orphaned rows on delete |
| **Files** | `disasterRecordsTable.ts`, `damagesTable.ts`, `lossesTable.ts`, `disruptionTable.ts`, `humanDsgTable.ts`, `sectorDisasterRecordsRelationTable.ts`, `hazardousEventTable.ts` |
| **Current** | `onDelete: "cascade"` is applied inconsistently. `disaster_event` cascades from `country_accounts` but `hazardous_event` does not. `disaster_records` has no cascade from `disaster_event`. All child tables (`damages`, `losses`, `disruption`, `human_dsg`, `deaths`, `injured`, `missing`, `affected`, `displaced`, `sector_disaster_records_relation`) have no cascade from `disaster_records` or `human_dsg`. |

**Full cascade chain needed:**

```sql
-- disaster_records ← disaster_event (currently missing)
ALTER TABLE disaster_records
  DROP CONSTRAINT disaster_records_disaster_event_id_fkey,
  ADD CONSTRAINT disaster_records_disaster_event_id_fkey
    FOREIGN KEY (disaster_event_id) REFERENCES disaster_event(id) ON DELETE CASCADE;

-- hazardous_event ← country_accounts (currently missing, inconsistent with disaster_event)
ALTER TABLE hazardous_event
  DROP CONSTRAINT hazardous_event_country_accounts_id_fkey,
  ADD CONSTRAINT hazardous_event_country_accounts_id_fkey
    FOREIGN KEY (country_accounts_id) REFERENCES country_accounts(id) ON DELETE CASCADE;

-- damages, losses, disruption, sector_disaster_records_relation ← disaster_records
ALTER TABLE damages DROP CONSTRAINT ..., ADD CONSTRAINT ... FOREIGN KEY (record_id) REFERENCES disaster_records(id) ON DELETE CASCADE;
-- (repeat for losses, disruption, sector_disaster_records_relation)

-- human_dsg ← disaster_records (extends P3B-1)
-- deaths, injured, missing, affected, displaced ← human_dsg (extends P3B-1)
```

**Strangler Fig:** Apply in order — parent before child. Each `ALTER TABLE` is its own migration.

**TDD steps:**
1. `test(red):` Write integration test: delete a `disaster_event`. Assert all child `disaster_records`, `damages`, `losses`, `disruption`, `human_dsg`, and leaf effect rows are gone. Currently the delete is either blocked or leaves orphans.
2. `migration:` Apply cascade chain top-down.

**Measure:** Deleting a `country_accounts` row removes all descendent rows with no FK violation. `EXPLAIN` shows no orphan rows after delete.

---

---

### P3C-2 · Add `country_accounts_id` to `damages`, `losses`, `disruption`

| | |
|---|---|
| **Issue** | Tenant isolation + prerequisite for P3-2 RLS |
| **Files** | `damagesTable.ts`, `lossesTable.ts`, `disruptionTable.ts` |
| **Current** | These three tables have no `country_accounts_id` column. Tenant isolation is inherited solely through the `disaster_records` join. A direct query on `damages` without joining `disaster_records` has no tenant filter. RLS policy `USING (country_accounts_id = ...)` cannot be applied to these tables without a correlated subquery on every row read. |

**Strangler Fig sequence:**

**Step A — Additive migration:**
```sql
ALTER TABLE damages    ADD COLUMN country_accounts_id uuid REFERENCES country_accounts(id) ON DELETE CASCADE;
ALTER TABLE losses     ADD COLUMN country_accounts_id uuid REFERENCES country_accounts(id) ON DELETE CASCADE;
ALTER TABLE disruption ADD COLUMN country_accounts_id uuid REFERENCES country_accounts(id) ON DELETE CASCADE;
```

**Step B — Backfill via join:**
```sql
UPDATE damages d
SET country_accounts_id = dr.country_accounts_id
FROM disaster_records dr
WHERE d.record_id = dr.id;
-- (repeat for losses, disruption)
```

**Step C — Enforce NOT NULL:**
```sql
ALTER TABLE damages ALTER COLUMN country_accounts_id SET NOT NULL;
-- (repeat for losses, disruption)
```

**Step D — Apply to RLS policy in P3-2.**

**TDD steps:**
1. `test(red):` Assert querying `damages` by `country_accounts_id` without joining `disaster_records` returns only rows for the correct tenant. Currently impossible — column does not exist.
2. `migration:` Apply Steps A–C.

**Measure:** All three tables have non-null `country_accounts_id`. P3-2 RLS policy can be applied directly. Zero rows with `country_accounts_id` differing from their parent `disaster_records.country_accounts_id`.

---

---

### P3C-3 · Replace `asset.sector_ids` Text with Proper Join Table

| | |
|---|---|
| **Issue** | Data integrity / N+1 performance |
| **File** | `assetTable.ts` — `sectorIds: text("sector_ids").notNull()` |
| **Current** | Sector relationships for an asset are stored as a raw text string. No FK to `sector`. No join possible without string parsing. Root cause of the N+1 loop in `app/backend.server/handlers/asset.ts`. |

**Strangler Fig sequence:**

**Step A — Add join table:**
```sql
CREATE TABLE asset_sector (
  asset_id uuid NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
  sector_id uuid NOT NULL REFERENCES sector(id) ON DELETE CASCADE,
  PRIMARY KEY (asset_id, sector_id)
);
```

**Step B — Backfill from existing `sector_ids` text:**
```typescript
// Migration script: parse existing sector_ids strings, insert into asset_sector
const assets = await dr.select({ id: assetTable.id, sectorIds: assetTable.sectorIds }).from(assetTable);
for (const asset of assets) {
    const ids = asset.sectorIds.split(",").map(s => s.trim()).filter(Boolean);
    for (const sectorId of ids) {
        await dr.insert(assetSectorTable).values({ assetId: asset.id, sectorId }).onConflictDoNothing();
    }
}
```

**Step C — Cut over application code** to query `asset_sector` join table instead of parsing `sector_ids`.

**Step D — Drop `sector_ids` column** after validation.

**TDD steps:**
1. `test(red):` Assert `isAssetInSectorByAssetId` makes exactly 1 DB query regardless of sector count. Currently makes N queries.
2. `migration:` Apply Steps A–B.
3. `fix:` Rewrite `isAssetInSectorByAssetId` to use a single join query against `asset_sector`.

**Measure:** `isAssetInSectorByAssetId` query count = 1. `asset` table has no `sector_ids` column. `EXPLAIN` on asset-sector queries shows index scan on `asset_sector`.

---

---

### P3C-4 · Add Primary Key to `human_dsg_config`

| | |
|---|---|
| **Issue** | Data integrity — table has no PK |
| **File** | `humanDsgConfigTable.ts` |
| **Current** | `human_dsg_config` has no `id` column and no `PRIMARY KEY`. Rows cannot be uniquely addressed. Nothing prevents two config rows per tenant at the DB level. |

**Migration:**
```sql
-- Step A: add id column with default
ALTER TABLE human_dsg_config ADD COLUMN id uuid DEFAULT gen_random_uuid();
UPDATE human_dsg_config SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE human_dsg_config ALTER COLUMN id SET NOT NULL;
ALTER TABLE human_dsg_config ADD PRIMARY KEY (id);

-- Step B: enforce one config per tenant
ALTER TABLE human_dsg_config ADD CONSTRAINT human_dsg_config_country_accounts_id_unique UNIQUE (country_accounts_id);
```

**TDD steps:**
1. `test(red):` Assert inserting two `human_dsg_config` rows for the same `country_accounts_id` throws a unique constraint violation. Currently both inserts succeed.
2. `migration:` Apply Steps A–B.

**Measure:** `human_dsg_config` has a UUID PK. Unique constraint on `country_accounts_id`. Drizzle schema updated to reflect both.

---

---

### P3C-5 · Fix `entity_validation_assignment` and `entity_validation_rejection` Integrity

| | |
|---|---|
| **Issue** | Data integrity — polymorphic FK with no enforcement |
| **Files** | `entityValidationAssignmentTable.ts`, `entityValidationRejectionTable.ts` |
| **Current** | `entityId uuid` has no FK — the DB cannot verify the entity exists. `entityType text` has no CHECK constraint — any string is valid. Delete an entity and its assignment/rejection rows are orphaned with no DB cleanup. |

**Fix:**

```sql
-- Add CHECK constraint on entityType
ALTER TABLE entity_validation_assignment
  ADD CONSTRAINT valid_entity_type
  CHECK (entity_type IN ('hazardous_event', 'disaster_event', 'disaster_record'));

ALTER TABLE entity_validation_rejection
  ADD CONSTRAINT valid_entity_type
  CHECK (entity_type IN ('hazardous_event', 'disaster_event', 'disaster_record'));
```

For orphan cleanup on entity delete: since polymorphic FKs are not possible in PostgreSQL, add a DB trigger (or rely on application-layer delete logic) to clean up assignment/rejection rows when the referenced entity is deleted. Document this as a required step in the entity delete service methods.

**TDD steps:**
1. `test(red):` Assert inserting an `entity_validation_assignment` with `entity_type = 'invalid_type'` throws a constraint violation. Currently it succeeds.
2. `migration:` Add CHECK constraints.
3. `fix:` Add orphan cleanup call to `hazardousEvent.deleteById`, `disasterEvent.deleteById`, and `disasterRecord.deleteById`.

**Measure:** Invalid `entityType` values are rejected at DB level. No orphaned assignment/rejection rows after entity deletion.

---

---

### P3C-6 · Add DB-Level Constraints for `approvalWorkflowFields` User References

| | |
|---|---|
| **Issue** | Data integrity — dangling user UUID references |
| **File** | `app/utils/drizzleUtil.ts` — `approvalWorkflowFields` |
| **Current** | `createdByUserId`, `updatedByUserId`, `submittedByUserId`, `validatedByUserId`, `publishedByUserId` are UUID columns with no FK constraint to `user`. Drizzle `relations()` defines query helpers but imposes no DB-level constraint. Delete a user and these columns silently hold dangling UUIDs — the audit trail of who acted on a record becomes unverifiable. |

**Migration:**
```sql
-- Apply to hazardous_event (primary consumer of approvalWorkflowFields)
ALTER TABLE hazardous_event
  ADD CONSTRAINT fk_he_created_by FOREIGN KEY (created_by_user_id) REFERENCES "user"(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_he_submitted_by FOREIGN KEY (submitted_by_user_id) REFERENCES "user"(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_he_validated_by FOREIGN KEY (validated_by_user_id) REFERENCES "user"(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_he_published_by FOREIGN KEY (published_by_user_id) REFERENCES "user"(id) ON DELETE SET NULL;
```

Use `ON DELETE SET NULL` (not CASCADE) — deleting a user should not delete disaster records. Preserving the record with a null actor is the correct audit behavior.

**TDD steps:**
1. `test(red):` Assert that after deleting a user who submitted a `hazardous_event`, the event still exists with `submitted_by_user_id = NULL`. Currently the column retains the deleted user's UUID with no FK error.
2. `migration:` Add FK constraints with `ON DELETE SET NULL`.

**Measure:** All `approvalWorkflowFields` columns have DB FK constraints. Deleting a user nulls their references on event records rather than leaving dangling UUIDs.

---

---

### P3C-7 · Add Unique Constraint to `event_relationship`

| | |
|---|---|
| **Issue** | Data integrity — duplicate causality links possible |
| **File** | `eventRelationshipTable.ts` |
| **Current** | No unique constraint on `(parent_id, child_id)`. Duplicate parent-child event relationships can be inserted. The `event_relationship` graph may contain redundant edges that inflate causality chain traversals. |

**Migration:**
```sql
ALTER TABLE event_relationship
  ADD CONSTRAINT event_relationship_unique_pair UNIQUE (parent_id, child_id);
```

**TDD steps:**
1. `test(red):` Insert the same `(parent_id, child_id)` pair twice. Assert the second insert throws. Currently both succeed.
2. `migration:` Add constraint (with deduplication of existing duplicates if any).

**Measure:** Duplicate `(parent_id, child_id)` pairs rejected at DB level.

---

---

### P3D-1 · Namespace-Based Translation Splitting — Replace Full-Dictionary Inline Injection

| | |
|---|---|
| **Issue** | Performance — full translation dictionary serialized into every HTML page |
| **Files** | `app/root.tsx:108`, `app/root.tsx:310`, `app/backend.server/translations.ts`, `app/frontend/translations.ts` |
| **Current** | Every page load: `loadTranslations(lang)` fetches all ~1,700 translation entries, `createTranslationScript` serializes them into an inline `<script>` tag (~133KB uncompressed, ~35KB gzipped). Inline scripts cannot be separately cached by the browser — every full-page navigation re-downloads the entire dictionary even if nothing has changed. Translations are also serialized twice: once in the React Router hydration payload and once in the explicit `<script>` tag. As the app grows the payload grows linearly with no ceiling. |

**Target state:**
- Split `locales/app/en.json` into route-level namespace files (e.g. `common.json`, `analytics.json`, `disaster-record.json`, `admin.json`, `settings.json`)
- Serve namespace files as separate static assets with content-hash URLs and long `Cache-Control: immutable` headers
- Root layout loads only `common.json`; each route loads its own namespace via the loader
- Browser caches namespace files indefinitely — subsequent navigations cost zero bytes for unchanged namespaces
- Migrate to `react-i18next` (React Router v7 compatible, handles namespace lazy-loading, `Intl.PluralRules`, RTL, TypeScript key safety)

**Why Phase 3:** Requires restructuring all `.t()` call sites into namespaces, updating the extractor, and migrating runtime delivery. Independent of the schema and auth fixes in Phases 0–2 but significant enough to warrant its own phase.

**TDD steps:**
1. `test(red):` Write a test asserting the root HTML response size is under a defined limit (forces the investigation).
2. `fix:` Introduce namespace splitting incrementally — start with `common` + one domain namespace.
3. `refactor:` Migrate remaining namespaces. Remove `loadTranslations`/`createTranslationScript` once all namespaces are migrated.

**Measure:** Root HTML payload is reduced by at least 50%. Browser DevTools show namespace JSON files served with `Cache-Control: max-age=31536000, immutable`.

---

---

