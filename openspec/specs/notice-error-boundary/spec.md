# notice-error-boundary Specification

## Purpose
TBD - created by archiving change ca-notices-route-adapter. Update Purpose after archive.
## Requirements

### Requirement: NoticeErrorBoundary renders the ADR-003 error envelope for a thrown Response

`NoticeErrorBoundary` (`app/domains/notices/presentation/NoticeErrorBoundary.tsx`) SHALL use
`useRouteError()` to obtain the current route error. When `isRouteErrorResponse(error)` is
`true` and `error.data` matches the ADR-003 `ErrorResponse` shape (`{ success: false, error:
{ code, message, traceId, timestamp } }`), the component SHALL render `error.data.error.message`
as a user-facing message and `error.data.error.traceId` as a visible, copyable string.

#### Scenario: DomainError-derived 404 response
- **WHEN** the nearest thrown error is a `Response` with status `404` and body
  `{ success: false, error: { code: "NOT_FOUND", message: "Notice not found", traceId: "trace-1", timestamp: "2026-07-02T00:00:00.000Z" } }`
- **THEN** `NoticeErrorBoundary` MUST render the text `"Notice not found"`
- **AND** `NoticeErrorBoundary` MUST render `"trace-1"` in a copyable element (e.g. a button or
  element with a copy-to-clipboard affordance)

#### Scenario: DomainError-derived response with field-level details
- **WHEN** the nearest thrown error's body includes `error.details: { entity: "Notice", id: "abc" }`
- **THEN** `NoticeErrorBoundary` MUST NOT throw or crash while rendering
- **AND** the primary rendered message MUST still be `error.message`, not the raw `details` object

---

### Requirement: NoticeErrorBoundary renders a generic fallback for non-Response errors

`NoticeErrorBoundary` SHALL render a generic, user-safe fallback message when
`isRouteErrorResponse(error)` is `false` (e.g. a thrown plain `Error` that never passed through
the loader's `DomainError` handling — a programmer error). It MUST NOT render `error.message` or
`error.stack` from a plain `Error` in this branch, to avoid leaking internal details to the
client per ADR-003 Rule 4.

#### Scenario: Unhandled plain Error reaches the boundary
- **WHEN** `useRouteError()` returns a plain `Error` instance (not a `Response`)
- **THEN** `NoticeErrorBoundary` MUST render a generic message
- **AND** `NoticeErrorBoundary` MUST NOT render the `Error`'s `.message` or `.stack` content

#### Scenario: No traceId available for a non-Response error
- **WHEN** `useRouteError()` returns a plain `Error` instance
- **THEN** `NoticeErrorBoundary` MUST NOT render a blank or `"undefined"` traceId string
- **AND** the component MUST either omit the traceId element entirely or render a clear
  "no reference available" state

---

### Requirement: Both notices route files export NoticeErrorBoundary as ErrorBoundary

Each notices route file SHALL export `NoticeErrorBoundary` as `ErrorBoundary`. This applies to
both `app/routes/$lang+/_authenticated+/notices+/_index.tsx` and
`app/routes/$lang+/_authenticated+/notices+/$id.tsx`, so that React Router associates it with
both routes independently.

#### Scenario: List route exports ErrorBoundary
- **WHEN** `app/routes/$lang+/_authenticated+/notices+/_index.tsx` is inspected
- **THEN** it MUST contain `export { NoticeErrorBoundary as ErrorBoundary }` (or an equivalent
  re-export of the same component under the name `ErrorBoundary`)

#### Scenario: Detail route exports ErrorBoundary
- **WHEN** `app/routes/$lang+/_authenticated+/notices+/$id.tsx` is inspected
- **THEN** it MUST contain `export { NoticeErrorBoundary as ErrorBoundary }` (or an equivalent
  re-export of the same component under the name `ErrorBoundary`)

#### Scenario: An error thrown by the detail loader does not affect the list route's boundary
- **WHEN** a user navigates directly to the detail route for an unknown id
- **THEN** only the detail route's `ErrorBoundary` renders
- **AND** the list route (if rendered elsewhere in the same navigation, e.g. a parent layout)
  is unaffected — this is React Router's per-route boundary isolation, exercised here via the
  Notices domain's two independent exports

---

### Requirement: The ErrorResponse type is shared between the loaders and the boundary

A single `ErrorResponse` TypeScript type SHALL be defined once and imported by both the notices
loaders (to construct thrown envelopes) and `NoticeErrorBoundary` (to parse them), rather than
each defining or inlining its own shape.

#### Scenario: Type-level consistency
- **WHEN** the notices loaders and `NoticeErrorBoundary` are inspected
- **THEN** both MUST import the same `ErrorResponse` type from a single shared module
- **AND** neither MUST declare an inline, duplicate type with the same shape
