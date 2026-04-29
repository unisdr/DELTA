## 1. Failing Tests (Red Phase)

- [x] 1.1 Create `tests/integration/db/queries/common.test.ts` with a `describe("deleteByIdForStringId")` block:
  - Import `"../setup"` at the top
  - Import `deleteByIdForStringId` from `~/backend.server/models/common`
  - Import `organizationTable` from `~/drizzle/schema` (use as the target table)
  - Test: calling `deleteByIdForStringId` with a non-existent ID **rejects** (throws)
  - Test: calling `deleteByIdForStringId` with an ID that was just inserted **resolves** and
    the row is gone afterwards
  - Run with `yarn vitest run tests/integration/db/queries/common.test.ts` — tests MUST fail
    (Red) before the fix is applied

## 2. Fix the Bug

- [x] 2.1 In `app/backend.server/models/common.ts`, update `deleteByIdForStringId`:
  - Add `await` and `.execute()` to the `tx.select({})` call so it returns `{ id: string }[]`
    (or just select a minimal column — use `{ id: table.id }` rather than empty `{}` to get
    a useful value)
  - Change the guard from `if (!existingRecord)` to `if (existingRecord.length === 0)`

## 3. Refactor — all 7 quality gates

- [x] 3.1 `yarn vitest run tests/integration/db/queries/common.test.ts` — tests still green
- [x] 3.2 `yarn tsc` — zero TypeScript errors
- [x] 3.3 `yarn format:check` — Prettier clean (only pre-existing unrelated warnings; neither changed file listed)
- [x] 3.4 Anti-pattern review — AP-P0-2 resolved; no new anti-patterns introduced
- [x] 3.5 SOLID review — change itself is clean; pre-existing DIP/SRP concerns noted but out of scope for this fix
- [x] 3.6 Documentation review — one WHY comment added; comments do not outnumber code lines
- [x] 3.7 Project conventions — test in `tests/` Vitest, named `*.test.ts`, setup imported via `"../setup"`
- [x] 3.8 `yarn test:run2` — 45/45 passed, no regressions

## 4. Archive

- [ ] 4.1 Run `opsx:archive` on this branch before raising the PR
