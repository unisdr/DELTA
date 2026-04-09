## Layer 6 — Database Schema & Migrations

### Schema inventory — 38 tables across 7 conceptual groups

| Group                          | Tables                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Event hierarchy**            | `event`, `hazardous_event`, `disaster_event`, `disaster_records`, `event_relationship`                                                     |
| **Effects (human)**            | `human_dsg`, `human_dsg_config`, `human_category_presence`, `deaths`, `injured`, `missing`, `affected`, `displaced`                        |
| **Effects (economic)**         | `damages`, `losses`, `disruption`, `noneco_losses`, `categories`                                                                           |
| **Geography & classification** | `division`, `sector`, `sector_disaster_records_relation`, `asset`                                                                          |
| **HIP taxonomy**               | `hip_type`, `hip_cluster`, `hip_hazard`                                                                                                    |
| **Tenancy & identity**         | `country_accounts`, `countries`, `user`, `user_country_accounts`, `organization`, `api_key`, `session`, `super_admin_users`                |
| **System**                     | `audit_logs`, `instance_system_settings`, `entity_validation_assignment`, `entity_validation_rejection`, `dts_system_info`, `dev_example1` |

**ER diagram cross-check:** A PDF ER diagram was available. It is roughly 6–12 months stale — predates the approval/validation workflow feature. Key divergences: `hip_class` was renamed to `hip_type`, `entity_validation_assignment` and `entity_validation_rejection` are entirely absent, `organization` table absent, `user` table has different columns (old email-verification flow vs current invite flow). The core relational structure of the data model (event hierarchy, effects, geography) is still accurately represented. PDF is useful as a visual reference for the stable parts of the schema only.

---

### Shared column factories in `drizzleUtil.ts`

The schema uses factory functions to enforce consistency across tables:

| Factory                               | Purpose                                                         | Used on                                                 |
| ------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| `ourRandomUUID()`                     | `uuid PK DEFAULT gen_random_uuid()`                             | All tables with UUID PK                                 |
| `zeroText(name)`                      | `text NOT NULL DEFAULT ''`                                      | Avoids nullable strings                                 |
| `zeroBool(name)`                      | `boolean NOT NULL DEFAULT false`                                | Safe boolean defaults                                   |
| `zeroStrMap(name)`                    | `jsonb NOT NULL DEFAULT {}` typed as `Record<string,string>`    | Multi-language name/description fields                  |
| `approvalFields`                      | `approval_status text NOT NULL DEFAULT 'draft'`                 | `hazardous_event`, `disaster_event`, `disaster_records` |
| `approvalWorkflowFields`              | `created/submitted/validated/published_by_user_id + timestamps` | `hazardous_event`                                       |
| `createdUpdatedTimestamps`            | `created_at`, `updated_at`                                      | Most tables                                             |
| `hipRelationColumnsRequired/Optional` | `hip_hazard_id`, `hip_cluster_id`, `hip_type_id` text FKs       | All event tables                                        |
| `apiImportIdField()`                  | `api_import_id text`                                            | All externally importable tables                        |

Notable: `approvalStatus` uses a `text` column with an application-level enum (`draft → waiting-for-validation → needs-revision → validated → published`). A comment in `drizzleUtil.ts` explains this was deliberate — Drizzle's PostgreSQL enum support is broken (issue #3485). The tradeoff: no DB-enforced enum values.

---

### Event hierarchy — table-per-type inheritance

The event model uses Table-Per-Type (TPT) inheritance:

```
event (id, name, description)
  ├── hazardous_event (id FK→event.id, ...)   — the hazard
  └── disaster_event  (id FK→event.id, ...)   — the disaster
        └── disaster_records (disaster_event_id FK→disaster_event.id, ...)  — per-record impact assessment
```

`event` is the supertype — it carries the shared `name` and `description` and is the node in the `event_relationship` graph. `hazardous_event` and `disaster_event` extend it by sharing the same `id`. `event_relationship(parent_id, child_id)` allows arbitrary parent-child chains between events, enabling hazard→disaster causality.

**Missing constraint:** `event_relationship` has no unique constraint on `(parent_id, child_id)`. Duplicate parent-child pairs can be inserted. A `UNIQUE(parent_id, child_id)` is needed.

**`disaster_event.disaster_event_id`** — self-referential FK enabling nested disaster events (a disaster within a disaster). No cascade defined. No unique constraint or depth limit. Could create accidental cycles with no DB-level protection.

---

### CASCADE chain is broken — orphan risk throughout the data model

The `onDelete: "cascade"` policy is applied inconsistently, creating gaps at every level of the hierarchy:

