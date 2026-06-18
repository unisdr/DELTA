## ADDED Requirements

### Requirement: CreateNoticeUseCase executes successfully and returns a NoticeDto

`CreateNoticeUseCase.execute(command)` SHALL accept a `CreateNoticeCommand` containing
`tenantId`, `titleJson`, `bodyJson`, and `isPublished`. It MUST construct a `Notice`
entity via `Notice.create()`, persist it via `INoticeRepository.save()`, and return a
`NoticeDto` whose fields map exactly from the saved `Notice` entity, with all `Date`
values serialised as ISO 8601 strings.

#### Scenario: Happy path — unpublished notice

- **GIVEN** a valid `CreateNoticeCommand` with `isPublished: false` and `bodyJson: null`
- **WHEN** `CreateNoticeUseCase.execute(command)` is called
- **THEN** `INoticeRepository.save` SHALL be called exactly once with a `Notice` whose
  `tenantId`, `titleJson`, `bodyJson`, and `isPublished` match the command
- **AND** `publishedAt` on the saved entity SHALL be `null`
- **AND** `audience` SHALL be `"private"`
- **AND** the returned `NoticeDto.id` SHALL be a non-empty string
- **AND** `NoticeDto.isPublished` SHALL be `false`
- **AND** `NoticeDto.publishedAt` SHALL be `null`
- **AND** `NoticeDto.createdAt` and `NoticeDto.updatedAt` SHALL be valid ISO 8601 strings

#### Scenario: Happy path — published notice

- **GIVEN** a valid `CreateNoticeCommand` with `isPublished: true` and a non-empty `titleJson`
- **WHEN** `CreateNoticeUseCase.execute(command)` is called
- **THEN** `INoticeRepository.save` SHALL be called exactly once
- **AND** the returned `NoticeDto.isPublished` SHALL be `true`
- **AND** `NoticeDto.publishedAt` SHALL be a non-null ISO 8601 string

#### Scenario: Logger receives an info event on success

- **GIVEN** a valid command
- **WHEN** `CreateNoticeUseCase.execute(command)` resolves successfully
- **THEN** the injected `ILogger.info` SHALL have been called at least once with a record
  that identifies the created notice (e.g. contains the notice id)

### Requirement: CreateNoticeUseCase propagates ValidationError from Notice.create()

When `Notice.create()` throws a `ValidationError`, `CreateNoticeUseCase.execute()` MUST
allow the error to propagate to the caller unmodified. The use-case MUST NOT catch or wrap
`ValidationError`.

#### Scenario: Empty titleJson causes ValidationError to propagate

- **GIVEN** a `CreateNoticeCommand` with `titleJson: {}` (no locale entries)
- **WHEN** `CreateNoticeUseCase.execute(command)` is called
- **THEN** the returned promise SHALL reject with an instance of `ValidationError`
- **AND** `INoticeRepository.save` SHALL NOT have been called

> **Note:** The invariant that `publishedAt` must be null when `isPublished` is false cannot
> be violated via `CreateNoticeCommand` — the use-case derives `publishedAt` internally
> (`null` when `isPublished` is false, `new Date()` when true) and never accepts it from
> the caller. `Notice.create()` enforces this invariant as a backstop. No test scenario
> is needed here; the invariant is covered by the entity's own test suite (Phase 4c).

#### Scenario: Whitespace-only titleJson causes ValidationError to propagate

- **GIVEN** a `CreateNoticeCommand` with `titleJson: { en: "   " }` (all whitespace)
- **WHEN** `CreateNoticeUseCase.execute(command)` is called
- **THEN** the returned promise SHALL reject with an instance of `ValidationError`
- **AND** `INoticeRepository.save` SHALL NOT have been called

### Requirement: CreateNoticeUseCase propagates repository errors

When `INoticeRepository.save()` rejects, `CreateNoticeUseCase.execute()` MUST allow the
error to propagate to the caller unmodified. The use-case MUST NOT swallow persistence errors.

#### Scenario: Repository save throws an error

- **GIVEN** a valid `CreateNoticeCommand`
- **AND** `INoticeRepository.save` is stubbed to reject with a generic `Error`
- **WHEN** `CreateNoticeUseCase.execute(command)` is called
- **THEN** the returned promise SHALL reject with the same error instance
- **AND** no additional error wrapping SHALL occur

### Requirement: NoticeDto shape is correct

`toNoticeDto(notice)` SHALL return a plain object implementing `NoticeDto` with the
following field mappings from a `Notice` entity:

| `NoticeDto` field | Source |
|---|---|
| `id` | `notice.id` |
| `tenantId` | `notice.tenantId` |
| `titleJson` | `notice.titleJson` |
| `bodyJson` | `notice.bodyJson` |
| `isPublished` | `notice.isPublished` |
| `publishedAt` | `notice.publishedAt?.toISOString() ?? null` |
| `audience` | `notice.audience` |
| `createdAt` | `notice.createdAt.toISOString()` |
| `updatedAt` | `notice.updatedAt.toISOString()` |

#### Scenario: toNoticeDto maps all fields correctly for a published notice

- **GIVEN** a `Notice` entity with all fields populated including a non-null `publishedAt`
- **WHEN** `toNoticeDto(notice)` is called
- **THEN** the returned object SHALL have `publishedAt` equal to
  `notice.publishedAt.toISOString()`
- **AND** `createdAt` SHALL equal `notice.createdAt.toISOString()`
- **AND** `updatedAt` SHALL equal `notice.updatedAt.toISOString()`
- **AND** `audience` SHALL equal `notice.audience`

#### Scenario: toNoticeDto maps publishedAt as null for an unpublished notice

- **GIVEN** a `Notice` entity with `isPublished: false` and `publishedAt: null`
- **WHEN** `toNoticeDto(notice)` is called
- **THEN** `publishedAt` in the returned `NoticeDto` SHALL be `null`

### Requirement: Concurrent callers to CreateNoticeUseCase receive independent results

When two callers invoke `CreateNoticeUseCase.execute()` simultaneously with valid commands
before either resolves, each call MUST produce an independently generated `Notice` with a
distinct `id`. The use-case MUST NOT share mutable state between invocations.

#### Scenario: Two concurrent executions produce distinct notice IDs

- **GIVEN** two concurrent calls to `CreateNoticeUseCase.execute()` with valid but
  independent commands, both initiated before either resolves
- **WHEN** both promises resolve
- **THEN** each returned `NoticeDto.id` SHALL be a distinct UUID
- **AND** `INoticeRepository.save` SHALL have been called exactly twice, once for each notice
