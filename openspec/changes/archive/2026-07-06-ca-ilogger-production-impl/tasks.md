## 1. Setup

- [x] 1.1 Add `pino` as a runtime dependency: `yarn add pino`.
- [x] 1.2 Add `pino-pretty` as a dev dependency: `yarn add -D pino-pretty`.
- [x] 1.3 Create directory `app/infrastructure/logging/` (new — `PinoLogger.server.ts` lands
      here per design.md Decision 1).

## 2. PinoLogger — core delegation (TDD)

- [x] 2.1 Write failing test in `tests/unit/infrastructure/logging/PinoLogger.test.ts`
      asserting `PinoLogger.info(data)` invokes the underlying Pino instance's `info` method
      with `data` (construct `PinoLogger` with an injected Pino instance pointed at an
      in-memory writable stream per design.md Decision 6). Run
      `yarn vitest run tests/unit/infrastructure/logging/PinoLogger.test.ts` and confirm it
      fails (no `PinoLogger` yet).
- [x] 2.2 Implement `PinoLogger implements ILogger` in
      `app/infrastructure/logging/PinoLogger.server.ts` with `info`/`warn`/`error`/`debug`
      each delegating to the corresponding Pino method. Run the same test file and confirm it
      passes.
- [x] 2.3 Extend the test file with failing tests for `warn`, `error`, and `debug` delegation
      (mirroring 2.1). Run `yarn vitest run tests/unit/infrastructure/logging/PinoLogger.test.ts`
      — new tests must pass against the existing implementation with no further code changes
      (all four methods should already be symmetric).

## 3. PinoLogger — ADR-004 configuration

- [x] 3.1 Write a failing test asserting the module's base Pino instance is configured with
      `level: "info"` when `NODE_ENV=production`, and `level: "debug"` otherwise (set
      `process.env.NODE_ENV` per test case; restore it in `afterEach`).
- [x] 3.2 Implement the exact Pino config from design.md Decision 4 (`transport`, `timestamp`,
      `redact`, `level`) in `PinoLogger.server.ts`. Run
      `yarn vitest run tests/unit/infrastructure/logging/PinoLogger.test.ts` and confirm the
      level tests pass.
- [x] 3.3 Write a failing test asserting emitted output does NOT contain the literal secret
      value when logging `{ req: { headers: { authorization: "Bearer secret-value" } } }`
      (capture and parse the buffered stream output per design.md Decision 6). Confirm it
      passes against the redact config already added in 3.2 — if it fails, fix the `redact`
      array to match ADR-004 exactly.
- [x] 3.4 Write a failing test asserting emitted output does NOT contain a literal password
      value when logging `{ user: { password: "hunter2" } }`. Confirm it passes.

## 4. PinoLogger — request context enrichment (TDD)

- [x] 4.1 Write a failing test: inside a real `withRequestContext(fn, { traceId: "abc-123" })`
      scope (import from `app/utils/requestContext.server.ts` — not a mock of ALS internals)
      whose store has `tenantId`/`userId` set via `getRequestContext()` before the logger call,
      `PinoLogger.info({ msg: "Notice created" })` emits a log line containing `traceId`,
      `tenantId`, and `userId` matching the store, plus `msg`. Confirm it fails (no enrichment
      logic yet).
- [x] 4.2 Implement per-call `getRequestContext()` read and `pino.child({ traceId, tenantId,
      userId })` enrichment per design.md Decision 2. Run the test from 4.1 and confirm it
      passes.
- [x] 4.3 Write a failing test: calling `PinoLogger.info({ msg: "Server started" })` with no
      `withRequestContext` scope active does not throw, and the emitted line contains `msg` but
      no `traceId`/`tenantId`/`userId` fields. Confirm it passes against the 4.2 implementation
      (fallback branch should already exist); if not, add the `undefined`-store branch.
- [x] 4.4 Write a failing test for the concurrent-callers scenario: start two
      `withRequestContext` scopes concurrently (scope A: `traceId: "trace-a"`, later
      `tenantId: "tenant-a"`; scope B: `traceId: "trace-b"`, later `tenantId: "tenant-b"`),
      interleave a `PinoLogger.info({ msg: "event" })` call from each before either scope's
      promise resolves (e.g. via `Promise.all` with an `await new Promise(setImmediate)`
      interleave point), and assert scope A's emitted line contains only `trace-a`/`tenant-a`
      and scope B's emitted line contains only `trace-b`/`tenant-b` — neither leaks into the
      other. Run and confirm this passes without further implementation changes (AsyncLocalStorage
      isolation should already guarantee this); if it fails, this indicates a genuine context
      leak bug that must be fixed before proceeding.

## 5. PinoLogger — singleton accessor for non-DI callers (TDD)

- [x] 5.1 Write a failing test asserting `getPinoLogger()` called twice returns loggers backed
      by the same underlying Pino instance (e.g. assert both write to the same destination
      instance, or expose a test-only identity check). Confirm it fails (no accessor yet).
