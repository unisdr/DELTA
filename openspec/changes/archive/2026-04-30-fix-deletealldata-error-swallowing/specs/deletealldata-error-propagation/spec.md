## ADDED Requirements

### Requirement: clearThrows MUST throw on any failure
`clearThrows(tableIdStr, recordId, countryAccountsId)` in `app/backend.server/handlers/human_effects.ts` MUST throw on any failure and MUST preserve the tenant-isolation check already present in `clear()`.

#### Scenario: Record does not exist for the given tenant
- **WHEN** `clearThrows` is called with a `recordId` whose `country_accounts_id`
  does not match `countryAccountsId`
- **THEN** `clearThrows` SHALL throw a `Response` with HTTP status 404
- **AND** no rows SHALL be deleted

#### Scenario: Table identifier is not recognised
- **WHEN** `clearThrows` is called with a `tableIdStr` that is not a valid
  `HumanEffectsTable` value
- **THEN** `clearThrows` SHALL throw an `Error` describing the invalid table name

#### Scenario: clearData returns an error result
- **WHEN** `clearThrows` is called with valid arguments but the underlying
  `clearData` model call returns `{ ok: false, error: <ETError> }`
- **THEN** `clearThrows` SHALL throw that `ETError`

#### Scenario: Successful clear
- **WHEN** `clearThrows` is called with a valid table, a `recordId` that exists
  under `countryAccountsId`, and `clearData` succeeds
- **THEN** `clearThrows` SHALL return without throwing
- **AND** the rows for that table and record SHALL be deleted

### Requirement: clear() preserves its existing Response-returning contract
The public `clear(tableIdStr, recordId, countryAccountsId)` MUST continue to return
a `Response` in all cases. It MUST delegate its logic to `clearThrows` and convert
any thrown error into an appropriate Response.

#### Scenario: Successful clear via clear()
- **WHEN** `clear()` is called with valid arguments
- **THEN** `clear()` SHALL return `Response.json({ ok: true })` with HTTP status 200

#### Scenario: ETError via clear()
- **WHEN** `clear()` is called and `clearThrows` throws an `ETError`
- **THEN** `clear()` SHALL return `Response.json({ ok: false, error: <etError> })`
  with HTTP status 200

#### Scenario: Invalid table name via clear()
- **WHEN** `clear()` is called with an unrecognised `tableIdStr`
- **THEN** `clear()` SHALL return `Response.json({ ok: false, error: <string> })`
  with HTTP status 200

### Requirement: deleteAllData propagates per-table clear failures
`deleteAllData` in `app/backend.server/handlers/human_effects.ts` MUST throw when
any call to `clearThrows` fails. It SHALL NOT continue iterating tables after a
failure, and it SHALL NOT call `categoryPresenceDeleteAll` after a failure.

#### Scenario: All tables clear successfully
- **WHEN** `deleteAllData` is called with a valid `recordId` and `countryAccountsId`
  and all per-table `clearThrows` calls succeed
- **THEN** `deleteAllData` SHALL call `categoryPresenceDeleteAll` exactly once
- **AND** SHALL return `Response.json({ ok: true })`

#### Scenario: One table clear fails — error propagates
- **WHEN** `deleteAllData` is called and `clearThrows` throws for any table
- **THEN** `deleteAllData` SHALL throw that error immediately
- **AND** SHALL NOT call `categoryPresenceDeleteAll`
- **AND** SHALL NOT attempt to clear any subsequent tables

### Requirement: delete-all-data route MUST handle thrown errors from deleteAllData
The route action `delete-all-data.ts` MUST catch errors thrown by `deleteAllData` and return a `Response` to the client.

#### Scenario: deleteAllData throws
- **WHEN** the route action calls `deleteAllData` and it throws
- **THEN** the action SHALL return
  `Response.json({ ok: false, error: String(e) }, { status: 500 })`

#### Scenario: deleteAllData returns normally
- **WHEN** the route action calls `deleteAllData` and it returns a Response
- **THEN** the action SHALL return that Response unchanged to the client

### Requirement: Disaster record transaction MUST roll back when deleteAllData throws
`deleteAllDataByDisasterRecordId` in `disaster_record.ts` MUST trigger a Drizzle transaction rollback when `deleteAllData` throws inside the `dr.transaction()` callback.

#### Scenario: deleteAllData throws inside the transaction
- **WHEN** `deleteAllDataByDisasterRecordId` is called and `deleteAllData` throws
  due to a per-table clear failure
- **THEN** the Drizzle transaction SHALL be rolled back
- **AND** the disaster record row SHALL still exist in the database
- **AND** all sibling child rows deleted earlier in the same transaction SHALL also
  be restored (no partial delete)
