## ADDED Requirements

### Requirement: Fetch notice by ID within a tenant
`GetNoticeByIdUseCase.execute(query: GetNoticeByIdQuery)` SHALL retrieve the notice
identified by `query.id` that belongs to `query.tenantId` and return it as a `NoticeDto`.
The returned DTO MUST contain the full `LocaleMap` for `titleJson` and `bodyJson`; the
use case MUST NOT resolve or filter locale fields.

#### Scenario: Happy path — notice exists and belongs to the tenant
- **WHEN** `execute({ id: "abc", tenantId: "t1" })` is called
- **AND** `INoticeRepository.findById("abc", "t1")` resolves with a `Notice` whose
  `tenantId` equals `"t1"`
- **THEN** the use case MUST return a `NoticeDto` whose `id` equals `"abc"` and whose
  `tenantId` equals `"t1"`
- **AND** `toNoticeDto` MUST have been called with the resolved `Notice`
- **AND** `logger.info` MUST have been called exactly once with
  `{ msg: "notice.fetched", noticeId: "abc", tenantId: "t1" }`

### Requirement: Throw NoticeNotFoundError when notice is absent
`GetNoticeByIdUseCase.execute` SHALL throw `NoticeNotFoundError` when
`INoticeRepository.findById` throws a `NotFoundError`.

#### Scenario: Repository reports notice not found
- **WHEN** `execute({ id: "missing", tenantId: "t1" })` is called
- **AND** `INoticeRepository.findById("missing", "t1")` throws a `NotFoundError`
- **THEN** the use case MUST throw `NoticeNotFoundError`
- **AND** `logger.info` MUST NOT have been called
- **AND** the thrown error MUST be an instance of `NotFoundError`

### Requirement: Tenant isolation — cross-tenant notice is not exposed
`GetNoticeByIdUseCase.execute` SHALL throw `NoticeNotFoundError` when the `Notice`
returned by the repository has a `tenantId` that does not equal `query.tenantId`.
The error thrown MUST be indistinguishable from the not-found case to prevent
information leakage.

#### Scenario: Repository returns a notice belonging to a different tenant
- **WHEN** `execute({ id: "abc", tenantId: "t1" })` is called
- **AND** `INoticeRepository.findById("abc", "t1")` resolves with a `Notice` whose
  `tenantId` equals `"t2"` (a different tenant)
- **THEN** the use case MUST throw `NoticeNotFoundError`
- **AND** the thrown error MUST be an instance of `NotFoundError`
- **AND** `logger.info` MUST NOT have been called

### Requirement: Success log emitted on fetch
`GetNoticeByIdUseCase.execute` SHALL emit a structured log event on every successful
fetch. Log events MUST NOT be emitted when the use case throws.

#### Scenario: Log event fields on success
- **WHEN** `execute({ id: "abc", tenantId: "t1" })` succeeds
- **THEN** `logger.info` MUST be called with an object containing
  `msg: "notice.fetched"`, `noticeId: "abc"`, and `tenantId: "t1"`
- **AND** `logger.info` MUST be called exactly once

#### Scenario: No log event on NoticeNotFoundError
- **WHEN** `execute({ id: "missing", tenantId: "t1" })` throws `NoticeNotFoundError`
- **THEN** `logger.info` MUST NOT have been called with `msg: "notice.fetched"`

### Requirement: Non-NotFoundError failures propagate unmodified
`GetNoticeByIdUseCase.execute` MUST NOT catch or wrap errors that are not `NotFoundError`.
Any rejection from `INoticeRepository.findById` that is not a `NotFoundError` MUST
propagate to the caller unchanged.

#### Scenario: Repository throws an unexpected error
- **WHEN** `execute({ id: "abc", tenantId: "t1" })` is called
- **AND** `INoticeRepository.findById` rejects with a plain `Error("DB unavailable")`
- **THEN** the promise returned by `execute` MUST reject with the same `Error` instance
- **AND** `logger.info` MUST NOT have been called

### Requirement: Concurrent calls for different IDs are independent
Two simultaneous `execute` calls for different notice IDs MUST each produce their own
correct result without interference.

#### Scenario: Two concurrent fetches for different IDs
- **WHEN** `execute({ id: "a", tenantId: "t1" })` and
  `execute({ id: "b", tenantId: "t1" })` are called concurrently (before either resolves)
- **AND** `findById("a", "t1")` resolves with `noticeA` and
  `findById("b", "t1")` resolves with `noticeB`
- **THEN** the first promise MUST resolve with `toNoticeDto(noticeA)`
- **AND** the second promise MUST resolve with `toNoticeDto(noticeB)`
- **AND** `findById` MUST have been called exactly twice (once per ID)
- **AND** `logger.info` MUST have been called exactly twice

### Requirement: GetNoticeByIdQuery has no locale field
`GetNoticeByIdQuery` MUST contain only `id: string` and `tenantId: string`. It MUST NOT
include a `locale` field or any field that implies locale resolution by the use case.

#### Scenario: Query shape has no locale field
- **WHEN** the TypeScript type `GetNoticeByIdQuery` is inspected
- **THEN** it MUST NOT declare a `locale` property
- **AND** it MUST declare `id: string` and `tenantId: string`
