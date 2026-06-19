## ADDED Requirements

### Requirement: ListNoticesUseCase returns a mapped list of NoticeDto for a tenant

`ListNoticesUseCase.execute(query: ListNoticesQuery)` SHALL call
`INoticeRepository.findAll(query.tenantId, { page: query.page, pageSize: query.pageSize })`
and map every returned `Notice` entity to a `NoticeDto` using the existing `toNoticeDto()`
function. The function MUST NOT define its own field mapping. The returned `Promise` MUST
resolve to `NoticeDto[]`.

#### Scenario: Repository returns a non-empty list

- **WHEN** `findAll` resolves with an array of two `Notice` entities for the given tenant
- **THEN** `execute()` resolves with an array of two `NoticeDto` objects
- **THEN** each `NoticeDto.id` matches the corresponding `Notice.id`
- **THEN** each `NoticeDto.tenantId` matches `query.tenantId`
- **THEN** each `NoticeDto.titleJson` is the full `LocaleMap` from the entity (all locale keys preserved)
- **THEN** each `NoticeDto.createdAt` is an ISO 8601 string

#### Scenario: Pagination parameters are forwarded to the repository

- **WHEN** `execute()` is called with `{ tenantId: "t1", page: 2, pageSize: 10 }`
- **THEN** `INoticeRepository.findAll` MUST be called exactly once with arguments `("t1", { page: 2, pageSize: 10 })`

---

### Requirement: ListNoticesUseCase returns an empty array when the tenant has no notices

When `INoticeRepository.findAll()` returns an empty array, `ListNoticesUseCase.execute()`
SHALL resolve with an empty array `[]`. It MUST NOT throw, reject, or treat zero results
as an error condition.

#### Scenario: Repository returns zero results

- **WHEN** `findAll` resolves with `[]` for the given tenant
- **THEN** `execute()` resolves with `[]`
- **THEN** no error is thrown or rejection issued

---

### Requirement: ListNoticesUseCase scopes the repository call to the requesting tenant

`ListNoticesUseCase.execute()` MUST pass `query.tenantId` as the first argument to
`INoticeRepository.findAll()`. It MUST NOT omit the tenant argument or substitute a
different tenant identifier. This is the multi-tenancy enforcement boundary for the
list operation.

#### Scenario: Tenant isolation is enforced

- **WHEN** `execute()` is called with `tenantId: "tenant-A"`
- **THEN** `findAll` is called with `"tenant-A"` as the first argument
- **THEN** notices belonging to any other tenant are never included in the result

---

### Requirement: ListNoticesUseCase preserves the full LocaleMap in NoticeDto

`ListNoticesUseCase.execute()` MUST return `NoticeDto` objects with `titleJson` and
`bodyJson` as the complete `LocaleMap` from each `Notice` entity. It MUST NOT extract
a single locale string, strip keys, or transform the map in any way. Locale-level string
resolution is a presentation-layer concern.

#### Scenario: Notice with multiple locale entries

- **WHEN** a `Notice` has `titleJson: { en: "Title", fr: "Titre" }`
- **THEN** the returned `NoticeDto.titleJson` is `{ en: "Title", fr: "Titre" }` (both keys present)
- **THEN** the use case does NOT strip any key or reduce the map to a single string

#### Scenario: Notice with a single locale entry

- **WHEN** a `Notice` has `titleJson: { en: "English Only" }`
- **THEN** the returned `NoticeDto.titleJson` is `{ en: "English Only" }` (map is unchanged)
- **THEN** the use case does NOT throw a `ValidationError` or any other error

---

### Requirement: ListNoticesUseCase emits a structured log event on success

After `findAll` resolves, `ListNoticesUseCase` SHALL call `logger.info()` exactly once
with a record that includes the `msg`, `tenantId`, and `count` fields.
The `count` MUST equal the number of `Notice` entities returned by the repository.
Note: `locale` is intentionally absent — see design.md Decision 1. The use case does
not perform locale resolution and carrying `locale` in the log record would create a
false contract implying otherwise.

#### Scenario: Successful list of two notices

- **WHEN** `findAll` returns two notices for `tenantId: "t1"`
- **THEN** `logger.info` is called once
- **THEN** the log record contains `{ msg: "notices.listed", tenantId: "t1", count: 2 }`

#### Scenario: Successful list with zero notices

- **WHEN** `findAll` returns an empty array for `tenantId: "t1"`
- **THEN** `logger.info` is called once
- **THEN** the log record contains `{ msg: "notices.listed", tenantId: "t1", count: 0 }`

---

### Requirement: ListNoticesUseCase propagates repository errors unmodified

If `INoticeRepository.findAll()` rejects, `ListNoticesUseCase.execute()` MUST allow
the rejection to propagate to the caller without wrapping, swallowing, or re-throwing
as a different error type. The caller is responsible for handling infrastructure errors.

#### Scenario: Repository throws a connection error

- **WHEN** `findAll` rejects with `new Error("DB connection lost")`
- **THEN** `execute()` rejects with the same error instance
- **THEN** `logger.info` is NOT called

---

### Requirement: Concurrent ListNoticesUseCase executions are independent

Two simultaneous calls to `ListNoticesUseCase.execute()` for different tenants MUST
each complete independently. The result of one call MUST NOT affect the result of the
other. Each call MUST invoke `findAll` exactly once with its own `tenantId`.

#### Scenario: Two concurrent executions for different tenants

- **WHEN** `execute({ tenantId: "tenant-A", page: 1, pageSize: 10 })` and
  `execute({ tenantId: "tenant-B", page: 1, pageSize: 10 })` are called
  simultaneously (via `Promise.all`)
- **THEN** both calls resolve independently
- **THEN** `findAll` is called exactly twice in total
- **THEN** the first call's result contains only notices for `"tenant-A"`
- **THEN** the second call's result contains only notices for `"tenant-B"`
