# ADR-005: Currency Storage and Conversion

## Status
Proposed

## Date
2026-05-12

## Context

DELTA records financial loss and damage data for disaster events across UN member states. Users enter monetary values in their local currencies. The system needs to support cross-country and cross-event financial comparison, aggregate reporting, and user-selectable display currencies.

A schema audit of the existing codebase revealed:
- `ourMoney()` maps to PostgreSQL `NUMERIC` (arbitrary precision) — correct base type.
- Monetary values across `damagesTable` and `lossesTable` are stored in whatever currency the user entered — no base currency normalisation exists.
- Each monetary field has its own currency column beside it (e.g. `pdRepairCostUnitCurrency`, `tdRecoveryCostUnitCurrency`) — a single record could theoretically store different currencies per field, which is unintentional.
- No `exchange_rates` table exists.
- No `amount_usd` or equivalent base currency column exists anywhere.
- No conversion rate or rate date is stored.

The system currently cannot aggregate financial data across currencies or compare losses between countries. This feature is greenfield.

## Decision

### Core Principle: Immutable Storage, Mutable Presentation

Every monetary value is stored in two forms:
1. **Original** — exactly what the user entered (amount + currency code)
2. **Base (USD)** — pre-converted at write time, stored immutably

The exchange rate used and the date it was fetched are stored alongside. This enables auditability: a 2004 tsunami financial record always shows what it was worth in 2004, not today's rate.

```sql
-- Pattern applied to every financial record
financial_loss_original     NUMERIC(19,4)   -- e.g. 50000000.0000  (INR)
financial_loss_currency     CHAR(3)         -- e.g. "INR"
financial_loss_usd          NUMERIC(19,4)   -- e.g. 671234.5600    (USD at write time)
usd_conversion_rate         NUMERIC(19,6)   -- e.g. 0.013425
usd_conversion_date         DATE            -- e.g. 2015-04-25
```

### System Base Currency: USD (Fixed)

USD is the fixed system base currency for all normalised storage. It is the international standard for cross-country disaster financial comparison and is used by UN agencies for global reporting.

USD is a **system constant**, not a tenant configuration. A tenant-configurable base currency introduces catastrophic migration risk with no practical benefit for this domain.

### Column Types

| Use | Type |
|---|---|
| Monetary amounts | `NUMERIC(19,4)` — explicit precision, no float errors |
| Exchange rates | `NUMERIC(19,6)` — 6 decimal places for accuracy |
| Currency codes | `CHAR(3)` — ISO 4217 |

The existing `ourMoney()` utility (`numeric` without explicit precision) is updated to `NUMERIC(19,4)` in new domains. A new `ourRate()` utility is added for exchange rate columns.

### One Currency Per Record, Not Per Field

The current schema's per-field currency columns are eliminated in new domains. Each financial record has a single `entry_currency` that applies to all monetary fields on that record. An asset damage assessment is always done in one currency.

```typescript
// New domain schema pattern
entry_currency:         char('entry_currency', { length: 3 })
pd_repair_cost:         numeric('pd_repair_cost', { precision: 19, scale: 4 })
pd_repair_cost_usd:     numeric('pd_repair_cost_usd', { precision: 19, scale: 4 })
usd_conversion_rate:    numeric('usd_conversion_rate', { precision: 19, scale: 6 })
usd_conversion_date:    date('usd_conversion_date')
```

### Display Currency Resolution Chain

```
1. user.preferredCurrency          (column does not exist yet — falls through gracefully)
2. tenant.defaultDisplayCurrency   from country_accounts record
3. "USD"                           system default
```

Resolution is null-safe. `user.preferredCurrency` is added when the user settings domain is built.

### Exchange Rates Table

```typescript
export const exchangeRatesTable = pgTable('exchange_rates', {
  fromCurrency:  char('from_currency', { length: 3 }).notNull(),
  toCurrency:    char('to_currency',   { length: 3 }).notNull(),
  rate:          numeric('rate', { precision: 19, scale: 6 }).notNull(),
  effectiveDate: date('effective_date').notNull(),
  source:        text('source').notNull(),  // e.g. "ECB"
}, (table) => ({
  pk: primaryKey({ columns: [table.fromCurrency, table.toCurrency, table.effectiveDate] }),
}));
```