- [x] 5.2 Implement `export function getPinoLogger(): ILogger` in `PinoLogger.server.ts`,
      constructing the module-level Pino instance and `PinoLogger` wrapper exactly once at
      module load per design.md Decision 1. Run the test from 5.1 and confirm it passes.
- [x] 5.3 Write a failing test asserting `getPinoLogger()` returns a fully functional `ILogger`
      when called with no NestJS `TestingModule`/application context created in the test file.
      Confirm it passes (this should already hold since `getPinoLogger()` has no NestJS
      dependency).

## 6. Wire PinoLogger into NoticesModule

- [x] 6.1 In `tests/integration/domains/notices/NoticesModule.test.ts`, add a failing test (or
      extend an existing `it` block) asserting that after this change, the three use-case
      `useFactory` providers construct their logger via `getPinoLogger()` rather than
      `new NoOpLogger()` — e.g. by asserting the resolved use case's injected logger is the
      same instance `getPinoLogger()` returns, or a documented equivalent inspection. Run
      `yarn vitest run tests/integration/domains/notices/NoticesModule.test.ts` and confirm the
      new assertion fails against the current `NoOpLogger`-based wiring.
- [x] 6.2 In `app/domains/notices/infrastructure/NoticesModule.server.ts`, replace
      `new NoOpLogger()` with `getPinoLogger()` in all three `useFactory` providers
      (`CreateNoticeUseCase`, `ListNoticesUseCase`, `GetNoticeByIdUseCase`). Remove the
      now-unused `NoOpLogger` import. Update the comment block above the providers to state
      that `PinoLogger` (via `getPinoLogger()`) is now the production logger, and that
      `NoOpLogger` remains correct only for unit tests constructing use cases directly. Run
      `yarn vitest run tests/integration/domains/notices/NoticesModule.test.ts` and confirm the
      new assertion from 6.1 now passes, and every pre-existing assertion in the file (token
      identity, singleton behavior, concurrent compilation, CoreModule resolution) still
      passes unmodified.

## 7. Migrate requestContextMiddleware off console.error

- [x] 7.1 Read `app/middleware/requestContext.server.ts` lines 30-44 again immediately before
      editing to confirm line numbers have not shifted from Phase 0's reading.
- [x] 7.2 If a middleware-level test file exists for `requestContextMiddleware`, add failing
      tests asserting that a rejected `getUserFromSession` call results in a call to
      `getPinoLogger().error(...)` and NOT `console.error`, and likewise for a rejected
      `getCountryAccountsIdFromSession` call. If no such test file exists yet, create
      `tests/unit/middleware/requestContext.test.ts` with these two cases, spying on both
      `console.error` and the `PinoLogger` module's exported logger to make the assertion
      concrete. Confirm both new tests fail against the current `console.error`-based code.
- [x] 7.3 In `app/middleware/requestContext.server.ts`, import `getPinoLogger` from
      `~/infrastructure/logging/PinoLogger.server` and replace both `console.error(...)` calls
      (session-lookup rejection logging for `getUserFromSession` and
      `getCountryAccountsIdFromSession`) with `getPinoLogger().error({...})` calls carrying an
      equivalent `msg` and the rejection `reason` as structured data. Run the tests from 7.2
      and confirm they now pass.

## 8. Quality gates

- [x] 8.1 Gate 1 — `yarn vitest run tests/unit/infrastructure/logging/PinoLogger.test.ts
      tests/integration/domains/notices/NoticesModule.test.ts tests/unit/middleware/requestContext.test.ts`
      — all tests green.
- [x] 8.2 Gate 2 — `yarn tsc` — zero TypeScript errors.
- [x] 8.3 Gate 3 — `yarn format:check` — Prettier clean (run `yarn format` first if not).
- [x] 8.4 Gate 4 — Anti-pattern review: check every changed/added file against
      `.github/skills/anti-pattern-check/SKILL.md`.
- [x] 8.5 Gate 5 — SOLID review: invoke the `solid-reviewer` agent against
      `PinoLogger.server.ts`, `NoticesModule.server.ts`, and `requestContext.server.ts` changes.
- [x] 8.6 Gate 6 — Documentation review: confirm comments in all changed files explain WHY
      (e.g. why `getPinoLogger()` bypasses DI for the middleware call site) not WHAT.
- [x] 8.7 Gate 7 — Project conventions review: check `.github/copilot-instructions.md`
      compliance (server-only `.server.ts` suffix, `~/*` path alias usage, no `as any`, etc.).
- [x] 8.8 Gate 8 — Code review: run `.github/skills/code-review/SKILL.md` in full over the
      complete diff.

## 9. Regression and archive

- [x] 9.1 Run `yarn test:run2` (full PGlite suite). Confirm no new failures versus a baseline
      run on the pre-change branch state. Any pre-existing failure must be independently
      confirmed as pre-existing (re-run on base branch/commit to verify) before being excluded
      — do not assume a failure is pre-existing without this check.
- [x] 9.2 Note in the PR description: no DB migration is part of this change; `yarn dbsync` is
      not applicable.
- [x] 9.3 Run `opsx:archive` on this branch (`feature/ca-ilogger-production-impl`) before
      raising the PR.
