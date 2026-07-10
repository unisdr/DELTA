## 1. Shared ErrorResponse type

- [x] 1.1 Add `ErrorResponse` type to `app/shared/errors/ErrorResponse.ts` (or extend the
  existing `app/shared/errors` barrel) matching the ADR-003 envelope exactly:
  `{ success: false; error: { code: string; message: string; details?: unknown; traceId: string; timestamp: string } }`.
  No test needed for a pure type — verified by downstream usage compiling.

## 2. Notice detail loader — Red phase

- [x] 2.1 Write failing PGlite test
  `tests/integration/domains/notices/routes/NoticeDetailRoute.test.ts` covering: known id
  within tenant returns plain `NoticeDto` (no `success` wrapper); unknown id throws a
  `Response` with status 404 and `error.code === "NOT_FOUND"`; missing tenant (no request
  context, no session) throws a redirect to `/${lang}/user/select-instance`; non-DomainError
  failure from the use case is logged via `getPinoLogger().error` and rethrown unmodified.
  Setup imports, in order: `import "../../../db/setup"`, then `import "reflect-metadata"`.
  Before any other import, add `vi.mock("~/init.server", () => ({ getAppContext: () => ({
  get: (token) => testingModule.get(token) }) }))`, where `testingModule` is a module-level
  `let` populated in a `beforeEach` via `Test.createTestingModule({ imports: [NoticesModule]
  }).compile()` (matching `tests/integration/domains/notices/NoticesModule.test.ts`'s
  compile-per-test pattern) and closed in `afterEach`. This makes the route file's own,
  unmodified `getAppContext().get(UseCase)` call (design.md Decision 5) resolve against this
  test's local DI container instead of throwing the real "NestJS application context has not
  been initialised" guard error — see design.md's "Test infrastructure" section for the full
  verified mechanism and why `initServer()` is never called in this test tier.
  Run: `yarn vitest run tests/integration/domains/notices/routes/NoticeDetailRoute.test.ts`
  (expect all new tests to fail — the route file does not exist yet).

## 3. Notice detail loader — Green phase

- [x] 3.1 Add `app/routes/$lang+/_authenticated+/notices+/$id.tsx` with a `loader` that: reads
  `tenantId` from `getRequestContext()?.tenantId`, falling back to
  `getCountryAccountsIdFromSession(request)`, throwing `redirect(`/${lang}/user/select-instance`)`
  when both are absent; resolves `GetNoticeByIdUseCase` via `getAppContext().get(...)`; calls
  `execute({ id: params.id, tenantId })`; returns the plain `NoticeDto` on success; on
  `DomainError`, throws `Response.json(errorResponse, { status: err.statusHint })` using the
  shared `ErrorResponse` type from Task 1.1; on any other error, calls
  `getPinoLogger().error(...)` and rethrows.
- [x] 3.2 Run `yarn vitest run tests/integration/domains/notices/routes/NoticeDetailRoute.test.ts`
  and confirm all tests pass.

## 4. Notice detail page component — Red phase

- [x] 4.1 Write a failing unit/component test (or extend the PGlite route test with a rendering
  assertion if the project's convention favors that — check existing `PageProps<T>` component
  test precedent before deciding) asserting `NoticeDetailPage` resolves `titleJson`/`bodyJson`
  via `useViewContext().lang`, falling back to `"en"`, then to an empty string.

## 5. Notice detail page component — Green phase

- [x] 5.1 Add `app/domains/notices/presentation/NoticeDetailPage.tsx` implementing
  `PageProps<NoticeDto>`, rendering the resolved title/body strings; wire it into `$id.tsx`'s
  default export (`useLoaderData()` then `<NoticeDetailPage data={loaderData} />`). Keep
  `$id.tsx` at or under 60 lines.
- [x] 5.2 Run the Task 4.1 test and confirm it passes.

## 6. Notices list loader — Red phase

- [x] 6.1 Write failing PGlite test
  `tests/integration/domains/notices/routes/NoticesIndexRoute.test.ts` covering: default
  pagination (`page=1, pageSize=20`) when no query params supplied; explicit valid
  `?page=&pageSize=` forwarded as-is; malformed query params (`?page=abc`) fall back to
  defaults; `pageSize` clamped to a maximum of 100; successful fetch returns plain `NoticeDto[]`
  with no `success` wrapper; missing tenant throws a redirect to select-instance; DomainError
  from the use case throws the ADR-003 envelope with correct status; non-DomainError failure is
  logged and rethrown.
  Use the same setup-import order and `vi.mock("~/init.server", ...)` /
  `Test.createTestingModule({ imports: [NoticesModule] })` seam as Task 2.1 (repeated locally in
  this test file, not extracted to a shared helper — see design.md's "Test infrastructure"
  section for why each test file owns its own `testingModule` instance).
  Run: `yarn vitest run tests/integration/domains/notices/routes/NoticesIndexRoute.test.ts`
  (expect failures — the route file does not exist yet).

## 7. Notices list loader — Green phase

- [x] 7.1 Add `app/routes/$lang+/_authenticated+/notices+/_index.tsx` with a `loader`
  implementing: the same tenant-resolution and error-handling rules as the detail loader
  (Task 3.1); pagination parsing per design.md Decision 6 (`page` defaults to 1, `pageSize`
  defaults to 20, clamped to a max of 100, guarding against `NaN` from malformed query
  strings); resolves `ListNoticesUseCase` via `getAppContext().get(...)`; returns the plain
  `NoticeDto[]` on success.
