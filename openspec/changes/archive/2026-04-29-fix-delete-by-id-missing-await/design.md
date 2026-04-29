## Context

`deleteByIdForStringId` in `app/backend.server/models/common.ts` is the shared delete helper
used by five models: `organizationDeleteById`, `nonecoLossesDeleteById`,
`deleteRecordsDeleteById`, `disRecSectorsDeleteById`, and `assetDeleteById`. The function
wraps a Drizzle transaction that is supposed to verify the record exists before deleting it.

**Current buggy implementation (lines 51–60):**

```typescript
export async function deleteByIdForStringId(idStr: string, table: any) {
	let id = idStr;
	await dr.transaction(async (tx) => {
		const existingRecord = tx.select({}).from(table).where(eq(table.id, id));
		if (!existingRecord) {
			throw new Error(`Record with ID ${id} not found`);
		}
		await tx.delete(table).where(eq(table.id, id));
	});
}
```

Two bugs on the same line:

1. `tx.select({}).from(table).where(eq(table.id, id))` is **not awaited** — it returns a
   Drizzle `SelectBuilder` object, which is always truthy.
2. The guard `if (!existingRecord)` is wrong — even with `await`, an empty result is returned
   as `[]` (an empty array), which is also truthy in JavaScript.

The combined effect: the delete always proceeds, silently returning success regardless of
whether the target row exists (documented as P0-2).

## Goals / Non-Goals

**Goals:**

- `deleteByIdForStringId` MUST throw when no row with the given `id` exists in the table.
- `deleteByIdForStringId` MUST delete and resolve without error when the row does exist.
- All five callers must continue to work without modification.

**Non-Goals:**

- No changes to other `deleteById` functions (`damagesDeleteById`, `lossesDeleteById`,
  `disruptionDeleteById`, `disasterRecordsDeleteById`) — they are already correct.
- No changes to callers.
- No DB migration — this is a logic-only fix.
- No changes to types or exported interfaces.

## Decisions

### Fix the existence check in a single line

**Decision**: Add `await` + `.execute()` on the select call, and change the guard to
`existingRecord.length === 0`.

The `.execute()` call is idiomatic in this codebase (see `damagesDeleteById`,
`lossesDeleteById`). The length check is the standard pattern for "no rows returned" across
all model files.

**Alternative considered**: Replace the pre-check with a post-check (inspect rows deleted).
Drizzle's `delete().returning()` could return the deleted row, and we could throw if the
result is empty. Rejected — it would be a larger change than the minimum needed, and
`.returning()` is not consistently used elsewhere in this file.

### Keep the transaction wrapper

The transaction is preserved because the select + delete should be atomic. Removing it would
be an unnecessary scope change.

### No TypeScript type changes

The function signature `(idStr: string, table: any) => Promise<void>` remains unchanged.
The fix is purely internal.

## Risks / Trade-offs

- **[Risk] Callers that silently ignored failed deletes** will now throw. Mitigation: all
  five callers already `await` the function and propagate errors through Drizzle transactions
  — they will now correctly surface errors rather than swallowing them. This is the desired
  behaviour.
- **[Risk] PGlite support** — PGlite is used in the integration test suite. The `.execute()`
  call is supported by the PGlite Drizzle adapter, so no test infrastructure changes are
  required.

## Migration Plan

No deployment steps or rollback strategy needed — this is a single-function logic fix with
no schema changes and no API contract changes.
