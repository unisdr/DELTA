## ADDED Requirements

### Requirement: Notices list loader resolves tenant from request context

The `loader` exported from `app/routes/$lang+/_authenticated+/notices+/_index.tsx` SHALL
resolve the current tenant by reading `getRequestContext()?.tenantId`. When that value is
absent (`undefined` or `null`), the loader SHALL fall back to
`getCountryAccountsIdFromSession(request)`. When neither source yields a tenant id, the loader
MUST throw a redirect to `/${lang}/user/select-instance`, where `${lang}` is the current
route's `params.lang`.

#### Scenario: Request context already has a tenantId
- **WHEN** the list loader runs and `getRequestContext()` returns a store with
  `tenantId: "tenant-A"`
- **THEN** `ListNoticesUseCase.execute` MUST be called with `tenantId: "tenant-A"`
- **AND** `getCountryAccountsIdFromSession` MUST NOT be called

#### Scenario: Request context is absent, session has a tenant
- **WHEN** the list loader runs with no active request-context store (e.g. the loader is
  invoked directly in a test, bypassing `root.tsx` middleware)
- **AND** `getCountryAccountsIdFromSession(request)` resolves to `"tenant-B"`
- **THEN** `ListNoticesUseCase.execute` MUST be called with `tenantId: "tenant-B"`

#### Scenario: No tenant available from either source
- **WHEN** the list loader runs with no active request-context store
- **AND** `getCountryAccountsIdFromSession(request)` resolves to `null`
- **THEN** the loader MUST throw a redirect Response to `/${lang}/user/select-instance`
- **AND** `ListNoticesUseCase.execute` MUST NOT be called

---

### Requirement: Notices list loader reads pagination from the URL query string with safe defaults

The list loader SHALL parse `page` and `pageSize` from the request URL's query string. When
`page` is absent or not a positive integer, it MUST default to `1`. When `pageSize` is absent
or not a positive integer, it MUST default to `20`. `pageSize` MUST be clamped to a maximum of
`100` regardless of the requested value.

#### Scenario: No pagination query params supplied
- **WHEN** the request URL has no `page` or `pageSize` query parameter
- **THEN** `ListNoticesUseCase.execute` MUST be called with `page: 1, pageSize: 20`

#### Scenario: Valid pagination query params supplied
- **WHEN** the request URL is `?page=3&pageSize=50`
- **THEN** `ListNoticesUseCase.execute` MUST be called with `page: 3, pageSize: 50`

#### Scenario: Malformed pagination query params
- **WHEN** the request URL is `?page=abc&pageSize=xyz`
- **THEN** `ListNoticesUseCase.execute` MUST be called with `page: 1, pageSize: 20`

#### Scenario: pageSize exceeds the maximum
- **WHEN** the request URL is `?pageSize=500`
- **THEN** `ListNoticesUseCase.execute` MUST be called with `pageSize: 100`

---

### Requirement: Notices list loader returns plain data on success

When `ListNoticesUseCase.execute()` resolves, the list loader SHALL return the resolved
`NoticeDto[]` value directly. It MUST NOT wrap the result in a `{ success: true, data }`
envelope or any other wrapper object.

#### Scenario: Successful fetch of notices
- **WHEN** `ListNoticesUseCase.execute()` resolves with an array of two `NoticeDto` objects
- **THEN** the loader's return value MUST be that same array of two `NoticeDto` objects
- **AND** the return value MUST NOT have a `success` property

---

### Requirement: Notices list loader throws a structured error response for DomainError

The list loader SHALL throw `Response.json(errorResponse, { status: err.statusHint })` when
`ListNoticesUseCase.execute()` rejects with an instance of `DomainError`, where `errorResponse`
follows the ADR-003 envelope: `{ success: false, error: { code, message, details?, traceId,
timestamp } }`. `details` MUST be present only when `err.context` is not `undefined`.
`traceId` MUST be `getRequestContext()?.traceId` when a request-context store is active, or a
freshly generated UUID otherwise.