```
country_accounts
  ├── disaster_event          ✅ cascade
  │     └── disaster_records  ❌ NO CASCADE  ← orphaned on event delete
  │           ├── damages      ❌ NO CASCADE
  │           ├── losses       ❌ NO CASCADE
  │           ├── disruption   ❌ NO CASCADE
  │           ├── sector_disaster_records_relation  ❌ NO CASCADE
  │           └── human_dsg   ❌ NO CASCADE
  │                 ├── deaths     ❌ NO CASCADE
  │                 ├── injured    ❌ NO CASCADE
  │                 ├── missing    ❌ NO CASCADE
  │                 ├── affected   ❌ NO CASCADE
  │                 └── displaced  ❌ NO CASCADE
  │
  └── hazardous_event         ❌ NO CASCADE  ← inconsistent with disaster_event above
```

The inconsistency between `hazardous_event` (no cascade) and `disaster_event` (has cascade) is unexplained by any comment. The consequence: deleting a `country_account` will cascade to `disaster_event` but leave `hazardous_event` rows orphaned (or the delete is blocked by the FK). P3B-1 tracks the `human_dsg` chain — but the gap is broader: `disaster_records` itself, plus `damages`, `losses`, `disruption`, `sector_disaster_records_relation`.

---

### `damages`, `losses`, `disruption` — no tenant anchor column

These three tables have no `country_accounts_id` column. Tenant isolation is entirely inherited through `disaster_records`. This creates two problems:

1. **Direct queries bypass tenant boundary.** Any query on `damages` alone (without joining `disaster_records`) has no tenant filter available.
2. **Blocks P3-2 RLS.** PostgreSQL Row-Level Security requires `country_accounts_id` to be present on the table itself for the RLS policy `USING (country_accounts_id = current_setting('app.current_tenant')::uuid)` to work. Without it, an RLS policy on `damages` would need a correlated subquery to `disaster_records` on every row read — expensive and harder to enforce consistently.

P3B-2 tracks adding `country_accounts_id` to leaf tables. The scope must include `damages`, `losses`, and `disruption`, not just the human effects leaf tables.

---

### `asset.sectorIds` — denormalized text, no referential integrity

```ts
sectorIds: text("sector_ids").notNull();
```

Sector relationships for an asset are stored as a plain text string on the `asset` row. No FK to `sector`. No join possible without parsing the string at the application layer. This is the root cause of the N+1 loop in the `asset.ts` handler (one DB call per sector ID). The correct model is a join table — the same pattern already used correctly in `sector_disaster_records_relation`. The fix requires a migration to introduce `asset_sector(asset_id, sector_id)` and a data migration to parse and insert existing `sector_ids` values.

---

### `humanDsgConfigTable` — no primary key

```ts
export const humanDsgConfigTable = pgTable("human_dsg_config", {
    hidden: jsonb("hidden"),
    custom: jsonb("custom"),
    countryAccountsId: uuid("country_accounts_id").references(...)
    // no id, no primaryKey()
});
```

The table has no PK at the DB level. Rows cannot be uniquely addressed. Nothing prevents two config rows for the same tenant. The minimum fix is a `UNIQUE` constraint on `country_accounts_id` (making it the effective key). Better: add a proper `id` UUID PK with a unique constraint on `country_accounts_id`.

---

### `entity_validation_assignment` and `entity_validation_rejection` — polymorphic, no FK integrity

```ts
entityId: uuid("entity_id"),       // no FK — DB cannot verify this entity exists
entityType: text("entity_type"),   // no CHECK constraint on valid values
```

Polymorphic association pattern: one table stores assignments for all entity types, distinguished by `entityType`. The DB cannot enforce that `entityId` points to an existing row in any table. Delete a `hazardous_event` and its validation assignments become orphaned rows with dangling UUIDs. `entityType` also has no `CHECK` constraint — invalid type strings can be inserted.

---

### `approvalWorkflowFields` — workflow actor UUIDs with no DB FK constraint

```ts
export const approvalWorkflowFields = {
	createdByUserId: uuid("created_by_user_id"), // no FK to user table
	updatedByUserId: uuid("updated_by_user_id"), // no FK
	submittedByUserId: uuid("submitted_by_user_id"), // no FK
	validatedByUserId: uuid("validated_by_user_id"), // no FK
	publishedByUserId: uuid("published_by_user_id"), // no FK
};
```

Drizzle `relations()` defines query helpers for these fields, but there are no FK constraints in the database. Delete a user and these columns silently hold dangling UUIDs — the audit trail of who submitted/validated/published a record becomes unverifiable. The `hazardous_event` table is the primary consumer of these fields.

---

### `disasterEventTable` — repeated column groups (wide table antipattern)

`disaster_event` encodes up to 5 entries of each repeating concept as numbered columns:

