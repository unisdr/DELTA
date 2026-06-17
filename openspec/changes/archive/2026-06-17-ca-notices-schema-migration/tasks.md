## 1. Write the failing test (Red)

- [x] 1.1 Create `tests/integration/db/queries/notices.test.ts`. The test file MUST
  import `"../setup"` as its first statement, then import `dr` from `~/db.server` and
  `noticesTable` from `~/drizzle/schema`. Write five tests:

  (a) Insert a row with only `countryAccountsId` — verifies defaults: `isPublished =
  false`, `audience = 'private'`, `publishedAt = null`, `titleJson = null`,
  `bodyJson = null`, and `id` is a non-null UUID. (Covers spec: "Insert a minimal
  draft notice.")

  (b) Insert a fully populated row with all columns — retrieve it and assert every
  column matches the supplied values. (Covers spec: "Insert a fully populated notice.")

  (c) Attempt to insert a row with `audience = 'restricted'` (invalid enum value) —
  assert the promise rejects. (Covers spec: "`audience` column rejects a value outside
  the enum.")

  (d) Insert two notice rows with distinct `countryAccountsId` values via `Promise.all`
  — assert both rows exist and neither is missing. (Covers spec: "Concurrent insert
  from two callers sees both rows.")

  (e) Assert that `noticesTable` can be imported from `~/drizzle/schema` (the barrel)
  without error — the import itself is the assertion. (Covers spec: "Barrel export
  resolves the table.")

  (f) Insert a notice row for a given `countryAccountsId`, then delete that
  `country_accounts` row, then query `notices` for that id — assert the notice row no
  longer exists. (Covers spec: "Deleting the parent countryAccountsId cascades to
  notices.")

  Note: tests MUST fail at this point because `noticesTable` does not exist.

  Run to confirm red:
  `yarn vitest run tests/integration/db/queries/notices.test.ts`

## 2. Implement the schema file (Green — schema)

- [x] 2.1 Create `app/drizzle/schema/noticesTable.ts`. Import:
  - `pgTable`, `uuid`, `jsonb`, `boolean`, `timestamp`, `text`, `sql` from `drizzle-orm/pg-core`
  - `ourRandomUUID` from `~/utils/drizzleUtil` (do NOT import `createdUpdatedTimestamps` — it produces plain TIMESTAMP, violating ADR-002)
  - `countryAccountsTable` from `./countryAccountsTable`

  Define and export `noticesTable`:
  ```typescript
  export const noticesTable = pgTable("notices", {
    id: ourRandomUUID(),
    countryAccountsId: uuid("country_accounts_id")
      .notNull()
      .references(() => countryAccountsTable.id, { onDelete: "cascade" }),
    titleJson: jsonb("title_json"),
    bodyJson: jsonb("body_json"),
    isPublished: boolean("is_published").notNull().default(false),
    // audience exists from day one to avoid a breaking migration when public/hybrid support is added
    audience: text("audience", { enum: ["public", "private", "all"] })
      .notNull()
      .default("private"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    // createdAt/updatedAt declared inline (not via createdUpdatedTimestamps) to enforce TIMESTAMPTZ per ADR-002
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`),
  });
  ```

  Export inferred types:
  ```typescript
  export type SelectNotice = typeof noticesTable.$inferSelect;
  export type InsertNotice = typeof noticesTable.$inferInsert;
  ```

  Run to confirm tests still fail (the testSchema re-export is missing):
  `yarn vitest run tests/integration/db/queries/notices.test.ts`

- [x] 2.2 Add `export * from "./noticesTable"` to `app/drizzle/schema/index.ts`.
  Insert the line in alphabetical order (after `./nonecoLossesTable`, before
  `./organizationTable`).

  Run to confirm tests still fail (PGlite testSchema re-export is still missing):
  `yarn vitest run tests/integration/db/queries/notices.test.ts`

## 3. Implement the PGlite testSchema entry (Green — test infrastructure)

- [x] 3.1 Create `tests/integration/db/testSchema/noticesTable.ts` as a **thin re-export**
  from the app schema — do NOT duplicate the table definition:

  ```typescript
  export * from "~/drizzle/schema/noticesTable";
  ```

  This is the first notices-domain file to pilot the P1-42 pattern (eliminate manual
  testSchema duplication by re-exporting from the app schema). Drizzle's `pushSchema`
  resolves FK constraints by SQL table name, so the app-schema `noticesTable` object
  referencing `countryAccountsTable` will resolve correctly against the testSchema
  `country_accounts` table at DDL time.

  No separate type exports needed — `SelectNotice` and `InsertNotice` flow through
  the re-export automatically.

- [x] 3.2 Add `export * from "./noticesTable"` to
  `tests/integration/db/testSchema/index.ts`. Insert in alphabetical order (after
  `./nonecoLossesTable`, before `./organizationTable`).

  Run to confirm green (all five tests pass):
  `yarn vitest run tests/integration/db/queries/notices.test.ts`

## 4. Generate the migration (Green — DB migration)

- [x] 4.1 Run `yarn dbsync` on branch `feature/ca-notices-schema-migration`.
  drizzle-kit will detect `noticesTable` as a new table and generate:
  - `app/drizzle/migrations/<timestamp>_add_notices_table.sql`
  - An updated `app/drizzle/migrations/meta/_journal.json` entry

  Review the generated SQL to confirm it creates a `notices` table with all expected
  columns, types, defaults, and the FK constraint to `country_accounts`. Do not edit
  the SQL by hand.

  Stage both generated files for commit alongside the schema and testSchema files.

## 5. Quality gates (Refactor)

- [x] 5.1 **Gate 1 — Tests green**
  `yarn vitest run tests/integration/db/queries/notices.test.ts`
  All five tests must pass. If any fail, diagnose before proceeding.

- [x] 5.2 **Gate 2 — TypeScript**
  `yarn tsc`
  Zero type errors. Confirm `SelectNotice` and `InsertNotice` types resolve correctly:
  - `audience` in `SelectNotice` is `"public" | "private" | "all"` (NOT nullable — the column is `.notNull()`).
  - `countryAccountsId` in `InsertNotice` is `string` (not optional).
  - `publishedAt`, `titleJson`, `bodyJson` in `SelectNotice` are nullable (`Date | null`, `unknown`, `unknown`).
  - All three timestamp columns (`createdAt`, `updatedAt`, `publishedAt`) resolve as `Date` / `Date | null`.
  Pay attention to `noUnusedLocals` — do not leave unused imports (e.g. `createdUpdatedTimestamps` must not be imported).

- [x] 5.3 **Gate 3 — Prettier**
  `yarn format:check`
  If formatting issues are reported, run `yarn format` then re-check. Tabs (not spaces),
  80-char width, trailing commas — the project enforces this strictly.

- [x] 5.4 **Gate 4 — Anti-pattern review**
  Read `.github/skills/anti-pattern-check/SKILL.md` and verify none of the listed
  anti-patterns are present in the new/modified files. Specifically check:
  - No `as any` casts in `noticesTable.ts` or the testSchema mirror.
  - No `pgEnum` used — text enum only.
  - No `drizzle-kit push` invoked anywhere in the change.
  - `countryAccountsId` is `.notNull()` — not optional.
  - `createdUpdatedTimestamps` is NOT imported or spread — all timestamp columns use explicit `{ withTimezone: true }` (ADR-002).

- [x] 5.5 **Gate 5 — SOLID review**
  Invoke the `solid-reviewer` agent on `app/drizzle/schema/noticesTable.ts`.
  Confirm:
  - SRP: the file has one responsibility (table definition + type exports).
  - No unrelated logic (no query functions, no validation) leaks into the schema file.

- [x] 5.6 **Gate 6 — Documentation review**
  The schema file MUST include TWO WHY comments — comments MUST explain WHY, not WHAT:
  1. On the `audience` column: why it exists from day one despite the pilot not filtering
     by audience yet (e.g. `// audience exists from day one to avoid a breaking migration when public/hybrid support is added`).
  2. On the `createdAt`/`updatedAt` inline declarations: why `createdUpdatedTimestamps`
     is NOT used (e.g. `// declared inline (not via createdUpdatedTimestamps) to enforce TIMESTAMPTZ per ADR-002`).

- [x] 5.7 **Gate 7 — Project conventions review**
  Read `.github/copilot-instructions.md` and confirm:
  - `noticesTable.ts` does NOT use `.server.ts` suffix — schema files are not
    server-only (they are imported by both server and client type inference).
  - `export *` in both barrels follows the existing ordering convention.
  - `yarn dbsync` was used, never `drizzle-kit push`.
  - Branch is `feature/ca-notices-schema-migration`, PR will target `dev`.

- [x] 5.8 **Gate 8 — Code review**
  Run `.github/skills/code-review/SKILL.md` in full against the diff on this branch.
  Address every finding before proceeding to the regression task.

## 6. Regression and archive

- [x] 6.1 **Full PGlite regression suite**
  `yarn test:run2`
  MUST pass with no new failures. If any test fails, run the suite on the base branch
  (`dev` or `feature/ca-notices-schema-migration` before this change) to confirm it was
  already failing. Do not label any failure as pre-existing without this baseline
  confirmation.

- [x] 6.2 **Tick all checkboxes** — tick every item in this tasks.md (including this one)
  so the incomplete-task guard does not block the archive step.

- [x] 6.3 **Archive** — run `opsx:archive` on branch `feature/ca-notices-schema-migration`
  to finalise the OpenSpec change artifacts and mark the change complete.

- [x] 6.4 **Raise PR** — target `dev` with title:
  `Feature: notices table Drizzle schema and migration (Phase 4a)`