- [x] 7.2 Run `yarn vitest run tests/integration/domains/notices/routes/NoticesIndexRoute.test.ts`
  and confirm all tests pass.

## 8. Notices list page component — Red phase

- [x] 8.1 Write a failing test asserting `NoticeListPage` resolves one locale string per notice
  from `titleJson`, using the same fallback chain as `NoticeDetailPage` (Task 4.1), and renders
  it inside PrimeReact's `DataTable` (design.md Decision 8): assert on the rendered *content*
  reachable via Testing Library queries (e.g. `getAllByRole("row")` has one row per notice plus
  the header row, and each row's cell text includes the resolved title and a "Published"/"Draft"
  status label) — do NOT assert on `DataTable`'s internal DOM structure (class names, table
  nesting) since that is PrimeReact's implementation detail, not this change's contract.

## 9. Notices list page component — Green phase

- [x] 9.1 Add `app/domains/notices/presentation/NoticeListPage.tsx` implementing
  `PageProps<NoticeDto[]>`, rendering the notices with PrimeReact's `DataTable`/`Column` per
  design.md Decision 8 (columns: title via the shared locale-resolution helper, `isPublished`
  status label, `publishedAt`, `updatedAt`); wire it into `_index.tsx`'s default export. Keep
  `_index.tsx` at or under 60 lines.
- [x] 9.2 Run the Task 8.1 test and confirm it passes.

## 10. NoticeErrorBoundary — Red phase

- [x] 10.1 Write a failing component test for `NoticeErrorBoundary` covering: a thrown
  `Response` with the ADR-003 envelope renders `error.message` and a copyable `error.traceId`;
  a `details` field in the envelope does not crash rendering and is not shown as the primary
  message; a non-`Response` (plain `Error`) renders a generic fallback message and does not
  leak `error.message`/`error.stack`; a non-`Response` error does not render an `"undefined"`
  traceId.

## 11. NoticeErrorBoundary — Green phase

- [x] 11.1 Add `app/domains/notices/presentation/NoticeErrorBoundary.tsx` implementing the
  component per design.md Decision 4: `useRouteError()`, `isRouteErrorResponse()` narrowing,
  parsing the shared `ErrorResponse` type from Task 1.1, rendering message + copyable traceId
  on the Response branch, and a generic safe fallback on the non-Response branch.
- [x] 11.2 In both `_index.tsx` and `$id.tsx`, add
  `export { NoticeErrorBoundary as ErrorBoundary }`.
- [x] 11.3 Run the Task 10.1 test and confirm it passes.

## 12. Playwright E2E

- [x] 12.1 Add `tests/e2e/notices/notices.spec.ts` covering: the notices list page renders for
  an authenticated user with seeded notices; navigating to a known notice id renders its
  detail; navigating to an unknown notice id renders `NoticeErrorBoundary` with a visible,
  copyable `traceId`; an unauthenticated request to either route redirects to the login page.
  Run: `yarn test:e2e` (requires `PORT=4000`; follow existing E2E setup conventions for seeding
  a tenant/session fixture).

## 13. Refactor pass

- [x] 13.1 Re-read both route files and both page components; extract any repeated
  tenant-resolution or error-handling logic between `_index.tsx` and `$id.tsx` into a small
  shared helper under `app/domains/notices/presentation/` if — and only if — the duplication is
  identical, to avoid the two loaders silently drifting apart over time.
- [x] 13.2 Confirm all tests from Tasks 2, 4, 6, 8, 10, and 12 remain green after any
  refactor-pass edits.

## 14. Quality gates (run in order; fix and re-run on any failure before proceeding)

- [x] 14.1 Gate 1 — `yarn vitest run tests/integration/domains/notices/routes/NoticeDetailRoute.test.ts tests/integration/domains/notices/routes/NoticesIndexRoute.test.ts` — all tests green.
- [x] 14.2 Gate 2 — `yarn tsc` — zero TypeScript errors.
- [x] 14.3 Gate 3 — `yarn format:check` — Prettier clean (`yarn format` to fix, then re-check).
- [x] 14.4 Gate 4 — Anti-pattern review against `.github/skills/anti-pattern-check/SKILL.md`.
- [x] 14.5 Gate 5 — SOLID review: invoke the `solid-reviewer` agent against all new/changed files.
- [x] 14.6 Gate 6 — Documentation review: confirm comments explain WHY, not WHAT, across all new files.
- [x] 14.7 Gate 7 — Project conventions review against `.github/copilot-instructions.md`.
- [x] 14.8 Gate 8 — Code review: run `.github/skills/code-review/SKILL.md` in full over the diff.

## 15. Regression and archive

- [x] 15.1 Run `yarn test:run2` (full PGlite suite) and confirm no new failures versus the
  `dev` baseline. Any pre-existing failure MUST be independently confirmed as pre-existing
  (re-run the same failing test on `dev` before this branch's changes) — never assumed.
- [x] 15.2 Run `opsx:archive` for `ca-notices-route-adapter` on this branch before raising the PR.
