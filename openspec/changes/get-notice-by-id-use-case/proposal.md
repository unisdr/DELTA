## Why

The notices domain has `CreateNoticeUseCase` and `ListNoticesUseCase` but no use case for
fetching a single notice by ID. Without this, callers (Remix loaders, future REST
controllers) would need to invoke `INoticeRepository` directly, bypassing the use-case
layer's responsibility for structured logging, `NoticeDto` mapping, and explicit
documentation of the tenant-isolation contract.

## What Changes

- **New file** `app/domains/notices/application/use-cases/GetNoticeById.ts` — defines
  `GetNoticeByIdQuery`, `NoticeNotFoundError`, and `GetNoticeByIdUseCase`.
- **New file** `app/domains/notices/application/use-cases/GetNoticeById.test.ts` — unit
  tests covering happy path, not-found, tenant-isolation, logging, error propagation, and
  concurrent calls. No PGlite; repository is mocked.

No DB migration is required. No existing files are modified.

## Capabilities

### New Capabilities

- `get-notice-by-id`: Fetch a single notice by UUID within a tenant; map to `NoticeDto`;
  emit a structured log event on success; throw `NoticeNotFoundError` (subclass of
  `NotFoundError`) when the notice is absent or belongs to a different tenant.

### Modified Capabilities

<!-- None — no existing spec-level behaviour is changing. -->

## Impact

- Depends on `INoticeRepository.findById(id, tenantId)` (already declared in the port
  interface; returns `Notice` or throws `NotFoundError`).
- Depends on `toNoticeDto()` from `app/domains/notices/application/dto/NoticeDto.ts`.
- Depends on `NotFoundError` from `app/shared/errors/DomainError.ts` (base class for
  `NoticeNotFoundError`).
- Depends on `ILogger` from `~/shared/logging/ILogger`.
- **Security / multi-tenancy:** `INoticeRepository.findById` already receives `tenantId`
  as an explicit second parameter; the repository is responsible for scoping the DB query
  to that tenant. The use case additionally validates that the returned notice's `tenantId`
  matches the query, providing defence-in-depth against a misconfigured repository adapter.
  Both failure modes (null from repository vs. tenant mismatch) surface as the same
  `NoticeNotFoundError`, preventing information leakage.
- **Test tier:** Unit only — mock repository, no PGlite, no real DB.
