## Why

The codebase has no shared error vocabulary for the Clean Architecture domain layer. Every future
domain implementation would otherwise define its own ad-hoc error classes or fall back to raw
`Error`, making cross-cutting concerns (presentation-layer error mapping, structured logging,
HTTP status derivation) impossible to implement generically. ADR-003 specifies exactly this
hierarchy as the foundation for consistent, layered error handling across all domains from the
first pilot onwards.

## What Changes

- **New file** `app/shared/errors/DomainError.ts` — abstract base class `DomainError` plus four
  concrete subclasses: `NotFoundError`, `ValidationError`, `AuthorizationError`, `ConflictError`.
  Each subclass carries a typed `code: string` (machine-readable) and `statusHint: number`
  (HTTP status hint for the presentation layer), matching the ADR-003 specification verbatim.
- **New file** `app/shared/errors/index.ts` — barrel re-export of all five classes so consumers
  import from `~/shared/errors` rather than deep paths.

No existing files are modified. No DB migration is required. No auth or multi-tenancy logic is
touched (these are pure TypeScript value types with no I/O).

## Capabilities

### New Capabilities

- `domain-error-hierarchy`: A typed, abstract `DomainError` base class and the four concrete
  operational error types (`NotFoundError`, `ValidationError`, `AuthorizationError`,
  `ConflictError`) that form the shared error vocabulary for all Clean Architecture domain
  implementations in DELTA.

### Modified Capabilities

(none)

## Impact

- **Files created**: `app/shared/errors/DomainError.ts`, `app/shared/errors/index.ts`
- **Files deleted**: `app/shared/errors/.gitkeep` (explicitly removed as part of this change — the placeholder is no longer needed once real source files exist in the directory)
- **Downstream consumers**: any future domain layer file that throws or catches domain errors
  (e.g. `app/domains/notices/` repository and use-case implementations)
- **No DB migration required**
- **Test approach**: Unit tests only (`yarn test:run2`). No PGlite, no real DB — these classes
  are pure TypeScript with zero I/O.
- **Security / multi-tenancy**: not applicable — no auth wrappers, no query scoping, no secrets.
