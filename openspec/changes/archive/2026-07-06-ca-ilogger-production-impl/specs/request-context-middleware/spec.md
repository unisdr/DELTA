## MODIFIED Requirements

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
