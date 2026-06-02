## Why

`getUserFromSession()` executes a full database round-trip (session table query + `lastActiveAt`
update) on every invocation. `authLoaderWithPerm` alone calls it twice per request — once via
`requireUser` and again via `getUserRoleFromSession` — and React Router v7's parallel loader
execution means nested routes can multiply this further. Introducing request-scoped memoization
via `AsyncLocalStorage` eliminates redundant DB reads within a single request without changing
any call-site signatures. This infrastructure is also required by ADR-004 (structured request
logging), which needs a `traceId` stored in the same per-request store.

## What Changes

- **New file** `app/utils/requestContext.server.ts` — provides `AsyncLocalStorage`-backed
  per-request store with a `withRequestContext()` wrapper function. The store holds a cached
  `UserSession | null | undefined` (`undefined` = not yet fetched, `null` = fetched and no
  session). Designed to be extended later with `traceId` and other per-request fields without
  touching the caller.
- **Modified file** `app/utils/session.ts` — `getUserFromSession()` checks the current request
  context (via `getRequestContext()`) before hitting the DB. On the first call within a
  `withRequestContext()` scope the DB path runs as today (including the `lastActiveAt` update)
  and the result is stored in the context. On subsequent calls within the same scope the cached
  value is returned immediately. If no context is active (e.g. during tests that call the
  function directly without a wrapper) the function falls back to the existing DB path so
  backwards compatibility is preserved.

## Capabilities

### New Capabilities

- `request-context-store`: An `AsyncLocalStorage`-backed per-request store that wraps a
  handler execution and makes a mutable request-scoped map available to any server-side code
  called within that execution.
- `session-memoization`: `getUserFromSession()` reads the DB at most once per request when
  called inside a `withRequestContext()` scope; all subsequent calls within the same scope
  return the cached result without a DB query.

### Modified Capabilities

<!-- No existing spec-level behaviour visible to route consumers changes. The function
     signature and return type of getUserFromSession() are unchanged. -->

## Impact

**Files changing:**

| File                                     | Reason                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `app/utils/requestContext.server.ts`     | New: `AsyncLocalStorage` store, `withRequestContext()`, `getRequestContext()` |
| `app/utils/session.ts`                   | Modify: `getUserFromSession()` checks context cache before DB               |
| `tests/unit/utils/session.test.ts`       | New: unit tests proving memoization and fallback behaviour                  |
| `tests/unit/utils/requestContext.test.ts`| New: unit tests for the `withRequestContext()` wrapper                      |

**DB migration required:** No.

**Test approach:** Unit tests (Vitest, `yarn test:run2`). No PGlite or real DB needed — the
Drizzle query inside `getUserFromSession()` is mocked via `vi.mock("~/db.server")` so tests
run purely in-process. One test calls `getUserFromSession()` twice inside the same
`withRequestContext()` scope and asserts the mock query function is called exactly once.

**Security / multi-tenancy implications:**

- The request context store holds a `UserSession` reference for the lifetime of one request.
  Because Node.js async contexts are isolated per async chain, there is no cross-request leakage
  risk as long as `withRequestContext()` creates a new store on every call (not a shared
  singleton). The implementation MUST call `als.run({}, ...)` — not `als.enterWith({})` — to
  ensure isolation.
- No impact on multi-tenancy scoping (`countryAccountsId` checks remain in each route's auth
  wrapper and are unaffected by this caching layer).
- The `lastActiveAt` update inside `getUserFromSession()` runs exactly once per request (on the
  first DB call). This is the correct behaviour and is unchanged.