Rates are inserted by a background job and are never updated. Historical rates are immutable snapshots.

### Rate Provider: ECB

The European Central Bank (ECB) provides daily reference rates free of charge. ECB rates are authoritative, internationally recognised, and appropriate for a UN/DPG project. Paid providers (Open Exchange Rates, Fixer.io, CurrencyLayer) are not used.

A background job runs daily to fetch and insert new rates. If the provider is unavailable, the last known rate is used with a `rateStalenessWarning` flag on the response — data entry is never blocked because rates are temporarily unavailable.

### Historical vs Current Rate Views

**Point-in-time (primary mode)**: Past records always display using the rate stored at write time (`usd_conversion_rate`). This is the accounting-accurate view. Used for all record-level display and export.

**Current rate projection (analytics mode)**: Aggregate dashboard views may optionally re-convert historical base amounts using today's rate for trend analysis. This mode is explicitly labelled as *"indicative — not accounting accurate"* in both the UI and API responses. The `_usd` columns are never changed — only the display computation changes.

### CurrencyConversionService

A domain port `ICurrencyConversionService` is defined in shared infrastructure:

```typescript
interface ICurrencyConversionService {
  convert(amount: number, fromCurrency: string, toDate: Date): Promise<ConversionResult>;
  getLatestRate(fromCurrency: string, toCurrency: string): Promise<RateResult>;
}

interface ConversionResult {
  amountUsd: number;
  rate: number;
  rateDate: Date;
  source: string;
  isEstimated: boolean;   // true if rate is from a fallback due to provider unavailability
}
```

The infrastructure implementation reads from the `exchange_rates` table (with a short-lived in-memory cache) and calls the ECB API for fresh rates when needed. Use cases inject the port — they never call the ECB API directly.

### Client-Side Monetary Arithmetic

**`dinero.js`** is used for all client-side monetary calculations. It handles:
- Arbitrary precision arithmetic without float errors
- Rounding only at the final display step
- Currency-aware comparison and formatting

Rounding never occurs mid-calculation. The `Intl.NumberFormat` utility (see ADR-001) formats the final display value.

### Immutability Guards

- `user.defaultDisplayCurrency` is **mutable** — affects display only, not stored values.
- System base currency (USD) is **immutable** — a constant in code, not a database value.
- `usd_conversion_rate` and `usd_conversion_date` are **immutable after insert** — enforced at the application layer. No update use case modifies these columns.

### Existing Schema Migration

The existing per-field currency columns in `damagesTable` and `lossesTable` are migrated when those domains are rewritten via the strangler fig. The migration:
1. Adds `entry_currency`, `*_usd`, `usd_conversion_rate`, `usd_conversion_date` columns
2. Backfills `entry_currency` from the most common existing per-field currency value per record
3. Backfills `*_usd` using the historical ECB rate nearest to the event date (best-effort — flagged as estimated for pre-migration records via a `conversion_estimated` boolean column)
4. Drops the redundant per-field currency columns

## Consequences

- Cross-country financial comparison and aggregate reporting become possible once base currency columns are populated
- Audit trail is complete: original amount, currency, rate, and rate date are all stored and immutable
- The per-field currency schema problem is eliminated in new domains
- A background rate-fetch job must be operational before financial data entry in new domains — deployment dependency
- Backfilling historical data with estimated rates is unavoidable for pre-migration records — `conversion_estimated` flag surfaces this clearly to users
- `dinero.js` adds a client-side dependency; bundle size impact should be confirmed

## References

- [ADR-001: Multi-lingual Strategy](ADR-001-multilingual-strategy.md) — `Intl.NumberFormat` for currency display formatting
- [ADR-002: Timezone Handling](ADR-002-timezone-handling.md) — `usd_conversion_date` uses `DATE` type (no time component needed)
- [ECB Euro foreign exchange reference rates](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html)
- [ISO 4217 Currency Codes](https://www.iso.org/iso-4217-currency-codes.html)
- [dinero.js](https://dinerojs.com/)
