---
name: Recurring Anti-Patterns
description: Anti-patterns that appear repeatedly across the DELTA codebase — identified in 2026-04-01 audit
type: project
---

## 1. Session Query Fan-Out Per Request
Every authenticated request triggers 2 DB queries + 1 DB write in `getUserFromSession()` (session lookup, user join, lastActiveAt update). At 64 routes calling this, 162+ call sites across route files. Under load this creates O(n) DB write amplification.
- File: `app/utils/session.ts` lines 163-205

## 2. N+1 in Cost Calculator
`calculateTotalRecoveryCost` (disaster-events-cost-calculator.ts) executes a DB query inside a loop over `sectorDisasterRecordsRelations`, resulting in unbounded N+1 queries proportional to the number of sector-record relations per event.
- File: `app/backend.server/models/analytics/disaster-events-cost-calculator.ts` lines 246-272

## 3. String-Encoded Metadata (API Key Assignment)
API key "user assignment" metadata is encoded into the `name` column using the pattern `tokenName__ASSIGNED_USER_userId`. This is parsed by `TokenAssignmentParser` regex. Finding tokens assigned to a user requires a full table scan and in-process filtering (no SQL WHERE). This is a schema anti-pattern.
- File: `app/backend.server/models/api_key.ts` lines 119-155, 656-665

## 4. console.log/console.error as Primary Instrumentation
274 console.* calls across 55 files. Structured Winston logger exists (`app/utils/logger.ts`) but is only used in `division.ts`. The rest of the codebase uses raw console calls, which produce unstructured output that cannot be queried or alerted on.

## 5. Inconsistent Existence Check Before Delete (Confirmed in Two Locations)
`deleteByIdForNumberId` and `deleteByIdForStringId` in `common.ts` call `tx.select({}).from(table).where(...)` but do NOT await the result — the check is a no-op. The delete proceeds regardless of whether the record exists.
- File: `app/backend.server/models/common.ts` lines 63-84

The same bug exists in `deleteAllDataByDisasterRecordId`: `existingRecord` is assigned as a query builder object (not awaited), and `if (!existingRecord)` is always false. The tenant-ownership guard before the cascading child delete sequence is silently bypassed.
- File: `app/backend.server/models/disaster_record.ts` lines 449-458
- Risk: High — child rows (noneco_losses, damages, losses, disruption, sector relations) are deleted by recordId alone, without confirming tenant ownership.

## 6. Multi-Query Auth Per Route
Many route loaders call `getUserFromSession`, `getUserRoleFromSession`, and `getCountryAccountsIdFromSession` as separate sequential DB queries. These could be collapsed into a single enriched session context query.

## 7. Date Stored as Text
`startDate` and `endDate` on both `disaster_records` and `hazardous_event` tables are stored as `text` in formats like `yyyy`, `yyyy-mm`, or `yyyy-mm-dd`. This requires complex CASE/regex SQL logic in every date range query (see disaster_record.ts handler lines 99-134) and prevents index usage on date filters.