#### Scenario: Use case throws NoticeNotFoundError-style DomainError
- **WHEN** `ListNoticesUseCase.execute()` rejects with a `DomainError` subclass whose
  `code` is `"NOT_FOUND"`, `statusHint` is `404`, and `context` is `undefined`
- **THEN** the loader MUST throw a `Response` with status `404`
- **AND** the thrown response body's `error.code` MUST equal `"NOT_FOUND"`
- **AND** the thrown response body MUST NOT have an `error.details` property

#### Scenario: Use case throws a DomainError with context
- **WHEN** `ListNoticesUseCase.execute()` rejects with a `DomainError` whose `context` is
  `{ entity: "Notice", id: "abc" }`
- **THEN** the thrown response body's `error.details` MUST equal `{ entity: "Notice", id: "abc" }`

#### Scenario: traceId is sourced from the active request context
- **WHEN** `ListNoticesUseCase.execute()` rejects with a `DomainError`
- **AND** `getRequestContext()` returns a store with `traceId: "trace-123"`
- **THEN** the thrown response body's `error.traceId` MUST equal `"trace-123"`

---

### Requirement: Notices list loader logs and rethrows non-DomainError failures

The list loader SHALL call `getPinoLogger().error(...)` and then rethrow the original error
unmodified when `ListNoticesUseCase.execute()` rejects with a value that is not an instance of
`DomainError`. The logged record MUST include the error and the request URL. The loader MUST
NOT construct an `ErrorResponse` envelope for this case — React Router's default error handling
produces the generic 500.

#### Scenario: Use case throws a plain Error
- **WHEN** `ListNoticesUseCase.execute()` rejects with `new Error("DB connection lost")`
- **THEN** `getPinoLogger().error` MUST be called exactly once
- **AND** the loader MUST rethrow the same `Error` instance
- **AND** the loader MUST NOT throw a `Response.json` envelope

---

### Requirement: Notice detail loader resolves a single notice by route param

The `loader` exported from `app/routes/$lang+/_authenticated+/notices+/$id.tsx` SHALL call
`GetNoticeByIdUseCase.execute({ id: params.id, tenantId })` using the same tenant-resolution
rule as the list loader (request context, falling back to session, redirecting to
select-instance when absent).

#### Scenario: Known id within the resolved tenant
- **WHEN** the detail loader runs with `params.id === "abc"` and a resolved `tenantId` of
  `"tenant-A"`
- **THEN** `GetNoticeByIdUseCase.execute` MUST be called with `{ id: "abc", tenantId: "tenant-A" }`

#### Scenario: Detail loader returns plain data on success
- **WHEN** `GetNoticeByIdUseCase.execute()` resolves with a `NoticeDto`
- **THEN** the loader's return value MUST be that same `NoticeDto`
- **AND** the return value MUST NOT have a `success` property

---

### Requirement: Notice detail loader throws a structured error response for an unknown id

The detail loader SHALL throw `Response.json(errorResponse, { status: 404 })` when
`GetNoticeByIdUseCase.execute()` rejects with `NoticeNotFoundError` (a `DomainError` subclass
with `statusHint: 404`), using the same ADR-003 envelope construction rule as the list loader.

#### Scenario: Unknown notice id
- **WHEN** `GetNoticeByIdUseCase.execute()` rejects with a `NoticeNotFoundError` for
  `id: "missing"`
- **THEN** the loader MUST throw a `Response` with status `404`
- **AND** the thrown response body's `error.code` MUST equal `"NOT_FOUND"`

#### Scenario: Non-DomainError failure in the detail loader
- **WHEN** `GetNoticeByIdUseCase.execute()` rejects with a plain `Error`
- **THEN** `getPinoLogger().error` MUST be called exactly once
- **AND** the loader MUST rethrow the same `Error` instance

---

### Requirement: Notices route files delegate rendering to PageProps components

Each notices route file's default export MUST call `useLoaderData()` exactly once and pass the
result as the `data` prop to a `PageProps<T>`-typed page component. Route files MUST NOT
contain business logic (locale resolution, pagination math, error-envelope construction) inline
in the component body, and MUST NOT exceed 60 lines.

