## Why

The Notices domain layer was scaffolded in Phase 4a (schema + migration), but the
domain entity and repository port are missing — every subdirectory contains only a
`.gitkeep`. Without a `Notice` entity and an `INoticeRepository` port, no use-case
can be written and the Clean Architecture boundary cannot be enforced. This change
closes that gap by implementing Phases 4b and 4c of the Notices Pilot Roadmap in a
single PR (the port cannot compile without the entity, so they must land together).

## What Changes

- **New file** `app/domains/notices/domain/Notice.ts` — domain entity with a private
  constructor and a static `create()` factory that validates its inputs; zero framework
  dependencies.
- **New file** `app/domains/notices/domain/Notice.test.ts` — Vitest unit tests for
  `Notice.create()` covering the happy path and all failure paths; no DB dependency.
- **New file** `app/domains/notices/application/ports/INoticeRepository.ts` — port
  interface declaring `findById`, `findAll`, `save`, and `delete`; all methods are
  scoped by `tenantId` for multi-tenancy.
- **New file** `app/shared/types/Pagination.ts` — a minimal `Pagination` value-object
  type (`page: number`, `pageSize: number`) needed by `INoticeRepository.findAll`;
  no equivalent exists in `app/shared/` or `app/domains/` today.
- **New file** `app/shared/types/index.ts` — barrel re-export for `app/shared/types/`.

No DB migration is required — the `notices` table was created in Phase 4a.

## Capabilities

### New Capabilities

- `notice-entity`: Domain entity `Notice` with validated `create()` factory — enforces
  that `titleJson` has at least one non-empty locale and that `publishedAt` is null
  when `isPublished` is false; throws `ValidationError` on violation.
- `notice-repository-port`: `INoticeRepository` port interface — declares the contract
  for persistence operations (`findById`, `findAll`, `save`, `delete`) with every method
  scoped by `tenantId`.

### Modified Capabilities

<!-- None — no existing spec-level requirements are changing. -->

## Impact

- **`app/domains/notices/domain/Notice.ts`** (new) — domain entity; must import only
  from `app/shared/errors/` and the new `app/shared/types/`; no Drizzle, no Remix.
- **`app/domains/notices/domain/Notice.test.ts`** (new) — Vitest unit tests; runs in
  `yarn test:run2`; no PGlite setup required.
- **`app/domains/notices/application/ports/INoticeRepository.ts`** (new) — port
  interface; references `Notice` and `Pagination`; TypeScript compilation (`yarn tsc`)
  is the verification gate for this file.
- **`app/shared/types/Pagination.ts`** (new) — shared value-object type; consumed
  initially by `INoticeRepository`; available to future domain ports without duplication.
- **`app/shared/types/index.ts`** (new) — barrel export for `app/shared/types/`.
- **No fieldsDef / Form-CSV-API pipeline impact** — this change is pure domain layer.
- **No auth or multi-tenancy risk at this layer** — `INoticeRepository` methods accept
  `tenantId: string` explicitly; actual enforcement is in the infrastructure adapter
  (DrizzleNoticeRepository, Phase 4g).
- **Test tier**: unit tests only (`yarn test:run2`); no PGlite, no real DB, no E2E.