| Concept                       | Columns                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------ |
| Disaster declarations         | `disaster_declaration_type_and_effect1`…`5` + `disaster_declaration_date1`…`5` |
| Early actions                 | `early_action_description1`…`5` + `early_action_date1`…`5`                     |
| Rapid/preliminary assessments | `rapid_or_preliminary_assessment_description1`…`5` + date1…`5`                 |
| Post-disaster assessments     | `post_disaster_assessment_description1`…`5` + date1…`5`                        |
| Other assessments             | `other_assessment_description1`…`5` + date1…`5`                                |

25+ columns for 5 hardcoded repetitions of 5 concepts. Every row with fewer than 5 entries carries empty nullable column groups. A 6th entry requires a schema migration. The correct model is child tables: `disaster_event_declaration(event_id, type, effect, date)`, `disaster_event_assessment(event_id, category, description, date)`, etc.

---

### `losses` — conditional boolean flag, no CHECK constraint

```ts
sectorIsAgriculture: boolean("sector_is_agriculture").notNull(),
typeNotAgriculture: text("type_not_agriculture"),   // only valid when flag=false
typeAgriculture: text("type_agriculture"),           // only valid when flag=true
relatedToNotAgriculture: text("related_to_not_agriculture"),
relatedToAgriculture: text("related_to_agriculture"),
```

A boolean flag determines which of two mutually exclusive column sets is valid. No `CHECK` constraint enforces the invariant. The DB permits `sectorIsAgriculture = true` with `typeNotAgriculture` also populated. Application logic is the only guard.

---

### `sector` and `categories` — two parallel hierarchy tables

`sector` and `categories` are structurally identical: `id`, `parent_id` (self-referencing), `name` (JSONB string map), `level`, `created_at/updated_at`. `categories` is used exclusively by `noneco_losses`. `sector` is used by everything else. Two separate self-referencing hierarchy tables for the same concept — hierarchical classification — with no documented rationale for the split. Creates two diverging maintenance paths for identical structural logic.

---

### Type export bugs — silent wrong-type usage

**`humanCategoryPresenceTable.ts`:**

```ts
export type SelectHumanCategoryPresence =
	typeof humanDsgConfigTable.$inferSelect; // ← wrong table
export type InsertHumanCategoryPresence =
	typeof humanDsgConfigTable.$inferInsert; // ← wrong table
```

Both exported types alias `humanDsgConfigTable`, not `humanCategoryPresenceTable`. Code consuming these types works with the wrong schema shape silently — TypeScript won't catch it unless the shapes differ obviously.

**`hipHazardTable.ts`:**

```ts
export type SelectDisasterRecords = typeof disasterRecordsTable.$inferSelect; // ← wrong file
export type InsertDisasterRecords = typeof disasterRecordsTable.$inferInsert; // ← wrong file
```

`DisasterRecords` types exported from the wrong file. Noise in autocomplete and potential import confusion.

---

### `instanceSystemSettingsTable` — self-documented dead column with typo

```ts
countryName: varchar("country_name").notNull().default("United State of America"), //this column has to be removed
```

Column with a comment stating it should be removed, and a typo in its default value ("United State" not "United States"). Still present in the schema, all migrations, and every seed script.

---

### PostGIS — partially adopted

`divisionTable` correctly uses native PostGIS geometry columns (`geom geometry(Geometry,4326)`, `bbox geometry(Geometry,4326)`) with GIST indexes and a `CHECK(ST_IsValid(geom))` constraint. This is the only table using native PostGIS types.

All other spatial data (`disaster_records.spatial_footprint`, `hazardous_event.spatial_footprint`, `damages.spatial_footprint`, etc.) is stored as JSONB. This means no native spatial indexing, no `ST_Contains`/`ST_Intersects` on event data, and no direct WMS/WFS feed capability for those tables. Tracked as P5B-5.

---

### What works well

- `drizzleUtil.ts` factories (`zeroText`, `zeroBool`, `zeroStrMap`, `ourRandomUUID`) enforce consistent column defaults across the schema — excellent DRY practice
- `approvalStatus` enum-as-text with a comment explaining the Drizzle bug is honest and workable; the enum values are consistent across all three tables that use it
- Composite unique constraints on `(api_import_id, country_accounts_id)` are present on all importable tables — correct tenant-scoped uniqueness for idempotent imports
- `divisionTable` has proper GIST indexes, a validity check constraint, and tenant-scoped unique indexes on `import_id` and `national_id` — the most carefully designed table in the schema
- `countryAccountsTable` uses `onDelete: "cascade"` consistently from tables that correctly implement it
- HIP taxonomy (`hip_type` → `hip_cluster` → `hip_hazard`) uses text PKs that match the Sendai Framework coded vocabulary — correct domain modeling for a standards-aligned system
- `sector_disaster_records_relation` is a proper many-to-many join table with a composite unique constraint — the right pattern, which `asset.sectorIds` should mirror

---

