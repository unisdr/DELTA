## 1. Write failing tests — requestContext store (Red)

- [x] 1.1 Create `tests/unit/utils/requestContext.test.ts`. Import `withRequestContext` and
      `getRequestContext` from `~/utils/requestContext.server` (file does not exist yet; import
      succeeds but calls will throw). Write a test asserting that `getRequestContext()` called
      inside a `withRequestContext` scope returns an object (not `undefined`) with
      `sessionCache === undefined`. Confirm the test fails (import error or assertion failure).
      Run: `yarn vitest run tests/unit/utils/requestContext.test.ts`

- [x] 1.2 In the same test file, add a test asserting that `getRequestContext()` called outside
      any `withRequestContext` scope returns `undefined`. Run the test file again — confirm this
      test also fails.

- [x] 1.3 In the same test file, add a test asserting that mutations made to the store inside
      one `withRequestContext` call are NOT visible inside a subsequent `withRequestContext` call
      (store isolation between sequential calls). Run the test file — confirm failure.

- [x] 1.4 In the same test file, add a test asserting that a mutation made to the store inside a
      `withRequestContext` scope IS visible on a subsequent `getRequestContext()` call within the
      same scope (mutation persistence within a single scope). Run the test file — confirm failure.

## 2. Write failing tests — session memoization (Red)

- [x] 2.1 Create `tests/unit/utils/session.test.ts`. Add a `vi.mock("~/db.server")` at the top
      of the file to intercept all Drizzle calls. Set up `dr.query.sessionTable.findFirst` as a
      `vi.fn()` that returns a mock session row (with a `user` property matching the `UserSession`
      shape). Also mock `dr.update(...).set(...).where(...)` (the `lastActiveAt` update) as a
      no-op. Write a test: call `getUserFromSession(request)` twice inside the same
      `withRequestContext` scope and assert that the mock `findFirst` was called exactly once.
      Confirm the test fails (import error because `requestContext.server.ts` does not exist yet,
      or assertion failure). Run: `yarn vitest run tests/unit/utils/session.test.ts`

- [x] 2.2 In the same test file, add a test asserting the unauthenticated cache path: configure
      `findFirst` to return `null` (no session found). Call `getUserFromSession(request)` twice
      inside a `withRequestContext` scope; assert both calls return `undefined` and `findFirst`
      was called exactly once. Run the test file — confirm failure.

- [x] 2.3 In the same test file, add a test asserting the fallback path (no context): call
      `getUserFromSession(request)` twice WITHOUT a `withRequestContext` scope; assert
      `findFirst` was called twice (no caching). Run the test file — confirm failure.

- [x] 2.4 In the same test file, add a test asserting that the `lastActiveAt` UPDATE is called
      exactly once even when `getUserFromSession` is called twice inside the same
      `withRequestContext` scope. Run the test file — confirm failure.

## 3. Implement requestContext.server.ts (Green)

- [x] 3.1 Create `app/utils/requestContext.server.ts`. Define and export:
  - `RequestContextStore` type: `{ sessionCache: UserSession | null | undefined }` using
    `import type { UserSession } from "~/utils/session"` (type-only import to avoid runtime
    circular dependency — see design.md Decision 5a).
  - `als` — `new AsyncLocalStorage<RequestContextStore>()` (unexported, module-private).
  - `withRequestContext<T>(fn: () => Promise<T>): Promise<T>` — calls
    `als.run({ sessionCache: undefined }, fn)`. Uses `als.run()` (NOT `als.enterWith()`).
  - `getRequestContext(): RequestContextStore | undefined` — calls `als.getStore()` and returns
    it (may be `undefined` if no `run()` scope is active).
  - Run: `yarn vitest run tests/unit/utils/requestContext.test.ts` — all 4 tests MUST pass.

## 4. Modify getUserFromSession (Green)

- [x] 4.1 In `app/utils/session.ts`, add an import for `getRequestContext` from
      `~/utils/requestContext.server`. Do NOT use a type-only import — this is a runtime import.