#### Scenario: List route file structure
- **WHEN** `app/routes/$lang+/_authenticated+/notices+/_index.tsx` is inspected
- **THEN** its default export MUST call `useLoaderData()` and render a page component with
  `data={loaderData}`
- **AND** the file MUST be 60 lines or fewer

#### Scenario: Detail route file structure
- **WHEN** `app/routes/$lang+/_authenticated+/notices+/$id.tsx` is inspected
- **THEN** its default export MUST call `useLoaderData()` and render a page component with
  `data={loaderData}`
- **AND** the file MUST be 60 lines or fewer

---

### Requirement: Notices route files render inside MainContainer, consistent with the rest of the application

Each notices route file's default export SHALL wrap its page component in `MainContainer`
(`app/frontend/container.tsx`) with a `title` prop, matching the page-header/layout convention
used by every other page in the application.

#### Scenario: List route wraps its page component in MainContainer
- **WHEN** `app/routes/$lang+/_authenticated+/notices+/_index.tsx` is inspected
- **THEN** its default export MUST render `NoticeListPage` inside a `MainContainer` with a
  non-empty `title` prop

#### Scenario: Detail route wraps its page component in MainContainer
- **WHEN** `app/routes/$lang+/_authenticated+/notices+/$id.tsx` is inspected
- **THEN** its default export MUST render `NoticeDetailPage` inside a `MainContainer` with a
  non-empty `title` prop

---

### Requirement: Notices page components resolve one locale string per LocaleMap field

`NoticeListPage` and `NoticeDetailPage` SHALL resolve a single display string for each
`titleJson`/`bodyJson` `LocaleMap` field using `useViewContext().lang` as the lookup key,
falling back to the `"en"` key when the current language key is absent from the map, and
falling back to an empty string when neither key is present.

#### Scenario: Locale key present for current language
- **WHEN** `useViewContext().lang` is `"fr"` and a notice's `titleJson` is
  `{ en: "Title", fr: "Titre" }`
- **THEN** the rendered title text MUST be `"Titre"`

#### Scenario: Locale key absent for current language, English fallback used
- **WHEN** `useViewContext().lang` is `"ar"` and a notice's `titleJson` is `{ en: "Title" }`
- **THEN** the rendered title text MUST be `"Title"`

#### Scenario: Neither current language nor English present
- **WHEN** `useViewContext().lang` is `"ar"` and a notice's `titleJson` is `{ fr: "Titre" }`
- **THEN** the rendered title text MUST be an empty string
- **AND** no error MUST be thrown

---

### Requirement: NoticeListPage renders notices using PrimeReact's DataTable

`NoticeListPage` SHALL render the `NoticeDto[]` it receives via `PageProps<NoticeDto[]>` using
PrimeReact's `DataTable` component, with one row rendered per notice in the supplied array. Each
row MUST display the notice's resolved title (per the locale-resolution requirement above) and
its publication status derived from `isPublished`.

#### Scenario: List page renders one row per notice
- **WHEN** `NoticeListPage` receives a `data` array containing three `NoticeDto` objects
- **THEN** the rendered `DataTable` MUST contain exactly three data rows
- **AND** each row's rendered text MUST include that notice's resolved title string

#### Scenario: Published and unpublished notices show distinct status text
- **WHEN** `NoticeListPage` receives a `data` array containing one `NoticeDto` with
  `isPublished: true` and one with `isPublished: false`
- **THEN** the published notice's row MUST render a "Published" status label
- **AND** the unpublished notice's row MUST render a "Draft" status label

---

### Requirement: Each notice row links to its detail page

`NoticeListPage` SHALL render an action link on each row that navigates to that notice's detail
route (`/notices/:id`), so a user can reach `NoticeDetailPage` from the list.

#### Scenario: Row action links to the correct detail route
- **WHEN** `NoticeListPage` receives a `data` array containing a `NoticeDto` with `id: "abc"`
- **THEN** that row MUST render a link whose target is `/notices/abc`
