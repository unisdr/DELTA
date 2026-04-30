## Why

`deleteByIdForStringId` in `app/backend.server/models/common.ts` silently succeeds when
deleting a non-existent record because the existence check is never awaited. The Drizzle
query builder object returned without `await` is always truthy, so the guard
`if (!existingRecord)` never throws. This means callers receive no error when attempting to
delete a record that does not exist (P0-2).

## What Changes

- **`app/backend.server/models/common.ts`** — Fix `deleteByIdForStringId`: add `await` and
  `.execute()` to the `tx.select()` call, and correct the existence guard from
  `if (!existingRecord)` to `if (existingRecord.length === 0)`.

No other models are affected. All other `deleteById` functions (`damagesDeleteById`,
`lossesDeleteById`, `disruptionDeleteById`, `disasterRecordsDeleteById`) already correctly
await their queries.

No DB migration is required — this is a logic-only fix.

## Capabilities

### New Capabilities

- `delete-by-id-correct-existence-check`: `deleteByIdForStringId` MUST throw an error when
  no row with the given `id` exists in the target table, and MUST delete the row and resolve
  without error when the row does exist.

### Modified Capabilities

_(none — no existing spec files exist in openspec/specs/)_

## Impact

- **`app/backend.server/models/common.ts`** — single-line logic fix to `deleteByIdForStringId`
- **Callers** (organization, noneco_losses, disaster_record__sectors x2, asset): all already
  `await` the helper, so no caller changes needed
- **Security / multi-tenancy**: no auth or tenant-scope changes required
- **Tests**: new PGlite integration test in `tests/integration/db/queries/common.test.ts`
