# session-memoization Specification

## Purpose
Specifies the caching behaviour of `getUserFromSession()` in `app/utils/session.ts` when
called within a `withRequestContext()` scope. The function MUST issue at most one Drizzle
`sessionTable.findFirst` query and one `lastActiveAt` UPDATE per request, regardless of how
many times it is called. Outside a `withRequestContext` scope the function falls back to the
pre-memoization behaviour — one DB round-trip per invocation — with no error thrown.
## Requirements
### Requirement: getUserFromSession hits the DB at most once per withRequestContext scope

`getUserFromSession(request)` in `app/utils/session.ts` SHALL consult the request context store
before executing a database query. Within a single `withRequestContext()` scope, the underlying
Drizzle query MUST be executed exactly once, regardless of how many times `getUserFromSession`
is called with the same or different `Request` objects. All subsequent calls within the same
scope MUST return the cached value without issuing a new database query.

#### Scenario: second call returns cached result without DB query

- **WHEN** `getUserFromSession(request)` is called inside a `withRequestContext` scope
- **AND** the first call executes the DB query and returns a `UserSession`
- **AND** `getUserFromSession(request)` is called a second time inside the same scope
- **THEN** the second call MUST return the same `UserSession` value
- **AND** the underlying Drizzle `sessionTable.findFirst` query function MUST have been called
  exactly once in total across both calls

#### Scenario: unauthenticated result is also cached (null path)

- **WHEN** `getUserFromSession(request)` is called inside a `withRequestContext` scope
- **AND** the first call finds no valid session (cookie absent, session row not found, or
  activity timeout exceeded) and returns `undefined`
- **AND** `getUserFromSession(request)` is called a second time inside the same scope
- **THEN** the second call MUST return `undefined` without executing a DB query
- **AND** the underlying Drizzle `sessionTable.findFirst` query function MUST have been called
  exactly once in total (for the first call only)

### Requirement: getUserFromSession falls back to DB when no context is active

`getUserFromSession(request)` SHALL behave identically to its pre-memoization implementation
when called outside of any `withRequestContext()` scope. No error MUST be thrown, and the DB
query MUST be executed normally.

#### Scenario: no context active — DB path executes as before

- **WHEN** `getUserFromSession(request)` is called without any enclosing `withRequestContext`
  scope
- **THEN** the function MUST execute the Drizzle `sessionTable.findFirst` query
- **AND** it MUST return the `UserSession` if the session exists and has not timed out
- **AND** it MUST return `undefined` if the session does not exist or has timed out
- **AND** no exception MUST be thrown due to the absence of a context store

#### Scenario: no context active — repeated calls each hit DB

- **WHEN** `getUserFromSession(request)` is called twice in succession without any
  `withRequestContext` scope
- **THEN** the Drizzle `sessionTable.findFirst` query MUST be called twice (once per invocation)
  because there is no cache to populate

### Requirement: lastActiveAt update runs exactly once per request scope

`getUserFromSession(request)` SHALL perform the `UPDATE sessionTable SET lastActiveAt = now()`
statement as part of the first (and only) DB path execution within a `withRequestContext` scope.
Subsequent memoized calls within the same scope MUST NOT trigger the update again.

#### Scenario: update runs once even when function is called multiple times

- **WHEN** `getUserFromSession(request)` is called twice inside a `withRequestContext` scope
- **AND** the first call finds a valid unexpired session
- **THEN** the `lastActiveAt` UPDATE statement MUST be executed exactly once across both calls
- **AND** the returned `UserSession.session.lastActiveAt` value on the second call MUST reflect
  the `lastActiveAt` value set by the first call's UPDATE

