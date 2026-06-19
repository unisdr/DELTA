## Why

Phase 4e of the Notices pilot roadmap: the domain has a `CreateNoticeUseCase` and a
repository port with `findAll()`, but no use case that drives listing. Without
`ListNoticesUseCase`, no route or loader can retrieve a paginated, locale-resolved list
of notices for a tenant — blocking all downstream UI work.

## What Changes

- **New file** `app/domains/notices/application/use-cases/ListNotices.ts` — implements
  `ListNoticesUseCase`, accepting `ListNoticesQuery` (tenantId, locale, page, pageSize),
  delegating to `INoticeRepository.findAll()`, mapping results with `toNoticeDto()`, and
  returning an empty array (not an error) when no notices exist for the tenant.
- **New file** `app/domains/notices/application/use-cases/ListNotices.test.ts` — unit
  tests with a mock repository covering the happy path, empty result, locale resolution,
  locale fallback, concurrent callers, and logger emission.

No DB migration required — this change adds only application-layer code that calls an
existing repository port method.

Test approach: Unit (Vitest, mock repository). No PGlite or real DB required; the
repository is mocked via `vi.fn()`. Run with:
`yarn vitest run app/domains/notices/application/use-cases/ListNotices.test.ts`

No auth or multi-tenancy security implications beyond what is already enforced by
`INoticeRepository.findAll(tenantId, pagination)` — the port contract already requires
an explicit `tenantId` parameter, preventing cross-tenant reads.

## Capabilities

### New Capabilities

- `list-notices`: Application use case that accepts a query with `tenantId`, `page`, and
  `pageSize`, fetches a paginated `Notice[]` from `INoticeRepository.findAll()`, maps each
  entity to a `NoticeDto` using `toNoticeDto()`, and returns the mapped array. Returns an
  empty array when the repository returns zero results. Locale resolution is a
  presentation-layer concern — the full `LocaleMap` is preserved in each `NoticeDto`.

### Modified Capabilities

_(none — no existing spec-level behaviour changes)_

## Impact

- **New**: `app/domains/notices/application/use-cases/ListNotices.ts`
- **New**: `app/domains/notices/application/use-cases/ListNotices.test.ts`
- **Read-only dependency**: `app/domains/notices/application/ports/INoticeRepository.ts`
  (consumes `findAll(tenantId, pagination)` — no modification)
- **Read-only dependency**: `app/domains/notices/application/dto/NoticeDto.ts`
  (reuses `toNoticeDto()` — no modification)
- **Read-only dependency**: `app/shared/types/Pagination.ts`
  (field names `page` and `pageSize` map directly from `ListNoticesQuery`)
- **Read-only dependency**: `app/shared/logging/ILogger.ts` / `NoOpLogger.ts`
  (injected via constructor, same pattern as `CreateNoticeUseCase`)
