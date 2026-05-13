# ADR-002: Timezone Handling

## Status
Proposed

## Date
2026-05-12

## Context

DELTA records disaster and hazardous event data submitted by users across multiple countries and timezones. The application is multi-tenant, with each tenant (country account) operating in a specific geographic region.

A schema audit of the existing codebase revealed:
- Almost all timestamp columns use `TIMESTAMP WITHOUT TIME ZONE` (no TZ). The only exception is `auditLogsTable.timestamp` which correctly uses `TIMESTAMPTZ`.
- `countryAccountsTable` explicitly sets `withTimezone: false`.
- `hazardousEventTable.startDate` and `endDate` are stored as `TEXT` — not timestamp columns at all.
- No IANA timezone column exists anywhere in the schema.
- No user-level timezone preference column exists (tenant-level only).

Disaster event dates have a domain-specific constraint absent from typical SaaS applications: **the date and time of an event is a property of the geographic location where it occurred**, not of the user viewing it. Displaying a 2015 Nepal earthquake date in a New York user's timezone produces a factually incorrect date.

## Decision

### Core Rule
Store all timestamps in UTC. Convert to local time only at the presentation layer. Never store local time in the database.

### Column Types — New Domains
All new timestamp columns use `TIMESTAMPTZ` (timestamp with timezone). Date-only fields with no time component use `DATE`.

```typescript
// drizzleUtil.ts additions for new domains
export function utcTimestamp(name: string) {
  return timestamp(name, { withTimezone: true });
}
```

### Existing Schema — Strangler Fig Migration
Existing `TIMESTAMP WITHOUT TIME ZONE` columns are **not changed globally**. Each column is migrated to `TIMESTAMPTZ` only when its domain is rewritten as part of the strangler fig. Changing the type globally before old components are updated would cause date display regressions in untouched parts of the application.

### UTC Enforcement at DB Connection
`SET timezone = 'UTC'` is added per connection in `db.server.ts` **only when a domain is being rewritten** — not globally now. It is combined with the P1-1 explicit pool configuration work.

```typescript
pool.on('connect', (client) => {
  client.query("SET timezone = 'UTC'");
});
```

### Library
**Luxon** on both frontend and backend. TypeScript-native, immutable by design, fully IANA-aware. Replaces any ad-hoc `Date` manipulation across the codebase. Formatter instances are cached where used in hot paths.

### Timezone Identifiers
Always IANA identifiers (e.g. `"Asia/Kathmandu"`). Never UTC offsets (`+05:45`) or abbreviations (`NST`). Offsets are static and do not handle Daylight Saving Time. IANA identifiers are DST-aware by definition.

### Timezone Resolution Chain

```
1. user.preferredTimezone    (column does not exist yet — falls through gracefully)
2. tenant.defaultTimezone    from country_accounts record
3. "UTC"                     system default
```

Resolution is null-safe. `user.preferredTimezone` is added when the user settings domain is built.

### Three Categories of Timestamps

| Category | Examples | Storage | Display rule |
|---|---|---|---|
| System timestamps | `created_at`, `updated_at`, session expiry, workflow dates | `TIMESTAMPTZ` UTC | Convert to user's resolved IANA timezone |
| Event occurrence | `event_start_date`, `event_end_date` on hazardous/disaster events | `TIMESTAMPTZ` UTC + `event_timezone TEXT` (IANA) | Convert to **event's geographic timezone**, never user's timezone |
| Audit / log timestamps | Every log line, audit trail entries | UTC ISO 8601 string | Never converted — always displayed as UTC |

### Event Occurrence Dates — Geographic Anchor
Event dates are stored with two columns:

```sql
event_start_date      TIMESTAMPTZ    -- UTC anchor (e.g. 2015-04-25T06:11:00Z)
event_start_timezone  TEXT           -- IANA identifier (e.g. "Asia/Kathmandu")
```

`event_start_timezone` is derived from the event's geographic location at record time and stored immutably alongside the date. On display, the UTC value is converted to the stored IANA timezone — not the user's timezone.

Every event date displayed in the UI carries a timezone label:
```
Started: 25 April 2015, 11:56  NST (Nepal Standard Time)
```

API responses include both representations:
```json
{
  "startDate": {
    "utc": "2015-04-25T06:11:00Z",
    "local": "2015-04-25T11:56:00+05:45",
    "timezone": "Asia/Kathmandu",
    "display": "25 Apr 2015, 11:56 NST"
  }
}
```

### Partial and Uncertain Dates
Historical disaster data is often recorded with incomplete date precision. Each event date is stored as two columns:

```sql
event_start_date       TIMESTAMPTZ    -- start of the known period (e.g. 2015-01-01T00:00:00Z for year-only)
event_start_precision  TEXT           -- enum: YEAR | YEAR_MONTH | DATE | DATETIME
```

| Known information | Stored value | Precision | UI display |
|---|---|---|---|
| Year only: 2015 | `2015-01-01T00:00:00Z` | `YEAR` | "2015" |
| Year + month: April 2015 | `2015-04-01T00:00:00Z` | `YEAR_MONTH` | "April 2015" |
| Full date: 25 April 2015 | `2015-04-25T00:00:00Z` | `DATE` | "25 April 2015" |
| Full datetime | `2015-04-25T06:11:00Z` | `DATETIME` | "25 Apr 2015, 11:56 NST" |

The precision flag drives all form rendering (show only the fields the user knows) and all display logic. Sorting uses the stored date value — year-only records sort to January 1st of that year.

This pattern aligns with **EDTF (Extended Date/Time Format, ISO 8601-2)** used in archive and disaster risk databases internationally.

### Log Timestamps
All log lines use UTC ISO 8601 strings exclusively. `new Date().toISOString()` is always UTC in Node.js — this is safe and sufficient. No timezone conversion in logs, no exceptions.

## Consequences

- New domain schemas are correctly typed from day one; no silent timezone bugs in new code
- Old components are undisturbed until their domain is migrated — no regressions
- Event dates will clearly indicate their geographic timezone to users, eliminating the ambiguity of "whose timezone is this?"
- Partial date precision requires a migration for existing `startDate TEXT` columns in hazardous_event and related tables — this is scoped to those domain rewrites
- Luxon adds a dependency; the bundle size impact should be evaluated and tree-shaking confirmed for the frontend build

## References

- [ADR-001: Multi-lingual Strategy](ADR-001-multilingual-strategy.md) — same resolution chain pattern for locale
- [ADR-004: Logging and Traceability](ADR-004-logging-and-traceability.md) — log timestamp rules
- [P1-1: Configure Explicit DB Connection Pool](../refactoring-plan/phases/phase-1-structural.md) — UTC enforcement combined with pool config
- [EDTF / ISO 8601-2](https://www.loc.gov/standards/datetime/) — partial date standard
