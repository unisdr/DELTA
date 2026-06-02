# request-context-store Specification

## Purpose
TBD - created by archiving change p1-14-session-memoization. Update Purpose after archive.
## Requirements
### Requirement: withRequestContext creates an isolated per-call store

`withRequestContext(fn)` in `app/utils/requestContext.server.ts` SHALL create a fresh,
isolated `RequestContextStore` for each invocation and run `fn` inside that store's async
context. The store MUST NOT be shared between concurrent or sequential calls to
`withRequestContext`.

#### Scenario: fn receives its own isolated store

- **WHEN** `withRequestContext` is called with an async function `fn`
- **THEN** `getRequestContext()` called inside `fn` MUST return a `RequestContextStore` object
- **AND** that object MUST have `sessionCache` equal to `undefined` (initial state)
- **AND** the returned promise MUST resolve to the value returned by `fn`

#### Scenario: stores from separate withRequestContext calls do not bleed

- **WHEN** `withRequestContext` is called once and a mutation (`context.sessionCache = value`) is
  made inside that scope
- **AND** a second `withRequestContext` call is made sequentially afterwards
- **THEN** `getRequestContext()` inside the second call MUST return a `RequestContextStore` with
  `sessionCache === undefined` (the mutation from the first call MUST NOT be visible)

#### Scenario: no store active outside withRequestContext

- **WHEN** `getRequestContext()` is called outside of any `withRequestContext` scope (i.e. no
  active `AsyncLocalStorage` run context)
- **THEN** it MUST return `undefined`

### Requirement: getRequestContext returns live mutable store reference

`getRequestContext()` SHALL return the live `RequestContextStore` object for the current async
context so that callers can read and write fields on it directly.

#### Scenario: mutation persists within the same scope

- **WHEN** `getRequestContext()` is called inside a `withRequestContext` scope and the returned
  store is mutated (e.g. `context.sessionCache = someValue`)
- **AND** `getRequestContext()` is called again later in the same async chain
- **THEN** the second call MUST return the same store object with the mutated value intact

