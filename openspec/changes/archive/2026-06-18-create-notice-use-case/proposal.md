## Why

The Notices domain has a validated `Notice` entity and an `INoticeRepository` port, but no application-layer use-case to orchestrate creation. Without `CreateNoticeUseCase`, no route or controller can create a notice through the clean architecture boundary — the domain layer is complete but unreachable from the presentation layer.

## What Changes

- **New**: `app/domains/notices/application/use-cases/CreateNotice.ts` — `CreateNoticeUseCase` class that accepts a `CreateNoticeCommand`, builds the `Notice` entity via `Notice.create()`, persists via `INoticeRepository.save()`, and returns a `NoticeDto`.
- **New**: `app/domains/notices/application/dto/NoticeDto.ts` — `NoticeDto` interface and `toNoticeDto()` mapper function that converts a `Notice` entity to a plain serialisable object with ISO-string timestamps.
- **New**: `app/domains/notices/application/use-cases/CreateNotice.test.ts` — unit tests covering the happy path, `ValidationError` propagation, and repository error propagation. No DB dependency; uses a mock `INoticeRepository` and `NoOpLogger`.

No DB migration is required — this change is application-layer only. The `notices` table already exists.

No routes or handlers are added in this phase; the use-case is wired to the presentation layer in a subsequent phase.

## Capabilities

### New Capabilities

- `create-notice`: Orchestrates construction and persistence of a new Notice entity — accepts `CreateNoticeCommand`, validates via the entity factory, persists via the repository port, and returns a `NoticeDto`.

### Modified Capabilities

_(none — no existing spec-level requirements change)_

## Impact

- **New files**: `CreateNotice.ts`, `NoticeDto.ts`, `CreateNotice.test.ts` under `app/domains/notices/application/`.
- **Dependencies read**: `Notice` entity (`app/domains/notices/domain/Notice.ts`), `INoticeRepository` port (`app/domains/notices/application/ports/INoticeRepository.ts`), `ILogger` / `NoOpLogger` (`app/shared/logging/`), `ValidationError` (`app/shared/errors/`).
- **No auth or multi-tenancy changes**: multi-tenancy is carried implicitly by the `tenantId` field on `CreateNoticeCommand`, which is forwarded into the `Notice` entity props and thence into `INoticeRepository.save()` — consistent with the port contract.
- **Test tier**: Unit (`yarn vitest run`). No PGlite or real DB needed.