- [x] 4.2 In `getUserFromSession()`, insert the cache-check logic at the very start of the
      function body, BEFORE the cookie read. Logic:
  1. Call `const ctx = getRequestContext()`.
  2. If `ctx !== undefined && ctx.sessionCache !== undefined`, return `ctx.sessionCache ?? undefined`
     immediately. The `?? undefined` conversion is required because the cache stores `null` for
     the unauthenticated case but the function's return type is `Promise<UserSession | undefined>` —
     returning `null` directly would be a TypeScript type violation.
  3. Otherwise continue to the existing cookie + DB path.
  4. After the existing return points (both `undefined` returns and the final `return { user, sessionId, session }`)
     store the result: `if (ctx !== undefined) { ctx.sessionCache = <result> }` where `<result>`
     is either the `UserSession` object or `null` (for the unauthenticated path). Note: the
     function currently returns `undefined` for unauthenticated — store `null` in the context
     so that `undefined` can remain the sentinel for "not yet fetched".
  - Run: `yarn vitest run tests/unit/utils/session.test.ts` — all 4 tests MUST pass.
  - Run: `yarn vitest run tests/unit/utils/requestContext.test.ts` — must still pass.

## 5. Refactor and quality gates

- [x] 5.1 **Gate 1** — Run both test files:
  ```
  yarn vitest run tests/unit/utils/requestContext.test.ts
  yarn vitest run tests/unit/utils/session.test.ts
  ```
  All tests MUST be green.

- [x] 5.2 **Gate 2** — Run `yarn tsc`. Zero TypeScript errors. Pay special attention to:
  - `RequestContextStore` type is importable from `~/utils/requestContext.server`.
  - The `import type { UserSession }` in `requestContext.server.ts` resolves correctly (no
    circular runtime import error at compile time).
  - `getRequestContext()` return type is `RequestContextStore | undefined` (not `unknown`).
  - `getUserFromSession()` return type is unchanged: `Promise<UserSession | undefined>`.

- [x] 5.3 **Gate 3** — Run `yarn format:check`. If it fails, run `yarn format` then recheck.
      Confirm both new files (`requestContext.server.ts` and the test files) are Prettier-clean.

- [x] 5.4 **Gate 4** — Anti-pattern review. Open `.github/skills/anti-pattern-check/SKILL.md`
      and verify:
  - No `as any` cast introduced anywhere in `requestContext.server.ts` or the modified section
    of `session.ts`.
  - `als.run()` is used (not `als.enterWith()`).
  - No `authLoaderApiDocs` introduced (not applicable but confirm scan is clean).
  - No missing `await` on any Drizzle mutation. The existing `dr.update(...)` in
    `getUserFromSession()` must remain awaited.
  - The `sessionCache` store field uses the three-state type (`UserSession | null | undefined`)
    — not a two-state type that conflates "not fetched" with "unauthenticated".

- [x] 5.5 **Gate 5** — SOLID review. Invoke the `solid-reviewer` agent on
      `app/utils/requestContext.server.ts` and the modified `getUserFromSession()` function in
      `app/utils/session.ts`. Confirm:
  - Single Responsibility: `requestContext.server.ts` manages the store only; `session.ts`
    manages session logic only (the cache check is a lookup, not a store management concern).
  - Open/Closed: `RequestContextStore` type can be extended with new fields (e.g. `traceId`)
    without modifying `getUserFromSession()`.
  - No SOLID violations flagged.

- [x] 5.6 **Gate 6** — Documentation review. Confirm:
  - `requestContext.server.ts` has a module-level comment explaining WHY (request-scoped store
    for memoization + ADR-004 extension point), not just WHAT.
  - The `sessionCache` field has a JSDoc comment explaining the three-state semantics
    (`undefined` = not fetched, `null` = fetched + unauthenticated, `UserSession` = valid).
  - The cache-check block added to `getUserFromSession()` has an inline comment explaining WHY
    (avoid redundant DB reads per request, see ADR-004).
  - No comment merely restates the code.

- [x] 5.7 **Gate 7** — Project conventions review. Check `.github/copilot-instructions.md`:
  - `requestContext.server.ts` uses the `.server.ts` suffix (server-only, never client-bundled).
  - Imports use the `~/utils/...` path alias, not relative paths.
  - No direct `console.log` calls in production paths.
  - No new env vars introduced (none are needed).

## 6. Regression and archive

- [x] 6.1 **Regression gate** — Run `yarn test:run2` (full PGlite suite). MUST pass with no new
      failures. If any failures appear, confirm whether they are pre-existing by running the
      same suite on the base branch (`dev`) before attributing them to this change. Do not
      archive if new failures are introduced.

- [x] 6.2 Run `/opsx:archive` on branch `feature/ca-session-memoization` to archive this change
      before raising the PR.

- [x] 6.3 Raise a PR from `feature/ca-session-memoization` targeting `dev` with title:
      `Refactor: p1-14 — request-scoped session memoization via AsyncLocalStorage`.
