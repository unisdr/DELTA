## Context

`getUserFromSession()` in `app/utils/session.ts` performs two database operations on every
invocation: a `sessionTable` query (with `user` join via Drizzle's relational API) and an
`UPDATE sessionTable SET lastActiveAt = now()`. In `authLoaderWithPerm` — the primary auth
wrapper — this function is called twice per request: once in `requireUser` (line 283) and
again in `getUserRoleFromSession` (line 284). React Router v7 runs matched route loaders
concurrently via `Promise.all`, so a route with a layout parent can trigger even more parallel
session reads.

Node.js 18+ ships `AsyncLocalStorage` in the standard library (`node:async_hooks`). It
provides a request-scoped store that propagates through the async call graph without requiring
callers to thread a context argument through every function signature. This is the minimal,
zero-dependency mechanism for per-request memoization in an Express + React Router v7 stack.

The `requestContext.server.ts` file is intentionally minimal at this stage. ADR-004 (structured
request logging) will extend the same store with a `traceId` field. The design must leave that
extension point open without coupling this change to logging concerns.

## Goals / Non-Goals

**Goals:**

- Create `app/utils/requestContext.server.ts` with:
  - `RequestContextStore` type — the per-request data bag (initially: `sessionCache` only)
  - `als` — the `AsyncLocalStorage<RequestContextStore>` singleton (unexported; internal)
  - `withRequestContext(fn)` — creates a fresh store and runs `fn` inside it
  - `getRequestContext()` — returns the current store, or `undefined` if no context is active
- Modify `getUserFromSession()` in `app/utils/session.ts` to:
  - Call `getRequestContext()` at the top of the function
  - If a context exists and `context.sessionCache !== undefined`, return `context.sessionCache`
    immediately (no DB call)
  - If no context or `context.sessionCache === undefined`, run the existing DB path, then store
    the result in `context.sessionCache` before returning
- Prove the memoization contract with unit tests: within one `withRequestContext()` scope, the
  underlying Drizzle query function is called exactly once regardless of how many times
  `getUserFromSession()` is called

**Non-Goals:**

- Wiring `withRequestContext()` into Express middleware or React Router loaders (a follow-on
  task described in ADR-004; left to a separate change)
- Adding `traceId` or any other field to the store (ADR-004 scope)
- Caching `getUserRoleFromSession()` or any other session helper (only `getUserFromSession`
  is memoized in this change)
- Changing the public API or return type of `getUserFromSession()`
- Replacing the cookie read from `sessionCookie().getSession(...)` — only the DB query is
  cached, not the cookie parsing

## Decisions

### Decision 1: `als.run({}, fn)` — fresh store per call, not `enterWith`

**Choice:** `withRequestContext(fn)` calls `als.run({ sessionCache: undefined }, fn)`.

**Alternative rejected:** `als.enterWith({})` mutates the current async context in-place
rather than creating a child scope. If called from a shared top-level context (e.g. a test
that reuses an async chain), stores from one call would leak into the next. `als.run()` creates
an isolated child context — stores cannot bleed between requests or between test cases.

**Rationale:** Correctness and isolation are non-negotiable for a security-sensitive session
cache. `als.run()` is the idiomatic Node.js pattern for per-request stores.

### Decision 2: `sessionCache` type is `UserSession | null | undefined`

**Choice:**
```ts
type RequestContextStore = {
  sessionCache: UserSession | null | undefined;
};
```
- `undefined` — initial state; no lookup has been performed yet
- `null` — lookup was performed; the user has no valid session (unauthenticated or timed out)
- `UserSession` — lookup was performed; valid session found

**Alternative rejected:** Using only `UserSession | undefined` and treating `undefined` as
"not fetched yet". This conflates "not fetched" with "fetched and unauthenticated", causing
`getUserFromSession()` to re-query on every unauthenticated call. The three-state design
ensures exactly one DB call regardless of session validity.

**Rationale:** Unauthenticated requests are a common case (login page, public routes). One DB
call per request for unauthenticated users is correct; repeating it is waste.

### Decision 3: Fallback when no context is active

**Choice:** If `getRequestContext()` returns `undefined` (i.e. no `withRequestContext()` scope
is active), `getUserFromSession()` falls back to its existing DB path unchanged — it does not
throw and does not attempt to set a cache.

**Rationale:** Backwards compatibility. Tests that call `getUserFromSession()` directly without
a `withRequestContext()` wrapper (including all existing tests) continue to work without
modification. The memoization is strictly additive.

### Decision 4: `requestContext.server.ts` — `.server.ts` suffix, no client bundle

**Choice:** The file is named with the `.server.ts` suffix per project convention.

**Rationale:** `AsyncLocalStorage` is a Node.js API absent from browser environments. The
`.server.ts` suffix prevents React Router from bundling this module into the client chunk.
This is consistent with `session.ts` (already server-only despite not using the suffix because
it imports `react-router`'s server-side storage API).

### Decision 5: `getRequestContext()` returns `RequestContextStore | undefined`

**Choice:** Expose `getRequestContext()` as a public export from `requestContext.server.ts`
returning the live store reference (not a snapshot). Callers may mutate the store directly
(e.g. `context.sessionCache = result`).

**Alternative considered:** A `setSessionCache(value)` setter. Rejected as over-engineering
for the current scope. A direct mutable reference is simpler and works correctly because
`als.run()` ensures each request has its own isolated store object.

**TypeScript types introduced:**

```ts
// app/utils/requestContext.server.ts

export type RequestContextStore = {
  /** Cached result of getUserFromSession(). undefined = not yet fetched. */
  sessionCache: UserSession | null | undefined;
};

// withRequestContext: <T>(fn: () => Promise<T>) => Promise<T>
export function withRequestContext<T>(fn: () => Promise<T>): Promise<T>

// getRequestContext: () => RequestContextStore | undefined
export function getRequestContext(): RequestContextStore | undefined
```

`UserSession` is imported from `~/utils/session` in `requestContext.server.ts`. This creates a
dependency `requestContext.server.ts` → `session.ts`. Since `session.ts` will import
`getRequestContext` from `requestContext.server.ts`, there is a **circular dependency risk**.

**Circular dependency resolution (Decision 5a):** Extract the `UserSession` type import into
`requestContext.server.ts` using TypeScript's `import type` — this is a type-only import that
the bundler erases at runtime, so it does not introduce a runtime circular module graph. The
runtime import graph is: `session.ts` → (runtime) `requestContext.server.ts`; no cycle.

Alternatively, define `RequestContextStore.sessionCache` as `unknown` and add a type assertion
at the call site in `session.ts`. Rejected — it weakens type safety.

### Decision 6: Test approach — `vi.mock("~/db.server")` with a Vitest spy

**Choice:** Unit tests in `tests/unit/utils/session.test.ts` mock `~/db.server` (the Drizzle
`dr` instance) using `vi.mock` so that the query chain returns a controlled `sessionData`
object. The test asserts that `dr.query.sessionTable.findFirst` is called exactly once when
`getUserFromSession()` is called twice inside the same `withRequestContext()` scope.

**Why no PGlite:** The memoization guarantee is a pure in-process behaviour (AsyncLocalStorage
store read/write). PGlite adds a real query layer that would make it harder to assert call
counts precisely. The proposal's test tier is explicitly "Unit".

**Rationale:** `vi.mock` + `vi.fn()` with `mockResolvedValue` is the minimal, fastest approach
that directly tests the invariant: exactly one DB call per request scope.

## Risks / Trade-offs

**[Risk] `withRequestContext()` not yet wired into Express / React Router loaders**
The memoization is silent if `withRequestContext()` is never called. Until ADR-004 wires it
into the middleware stack, real requests do not benefit from the cache.
→ Mitigation: This is by design and is called out in the roadmap (ADR-004 scope). The unit
test proves the contract. The fallback (no context = DB path) ensures correctness.

**[Risk] `lastActiveAt` update runs once per request (not once per session call)**
The `UPDATE sessionTable SET lastActiveAt = now()` inside `getUserFromSession()` is part of the
first (and only) DB path. Subsequent calls return the cached `UserSession` object, which
contains the `lastActiveAt` value from the first read. This is correct — activity is tracked at
the request boundary, not the function-call boundary.
→ Mitigation: No action needed. The behaviour is intentional and matches the session activity
timeout semantics (minutes of inactivity, not function call frequency).

**[Risk] Test isolation: `AsyncLocalStorage` and Vitest worker threads**
Vitest by default runs tests in the same worker thread sequentially within a file. If tests
share an async context unexpectedly, stores from one test could leak into the next.
→ Mitigation: Each test that exercises `withRequestContext()` calls it explicitly, creating a
new isolated scope. Tests that verify the fallback path do not call `withRequestContext()` at
all, so the store is guaranteed absent.

**[Risk] Circular type import between `session.ts` and `requestContext.server.ts`**
`session.ts` imports `getRequestContext` (runtime) from `requestContext.server.ts`.
`requestContext.server.ts` imports `UserSession` (type only) from `session.ts`.
→ Mitigation: Use `import type { UserSession }` in `requestContext.server.ts`. TypeScript's
type-only imports are erased at compile time; the runtime module graph has no cycle.

## Migration Plan

1. Create `app/utils/requestContext.server.ts` (no callers yet; zero risk).
2. Modify `getUserFromSession()` in `app/utils/session.ts` to call `getRequestContext()` and
   apply the three-state cache logic.
3. Write unit tests confirming memoization within scope and fallback without scope.
4. All 7 quality gates pass; `yarn test:run2` has 3 pre-existing failures unrelated to this
   change (confirmed via baseline comparison on the base branch before implementation).
5. Wire `withRequestContext()` into Express middleware in a follow-on change (ADR-004).

**Rollback:** `requestContext.server.ts` can be deleted and the three lines added to
`getUserFromSession()` reverted with zero schema, URL, or data impact.

## Open Questions

- **Q1:** Should `withRequestContext()` accept a `Partial<RequestContextStore>` initial value
  so callers can pre-seed fields (e.g. a `traceId` extracted from request headers before the
  store is created)? Current decision: no — keep the initial store as `{ sessionCache: undefined }`
  to minimise surface area. ADR-004 will revisit when adding `traceId`.
- **Q2:** Should `getUserFromSession()` store a copy of `UserSession` or the live object
  reference? Current decision: live reference — `UserSession` contains only DB-derived data
  with no mutable state; copying adds complexity for no benefit.
