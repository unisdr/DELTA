## Requirements

### Requirement: deleteByIdForStringId throws when record does not exist
`deleteByIdForStringId` in `app/backend.server/models/common.ts` SHALL throw an `Error`
when no row with the given `id` exists in the target table. The error MUST be thrown from
within the transaction before any delete is attempted.

#### Scenario: Delete is called with an ID that does not exist in the table
- **WHEN** `deleteByIdForStringId` is called with a string ID that has no matching row in
  the target table
- **THEN** the function SHALL throw an `Error` (reject the returned Promise)

### Requirement: deleteByIdForStringId deletes the row when it exists
`deleteByIdForStringId` in `app/backend.server/models/common.ts` SHALL delete the matching
row and resolve without error when a row with the given `id` exists in the target table.

#### Scenario: Delete is called with an ID that exists in the table
- **WHEN** `deleteByIdForStringId` is called with a string ID that has a matching row in
  the target table
- **THEN** the function SHALL resolve without error
- **AND** the row with that ID SHALL no longer exist in the table after the call

### Requirement: Callers of deleteByIdForStringId require no changes
All five direct callers of `deleteByIdForStringId` (`organizationDeleteById`,
`nonecoLossesDeleteById`, `deleteRecordsDeleteById`, `disRecSectorsDeleteById`,
`assetDeleteById`) SHALL continue to compile and behave correctly without modification.

#### Scenario: Caller invokes deleteByIdForStringId for a row that exists
- **WHEN** a caller such as `organizationDeleteById` calls `deleteByIdForStringId` with the
  ID of an existing row
- **THEN** the caller SHALL receive a resolved Promise (no error thrown)

#### Scenario: Caller invokes deleteByIdForStringId for a row that does not exist
- **WHEN** a caller such as `organizationDeleteById` calls `deleteByIdForStringId` with an
  ID that has no matching row
- **THEN** the caller SHALL receive a rejected Promise (an Error is thrown)
