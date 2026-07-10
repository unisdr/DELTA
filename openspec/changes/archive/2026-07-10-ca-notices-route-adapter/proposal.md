## Why

The Notices domain has a fully built and tested domain/application/infrastructure stack —
`Notice` entity, `ListNoticesUseCase`, `GetNoticeByIdUseCase`, `DrizzleNoticeRepository`, all
wired into `CoreModule` via `NoticesModule` — but no way for a user to actually see a notice in
the app. There is no route, no page component, and no error boundary. This change adds the thin
presentation-layer adapter (two React Router routes + one shared `ErrorBoundary`) that exposes
the existing use cases as an authenticated, read-only list + detail experience, consuming the
request-context and logging infrastructure that has already landed on `dev` rather than
rebuilding either.

## What Changes

- Add `app/routes/$lang+/_authenticated+/notices+/_index.tsx` — loader resolves
  `ListNoticesUseCase` via `getAppContext().get(...)`, reads `tenantId` from
  `getRequestContext()` (falling back to `getCountryAccountsIdFromSession` and redirecting to
  `/${lang}/user/select-instance` when absent), reads `page`/`pageSize` from the URL query
  string, and renders a `PageProps<T>`-conformant list page.
- Add `app/routes/$lang+/_authenticated+/notices+/$id.tsx` — loader resolves
  `GetNoticeByIdUseCase` the same way, using `params.id`, and renders a detail page.
- Add `app/domains/notices/presentation/NoticeErrorBoundary.tsx` — a shared `ErrorBoundary`
  component using `useRouteError()`/`isRouteErrorResponse()` to extract the ADR-003
  `ErrorResponse` envelope, rendering a user-friendly message and a copyable `traceId`. Exported
  as `ErrorBoundary` from both route files above.
- Both loaders throw (never return) on error: caught `DomainError` instances become
  `throw Response.json(errorResponse, { status: err.statusHint })` per the ADR-003 envelope;
  any other exception is logged via `getPinoLogger().error(...)` and rethrown, surfacing as a
  generic 500 — both cases are caught uniformly by React Router's `useRouteError()` mechanism
  and rendered by `NoticeErrorBoundary`. The success path returns plain `NoticeDto[]` /
  `NoticeDto` data with no `{ success: true }` wrapper.
- Add two new page-level presentation components (list, detail) following the `PageProps<T>`
  contract, resolving one display string per `LocaleMap` field via `useViewContext().lang`
  (falling back to `"en"`), each under 60 lines, with no business logic inline.

This is a combination of the roadmap's Phase 5a (Notices Route Adapter) and Phase 5b (Notices
ErrorBoundary) into a single change, since the route files and the error boundary they export
are one cohesive unit of work with no meaningful seam between them.

**Explicitly out of scope** (per settled decisions carried from research): the REST API
controller (Phase 5c), Accept-Language-header locale resolution (`resolveLocale()`, Phase 5c),
audience-based filtering in `ListNoticesUseCase`, and any create/edit/delete route.

## Capabilities

### New Capabilities
- `notices-route-adapter`: React Router loaders for the notices list and detail routes —
  use-case resolution, tenant scoping, pagination, ADR-003-compliant thrown errors, and the
  `PageProps<T>` page components that render the returned `NoticeDto` data.
- `notice-error-boundary`: The shared `NoticeErrorBoundary` component and its export contract
  from both notices route files, covering both `DomainError`-derived responses and generic
  500s.

### Modified Capabilities
None. This change adds new route/presentation files only; it does not alter the behavior of
`list-notices`, `get-notice-by-id`, `notices-module-wiring`, `request-context-middleware`, or
`pino-logger` — it only consumes their existing, already-specified contracts.

## Impact

**Files added:**
- `app/routes/$lang+/_authenticated+/notices+/_index.tsx` — list route (loader + `ErrorBoundary` export)
- `app/routes/$lang+/_authenticated+/notices+/$id.tsx` — detail route (loader + `ErrorBoundary` export)
- `app/domains/notices/presentation/NoticeErrorBoundary.tsx` — shared error boundary component
- `app/domains/notices/presentation/NoticeListPage.tsx` — list page component (`PageProps<T>`)
- `app/domains/notices/presentation/NoticeDetailPage.tsx` — detail page component (`PageProps<T>`)
- `tests/integration/domains/notices/routes/NoticesIndexRoute.test.ts` — PGlite loader test
- `tests/integration/domains/notices/routes/NoticeDetailRoute.test.ts` — PGlite loader test
- `tests/e2e/notices/notices.spec.ts` — Playwright E2E (list, detail, unknown-id boundary, unauthenticated redirect)

**Files touched (no behavior change):** none — this change is additive only.

**DB migration:** Not required. The `notices` table schema already exists (Phase 4a,
`ca-notices-schema-migration`, merged to `dev`).

**Test approach:** PGlite integration tests (`yarn test:run2`) call the exported `loader`
function directly with a mock `Request`/`params`, asserting both the success return shape and
the exact thrown-Response shape/status for each `DomainError` case. Playwright E2E
(`yarn test:e2e`) covers: list renders with seeded data, detail renders for a known id, an
unknown id renders `NoticeErrorBoundary` with a visible/copyable `traceId`, and an
unauthenticated request redirects to login.

**Security / multi-tenancy implications:** Both loaders MUST scope every use-case call with the
current request's `tenantId` — sourced from `getRequestContext().tenantId` (populated by the
already-merged `requestContextMiddleware`), with a defensive fallback to
`getCountryAccountsIdFromSession` if the context field is unexpectedly absent, redirecting to
`/${lang}/user/select-instance` when no tenant can be resolved. Access control is
authentication-only (nesting under `_authenticated.tsx`, which calls `requireUser`) — no
`authLoaderWithPerm` permission gate, per the settled research decision that notices are visible
to any authenticated user of the tenant. No cross-tenant data exposure risk beyond what
`GetNoticeByIdUseCase`'s existing defence-in-depth tenant check already guards against.
