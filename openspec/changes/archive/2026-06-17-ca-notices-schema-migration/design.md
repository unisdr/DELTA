## Context

The Notices Pilot is a synthetic domain — no existing data, no FK dependencies from
other tables, no migration risk. The project stores all tenant-scoped domain data in
tables that carry a `countryAccountsId` UUID FK with `onDelete: "cascade"`.

The current `app/drizzle/schema/` contains ~38 table files. Every file follows a
consistent pattern:

- `ourRandomUUID()` from `~/utils/drizzleUtil` for the `id` column (UUID PK with
  `gen_random_uuid()` default).
- `uuid("country_accounts_id").references(() => countryAccountsTable.id, { onDelete: "cascade" })`
  for tenant isolation (`.notNull()` on this column is the norm for tables whose rows
  cannot exist without a tenant).
- `jsonb(...)` for JSONB columns — no type annotation for opaque blobs; `.$type<Record<string, string>>()`
  via `zeroStrMap()` for typed i18n string maps.
- Text enums use `text({ enum: [...] })` — NOT `pgEnum()`. The codebase has a documented
  note in `drizzleUtil.ts` that drizzle-kit has broken postgres enum support
  (drizzle-team/drizzle-orm#3485); text columns with an `enum` option are the convention.
- `createdUpdatedTimestamps` spread from `drizzleUtil.ts` for `createdAt`/`updatedAt`
  (both TIMESTAMPTZ via `timestamp(name)` with `CURRENT_TIMESTAMP` default).
- Inferred TypeScript types: `SelectXxx = typeof xxxTable.$inferSelect` and
  `InsertXxx = typeof xxxTable.$inferInsert`.

The PGlite test suite loads schema from `tests/integration/db/testSchema/` (not from
`app/drizzle/schema/`). Historically every schema file has had a hand-maintained
duplicate in `testSchema/`. The `notices` table is the first to break this pattern:
`testSchema/noticesTable.ts` is a thin re-export (`export * from "~/drizzle/schema/noticesTable"`)
rather than a re-declaration. This is the P1-42 pilot — proving that `pushSchema`
resolves FK constraints by SQL table name (not JS object identity), so app-schema
objects can coexist with legacy testSchema objects during the incremental migration.
Without the testSchema entry the PGlite `setup.ts` `pushSchema` call will not create
the `notices` table and any test that inserts or queries notices will fail with
"relation does not exist."

## Goals / Non-Goals

**Goals:**

- Define `noticesTable` in `app/drizzle/schema/noticesTable.ts` with all columns from
  the intent: `id`, `countryAccountsId`, `titleJson`, `bodyJson`, `isPublished`,
  `publishedAt`, `audience`, `createdAt`, `updatedAt`.
- Export `SelectNotice` and `InsertNotice` inferred types from the same file.
- Wire the table into the schema barrel (`app/drizzle/schema/index.ts`).
- Generate the migration SQL via `yarn dbsync` and commit it.
- Add a thin re-export in `tests/integration/db/testSchema/noticesTable.ts` and update the
  testSchema barrel (P1-42 pilot — no duplication of the table definition).
- Write a PGlite integration test that verifies the table schema: the migration applies
  cleanly, the table accepts an insert with all expected columns, and the correct defaults
  are applied.

**Non-Goals:**

- Creating a model (`app/backend.server/models/notices.ts`) — that is Phase 4b.
- Creating routes, handlers, or fieldsDef — those are later phases.
- Implementing audience-based filtering — the `audience` column is added now to avoid
  a breaking migration later, but filtering logic is out of scope.
- Adding relations between `noticesTable` and other tables — notices is a standalone
  domain at this stage.

## Decisions

### Decision 1: `titleJson` and `bodyJson` as plain `jsonb(...)`, not `zeroStrMap`

`zeroStrMap(name)` is typed as `jsonb(name).$type<Record<string, string>>().default({}).notNull()`.
For notices, the i18n body could contain multi-paragraph text or structured content
beyond a simple string map, so tying to `Record<string, string>` is premature. Both
columns are declared as `jsonb("title_json")` and `jsonb("body_json")` without a
`.notNull()` — a notice can be saved as a draft before title/body are provided.

Alternatives rejected:
- `zeroStrMap` — correct type for simple key→string maps (e.g. HIP names, sector names)
  but too restrictive for notice body content which may evolve to contain formatting.
- `text` columns — would require escaping at the application layer and lose the ability
  to query by language key in SQL.

### Decision 2: `audience` as `text({ enum: [...] })`, not `pgEnum`

The project explicitly avoids `pgEnum` due to a known drizzle-kit bug
(drizzle-team/drizzle-orm#3485). The `approvalStatus` column in `disasterRecordsTable`
uses the same text-enum pattern. `audience` is declared as:

```typescript
text("audience", { enum: ["public", "private", "all"] })
  .notNull()
  .default("private")
```

This matches the `approvalFields` convention in `drizzleUtil.ts`.

### Decision 3: `countryAccountsId` is `notNull()`

All rows in `notices` belong to exactly one tenant. An orphaned notice (no tenant) is
not a valid domain object. Making the column `.notNull()` enforces this at the DB level
and removes the need for null-guards in every query. Compare: `auditLogsTable` makes
`countryAccountsId` nullable (it can audit super-admin actions that span tenants);
`notices` has no such requirement.

### Decision 4: `publishedAt` is nullable without a default

A draft notice has no publication timestamp. Setting a sentinel value (e.g. epoch or
`2000-01-01`) would mislead callers reading the timestamp. Nullable with no default
correctly models "not yet published."

### Decision 5: Declare `createdAt`/`updatedAt` inline with `{ withTimezone: true }` — do NOT use `createdUpdatedTimestamps`

ADR-002 mandates TIMESTAMPTZ for every timestamp column in the application. The shared
`createdUpdatedTimestamps` helper from `drizzleUtil.ts` uses bare `timestamp()` without
`{ withTimezone: true }`, which Drizzle maps to plain `TIMESTAMP` (no timezone). Using
it here would violate ADR-002.

For `noticesTable`, all three timestamp columns (`createdAt`, `updatedAt`, `publishedAt`)
are declared inline with `{ withTimezone: true }`:

```typescript
publishedAt: timestamp("published_at", { withTimezone: true }),
createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`),
```

The `createdUpdatedTimestamps` helper is a legacy pattern that predates ADR-002. It is
retained for existing tables to avoid mass migration, but must not be used in any new
table going forward.

Alternatives rejected:
- `...createdUpdatedTimestamps` — produces plain `TIMESTAMP`, violates ADR-002.
- `pgTimestamptz` — does not exist in drizzle-orm; `{ withTimezone: true }` is the correct option.

### Decision 6: Test approach — PGlite via `pushSchema`

`tests/integration/db/setup.ts` uses `pushSchema(schema, testDb)` to create tables in
an in-memory PGlite instance. The notices test file lives at
`tests/integration/db/queries/notices.test.ts`. It imports `"../setup"` (one directory
above `queries/`), inserts a row using `dr.insert(noticesTable).values({...})`, and
queries it back to assert column presence and default values. No real PostgreSQL is
needed; PGlite fully covers DDL application and basic DML.

## Risks / Trade-offs

- **Risk: `yarn dbsync` generates a migration that conflicts with a concurrent branch**
  If another branch runs `yarn dbsync` in the interim, the migration timestamp ordering
  in `_journal.json` may need manual reconciliation at merge time.
  Mitigation: This is a synthetic domain with no dependency from other in-flight branches.
  The branch targets `dev`; conflicts will be caught at PR review.

- **Risk: `pushSchema` in PGlite does not apply the actual migration SQL** — `pushSchema`
  introspects the Drizzle schema and generates its own DDL; it does not run the SQL file
  produced by `yarn dbsync`. If the migration SQL hand-edited after generation diverges
  from the schema definition, the two would be inconsistent.
  Mitigation: The migration SQL is never hand-edited; it is generated by drizzle-kit and
  committed verbatim. The PGlite test validates the schema definition; a separate
  migration-apply smoke test in CI validates the SQL file.

- **Risk: `bodyJson` and `titleJson` nullable may cause TypeScript non-null assertion
  fatigue in later model code** — model callers will receive `unknown | null` and must
  handle null.
  Mitigation: Accepted as the correct model. Phase 4b (model layer) will define type
  guards. Making these columns required now would force every draft insert to provide a
  placeholder value.

- **Trade-off: testSchema duplication — P1-42 pilot starts here** — `noticesTable` is
  the first schema file where the testSchema entry is a thin re-export rather than a
  re-declaration. If the PGlite suite passes with this approach (FK resolution by SQL
  table name, not JS object identity), subsequent domain schemas can follow the same
  pattern. Full elimination of the legacy testSchema duplicates is tracked as P1-42 and
  proceeds module by module after this pilot is confirmed green.

## Open Questions

None. Column types, defaults, and constraints are fully specified in the intent.
The only non-deterministic artifact is the migration timestamp, which drizzle-kit
generates at `yarn dbsync` run time.
