# request-context-middleware Specification

## Purpose
Defines the contract for `requestContextMiddleware`
(`app/middleware/requestContext.server.ts`), the root-level middleware that opens the
per-request `RequestContextStore` (see `request-context-store`) for every request, seeds it
with a freshly generated `traceId`, and resolves `tenantId`/`userId` from the request's
session before any route loader or action executes. It is exported from `app/root.tsx`'s
`middleware` array so that, because `root` is the ancestor of every route in this flat-routes
application, it runs for every request without any per-route opt-in.

## Requirements
### Requirement: requestContextMiddleware seeds traceId for every request

`requestContextMiddleware` (`app/middleware/requestContext.server.ts`) SHALL open exactly one
`withRequestContext` scope per HTTP request, seeded with a freshly generated `traceId`, before
any route loader or action in the matched route tree executes. It MUST be exported from
`app/root.tsx`'s `middleware` array.

#### Scenario: traceId is available inside a loader

- **WHEN** a request is handled by the React Router route tree with
  `requestContextMiddleware` registered as root middleware
- **AND** a nested route loader calls `getRequestContext()` during its execution
- **THEN** the returned store MUST have a `traceId` that is a non-empty string
- **AND** that same `traceId` value MUST be visible to every loader/action matched for that
  single request (root and all nested routes share one store)

#### Scenario: each request receives a distinct traceId

- **WHEN** two separate requests are each handled by the route tree with
  `requestContextMiddleware` registered
- **THEN** the `traceId` observed inside the first request's scope MUST differ from the
  `traceId` observed inside the second request's scope

### Requirement: requestContextMiddleware resolves tenantId and userId best-effort

`requestContextMiddleware` SHALL resolve `tenantId` (via `getCountryAccountsIdFromSession`) and
`userId` (via `getUserFromSession`) from the request's session cookie and write them onto the
active `RequestContextStore` before calling `next()`, without throwing if session resolution
fails or the request is unauthenticated. When either lookup's settled `Promise` is rejected,
the middleware SHALL log that rejection via `getPinoLogger().error(...)`
(`app/infrastructure/logging/PinoLogger.server.ts`) rather than via `console.error`, passing the
rejection reason as structured data.

#### Scenario: authenticated request with a selected tenant

- **WHEN** a request carries a valid session cookie for an authenticated user who has selected a
  country account
- **THEN** `getRequestContext().userId` MUST equal that user's id
- **AND** `getRequestContext().tenantId` MUST equal that session's `countryAccountsId`
- **AND** these values MUST already be set by the time any nested loader begins executing (i.e.
  before `next()` is called)

#### Scenario: unauthenticated request

- **WHEN** a request carries no valid session cookie
- **THEN** `getRequestContext().userId` MUST be `null`
- **AND** `getRequestContext().tenantId` MUST be `null`
- **AND** the request MUST still be handled normally (no thrown error, no non-2xx status
  introduced solely by this resolution)

#### Scenario: session resolution failure does not fail the request

- **WHEN** `getUserFromSession` or `getCountryAccountsIdFromSession` rejects or throws during
  middleware execution (e.g. a transient DB error)
- **THEN** the middleware MUST NOT propagate that failure to `next()` or to the eventual
  `Response`
- **AND** the affected field(s) (`userId` and/or `tenantId`) MUST fall back to `null`
- **AND** the request MUST continue to be handled by the matched route's own loader/action as if
  the affected field were simply unresolved

#### Scenario: getUserFromSession rejection is logged via getPinoLogger, not console.error

- **WHEN** `getUserFromSession` rejects during middleware execution
- **THEN** `getPinoLogger().error(...)` MUST be called with data describing the failure
  (including the rejection reason)
- **AND** `console.error` MUST NOT be called for this failure

#### Scenario: getCountryAccountsIdFromSession rejection is logged via getPinoLogger, not console.error

- **WHEN** `getCountryAccountsIdFromSession` rejects during middleware execution
- **THEN** `getPinoLogger().error(...)` MUST be called with data describing the failure
  (including the rejection reason)
- **AND** `console.error` MUST NOT be called for this failure

### Requirement: requestContextMiddleware does not alter existing route behaviour

Wiring `requestContextMiddleware` into `app/root.tsx` SHALL NOT change the observable behaviour,
response shape, or status code of any existing route that does not itself read from
`RequestContextStore`.

#### Scenario: an existing, unrelated route is unaffected

- **WHEN** an existing route with no knowledge of `RequestContextStore` (e.g. a static content
  route or an already-shipped feature route) is requested before and after
  `requestContextMiddleware` is wired into `root.tsx`
- **THEN** the route's response body, status code, and headers (other than headers newly and
  intentionally added by this change, if any) MUST be identical
- **AND** the route's own loader/action code requires no modification to continue functioning

#### Scenario: root.tsx exports the middleware for every route

- **WHEN** `app/root.tsx` is loaded
- **THEN** its exported `middleware` array MUST include `requestContextMiddleware` by reference
- **AND** because `root` is the ancestor of every route in this flat-routes application, this
  guarantees the middleware runs for every request without any per-route opt-in
