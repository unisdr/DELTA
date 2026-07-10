## Context

The Notices domain's application layer (`ListNoticesUseCase`, `GetNoticeByIdUseCase`) and
infrastructure layer (`DrizzleNoticeRepository`, `NoticesModule`) are complete and merged to
`dev`. Two pieces of shared infrastructure this change depends on have also landed since the
original Phase 5a/5b research was written, and this design explicitly consumes rather than
rebuilds them:

1. **`requestContextMiddleware`** (`app/middleware/requestContext.server.ts`, registered in
   `app/root.tsx`'s `middleware` export) already opens one `withRequestContext` scope per
   request and populates `traceId` / `tenantId` / `userId` on the `RequestContextStore`
   (`app/utils/requestContext.server.ts`) before any loader in the matched route tree runs.
   Notices loaders call `getRequestContext()` to read these fields. They MUST NOT call
   `withRequestContext()` themselves and MUST NOT seed a `traceId` — both would create a second,
   redundant AsyncLocalStorage scope nested inside the one root.tsx already opened.
2. **`getPinoLogger()`** (`app/infrastructure/logging/PinoLogger.server.ts`) is the real,
   ADR-004-compliant `ILogger` singleton, already consumed by `NoticesModule.server.ts`'s
   use-case factories. Any error-level logging this change needs uses `getPinoLogger().error(...)`.

This is the **first production loader in the codebase to call `getAppContext().get(SomeUseCase)`**.
Today, the only call sites for `getAppContext()` are `app/init.server.tsx` itself and
`tests/integration/domains/notices/NoticesModule.test.ts` (which uses
`Test.createTestingModule` directly, not `getAppContext()`). There is no existing loader
precedent to copy for this exact call pattern — the design decisions below are made explicit
because of that.

There is also no existing precedent anywhere in the codebase for a per-route `ErrorBoundary`
export (`app/root.tsx` has one root-level `ErrorBoundary`, but no domain has its own yet). This
change is the first implementation of the ADR-003 Layer 4 "React Router Error Boundaries"
pattern.

## Goals / Non-Goals

**Goals:**
- Two thin React Router route files (list, detail) under `_authenticated+/notices+/`, each
  under 60 lines, with all page-rendering logic delegated to a `PageProps<T>` component and all
  data access delegated to the existing use cases.
- One shared `NoticeErrorBoundary`, exported as `ErrorBoundary` from both route files, that
  handles both the ADR-003 `ErrorResponse` envelope (thrown via `Response.json`) and an
  uncaught/generic exception (thrown as a bare `Error`, resulting in React Router's default
  status-500 `ErrorResponse`).
- Loaders throw for every error path (no `{ success: false, ... }` return value) so a single
  React Router mechanism (`useRouteError()`) handles both `DomainError` and programmer-error
  cases uniformly.
- Locale resolution for `titleJson`/`bodyJson` happens in the presentation layer via
  `useViewContext().lang`, never in the loader or use case.

**Non-Goals:**
- No REST API controller (`NoticesController`) — Phase 5c.
- No `Accept-Language` header parsing or `resolveLocale()` shared utility — Phase 5c.
- No audience-based filtering in `ListNoticesUseCase` — deferred, tracked separately.
- No create/edit/delete route — read-only list + detail only.
- No permission gate (`authLoaderWithPerm`) — authentication only, via nesting under
  `_authenticated.tsx`.
- No changes to `ListNoticesUseCase`, `GetNoticeByIdUseCase`, `NoticesModule`, or any file in
  `app/domains/notices/application` or `app/domains/notices/infrastructure` — this change is
  presentation-layer only and treats those as a stable, already-specified contract.

## Decisions

### Decision 1 — Loaders read `tenantId` from `getRequestContext()`, with a session fallback only as a defensive guard

**Choice**: `const tenantId = getRequestContext()?.tenantId ?? (await getCountryAccountsIdFromSession(request));`

**Rationale**: `requestContextMiddleware` already resolves and populates `tenantId` on the
store before any loader runs, so the happy path is a synchronous, zero-DB-call read. The
session fallback exists only to guard against the theoretical case where a loader executes
outside the middleware's scope (e.g. a future test harness that calls the loader directly
without going through `root.tsx`'s middleware chain) — PGlite loader tests in this change call
the exported `loader` directly with a mock `Request`, which does NOT run `root.tsx` middleware,
so the fallback path is what those tests actually exercise. Without the fallback, every loader
test would need to manually wrap the call in `withRequestContext()`, which duplicates
app-wired behavior the tests should not need to know about.

**Alternative considered**: Always call `getCountryAccountsIdFromSession` directly, ignoring
`getRequestContext()` entirely. Rejected — this ignores the whole point of the middleware
(avoiding redundant session DB round-trips within a request) and contradicts the explicit
instruction that loaders must consume the already-populated context.

### Decision 2 — Missing tenant redirects with `throw redirect(...)`, matching existing precedent exactly

**Choice**: `if (!tenantId) throw redirect(`/${lang}/user/select-instance`);` — same path and
`throw` (not `return`) convention as
`app/routes/$lang+/_authenticated+/hazardous-event+/new.tsx:51`.

**Rationale**: This is the only existing precedent in the codebase for this exact condition
(authenticated but no tenant selected). Matching it exactly avoids introducing a second,
subtly different convention for the same situation.

**Alternative considered**: Redirect to a domain-specific "no tenant" page. Rejected — no such
page exists, and inventing one is out of scope for a route adapter change.

### Decision 3 — Loaders throw `Response.json(errorResponse, { status: err.statusHint })` for `DomainError`, rethrow everything else after logging

**Choice**:
```ts
try {
  const data = await listNoticesUseCase.execute(query);
  return data; // plain NoticeDto[], no wrapper
} catch (err) {
  if (err instanceof DomainError) {
    throw Response.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.context !== undefined ? { details: err.context } : {}),
          traceId: getRequestContext()?.traceId ?? crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      } satisfies ErrorResponse,
      { status: err.statusHint },
    );
  }
  getPinoLogger().error({ msg: "Unhandled error in notices loader", err, url: request.url });
  throw err;
}
```

**Rationale**: React Router v7's `useRouteError()` mechanism catches both a thrown `Response`
and a thrown plain `Error` at the nearest matched `ErrorBoundary`. Throwing (never returning) an
error means the component body never has to branch on a `{ success: boolean }` union — the
happy-path component only ever receives success data, matching `PageProps<T>` where `T` is the
plain use-case return type. This exactly matches the ADR-003 Layer 4 code sample and the
explicit, settled decision carried into this proposal.

**Why the `details` field is conditionally omitted, not set to `undefined`**: matches the
existing `DomainErrorFilter.server.ts` convention (`...(exception.context !== undefined ? {...} : {})`)
so both presentation surfaces (NestJS REST, React Router loader) serialise the envelope
identically — `JSON.stringify` drops `undefined` values anyway, but being explicit keeps the two
implementations visibly consistent for a future reader comparing them.

**Alternative considered**: Return `{ success: false, error }` with a 200 status and branch in
the component. Rejected — the roadmap's own settled decision (carried into this proposal
verbatim) requires the throw-based flow specifically so `NoticeErrorBoundary` is the single
place that renders error UI; a returned-data branch would bypass the ErrorBoundary entirely.

### Decision 4 — `NoticeErrorBoundary` narrows on `isRouteErrorResponse(error)` first, falls back to a generic message

**Choice**:
```ts
export function NoticeErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    const body = error.data as ErrorResponse | undefined;
    const traceId = body?.error?.traceId;
    const message = body?.error?.message ?? "An unexpected error occurred.";
    // render message + copyable traceId
  }
  // Non-Response error (e.g. thrown plain Error that only DomainErrorFilter-style
  // code understands) — render a generic message with no traceId guarantee.
}
```

**Rationale**: `isRouteErrorResponse()` is the React Router v7-documented way to distinguish a
thrown `Response`/`Response.json()` (our `DomainError` path and React Router's own
route-not-matched/loader-threw-Response cases) from a thrown plain `Error` (an unexpected
programmer error that never went through our `catch` block — e.g. a synchronous throw before
the `try` even starts). This exactly mirrors the pattern already used in `app/root.tsx`'s
top-level `ErrorBoundary` (`isRouteErrorResponse(error) ? error.data : null`), so a reader
familiar with the root boundary immediately recognises the domain-level one.

**Alternative considered**: `error instanceof DomainError`. Rejected — by the time the error
reaches `useRouteError()`, it has already crossed a server/client serialisation boundary (React
Router serialises thrown `Response` bodies to JSON for hydration); `instanceof DomainError`
would never be true client-side even though the loader threw a real `DomainError` server-side.
Only the serialised `ErrorResponse` shape survives the boundary, so narrowing on that shape
(rather than the original class) is the only approach that works.

### Decision 5 — Use-case resolution via `getAppContext().get(UseCase)` called once per loader invocation, not memoized at module scope

**Choice**:
```ts
export async function loader({ request, params }: LoaderFunctionArgs) {
  const listNoticesUseCase = getAppContext().get(ListNoticesUseCase);
  ...
}
```

**Rationale**: `getAppContext()` returns the module-level `appContext` singleton set once by
`initServer()` at process startup (`app/init.server.tsx`); `.get(UseCase)` resolves the
NestJS-Singleton-scoped provider, which is itself memoized inside the DI container. Calling
`.get()` per-request is therefore not a re-instantiation — it is a cheap map lookup against an
already-built provider graph. Memoizing the resolved use case at route-module scope would save
that lookup but would also mean the module captures a reference to the use-case instance before
`initServer()` has necessarily run (route modules are imported eagerly by the React Router
Vite build, whereas `initServer()` runs at server-request-handling startup) — calling
`getAppContext()` lazily inside the loader body avoids any import-order hazard.

**Alternative considered**: A module-level `let cachedUseCase` populated on first call.
Rejected as premature optimisation solving a performance problem that does not exist (DI
`.get()` is O(1) map lookup) while introducing exactly the import-order hazard described above.

### Decision 6 — Pagination defaults: `page` and `pageSize` parsed from the URL query string with the same numeric-safety guard already used elsewhere in the codebase

**Choice**: `page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1)`,
`pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20))`.

**Rationale**: `ListNoticesQuery` requires `page: number` and `pageSize: number` — the use case
does no validation or defaulting of its own (confirmed in `openspec/specs/list-notices/spec.md`
— no requirement mentions defaults), so the route adapter is the correct and only layer to own
sane defaults. The `|| default` fallback after `parseInt` guards against `NaN` from a malformed
query string (e.g. `?page=abc`), mirroring the identical `Number.isFinite` guard pattern already
used for `API_PORT` parsing in `app/init.server.tsx`. A page size ceiling of 100 prevents a
crafted URL from requesting an unbounded page size against the DB.

**Alternative considered**: Let a malformed `page`/`pageSize` throw a `ValidationError` (422).
Rejected — sane clamping is friendlier for a first-cut read-only list page and avoids adding a
new validation code path the use case itself does not define; can be revisited later if product
requirements demand strict validation.

### Decision 7 — Presentation components resolve one locale string per `LocaleMap` field, falling back to `"en"`

**Choice**: A small local helper (not a new shared utility) inside each page component:
`const title = notice.titleJson[lang] ?? notice.titleJson["en"] ?? "";`, where `lang` comes
from `useViewContext().lang`.

**Rationale**: This is explicitly NOT `resolveLocale()` (Accept-Language-header resolution,
Phase 5c) — it is the simpler, already-settled decision that these web routes use the URL's
`$lang` segment (already resolved into `useViewContext().lang` by the root loader) directly as
the lookup key, with only an `"en"` fallback for missing keys. Introducing the shared
`resolveLocale()` utility now would pull in an out-of-scope Phase 5c concern.

**Alternative considered**: Have the loader resolve the locale string server-side and return a
flattened DTO. Rejected — `NoticeDto.titleJson`/`bodyJson` are explicitly typed as full
`LocaleMap`s per the existing `list-notices`/`get-notice-by-id` specs ("the use case does NOT
strip any key... Locale-level string resolution is a presentation-layer concern"); flattening in
the loader would duplicate that resolution logic outside the presentation layer this proposal
owns.

### Decision 8 — `NoticeListPage` renders notices with PrimeReact's `DataTable`/`Column`, not a raw `<table>`

**Choice**: `NoticeListPage` renders `args.data` (a `NoticeDto[]`) with PrimeReact's `DataTable`
component, one `Column` per displayed field:

```tsx
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

<DataTable value={notices} dataKey="id" stripedRows size="small" className="w-full"
           emptyMessage={ctx.t({ code: "notices.empty", msg: "No notices found." })}>
  <Column field="titleJson" header={ctx.t({ code: "notices.title", msg: "Title" })}
          body={(n: NoticeDto) => resolveLocale(n.titleJson, lang)} />
  <Column field="isPublished" header={ctx.t({ code: "notices.status", msg: "Status" })}
          body={(n: NoticeDto) => (n.isPublished ? "Published" : "Draft")} />
  <Column field="publishedAt" header={ctx.t({ code: "notices.published_at", msg: "Published" })}
          body={(n: NoticeDto) => (n.publishedAt ? formatDateDisplay(n.publishedAt) : "—")} />
  <Column field="updatedAt" header={ctx.t({ code: "notices.updated_at", msg: "Last updated" })}
          body={(n: NoticeDto) => formatDateDisplay(n.updatedAt)} />
</DataTable>
```

Column-to-field mapping: **Title** (`titleJson`, resolved to the current-locale string per
Decision 7's fallback chain — reuses the same helper, not a new one), **Status** (`isPublished`,
rendered as a "Published"/"Draft" label rather than the raw boolean), **Published** (`publishedAt`,
formatted, showing an em-dash when `null` since an unpublished notice has none), **Last updated**
(`updatedAt`, always present). `id`, `tenantId`, `bodyJson`, and `audience` are not shown as list
columns — `bodyJson` is detail-only content and `id`/`tenantId`/`audience` are not
useful at-a-glance list information for this first cut.

All prop names above (`value`, `dataKey`, `stripedRows`, `emptyMessage` on `DataTable`; `field`,
`header`, `body` on `Column`) were verified directly against
`node_modules/primereact/datatable/datatable.d.ts` and
`node_modules/primereact/column/column.d.ts` before writing this decision, not assumed from
memory.

**Rationale**: This is a deliberate, human-approved deviation from the `HazardousEventListPage`
raw-`<table>` precedent (`app/frontend/events/hazardeventlist.tsx`), made because PrimeReact is
the team's stated direction for interactive widgets going forward, and `NoticeListPage` is a new
component with no existing raw-table markup to preserve. `DataTable`/`Column` are not a novel
introduction to the codebase — they are already used in
`app/routes/$lang+/settings+/geography+/_index.tsx:277-303` (`<DataTable value={items} size="small"
stripedRows className="w-full">` with `<Column field="..." header={...} body={...} />`) and in
`app/pages/OrganizationManagementPage.tsx`, so this decision follows an existing, real usage
pattern rather than inventing one.

**Alternative considered**: Match `HazardousEventListPage`'s raw-`<table>` + `dts-*` CSS class
convention for consistency with the other list page cited in this design doc. Rejected per
explicit team direction — PrimeReact is the going-forward standard for this kind of widget, and
matching the older raw-table convention would move a new component further from, not closer to,
where the codebase is headed.

### Decision 9 — Both routes wrap their default export in `MainContainer`, matching every other page

**Choice**: Both `_index.tsx` and `$id.tsx` wrap their page component in
`<MainContainer title={ctx.t({ code: "notices", msg: "Notices" })}>` (`app/frontend/container.tsx`).

**Rationale**: Human manual `yarn dev` UI validation (post-implementation, comparing screenshots
against an existing page) found the original implementation rendered `NoticeListPage`/
`NoticeDetailPage` bare — no page-header banner, no `mg-container` padding — visibly diverging
from every other page in the app, which all wrap content in `MainContainer`
(e.g. `HazardousEventListPage`'s route). A single static "Notices" title is used for both routes,
matching `HazardousEventListPage`'s section-level (not per-record) title pattern — this keeps
`NoticeListPage.tsx`/`NoticeDetailPage.tsx` themselves, and their existing passing unit tests,
completely unchanged; only the two route files change.

**Alternative considered**: Use the resolved notice's own title as `MainContainer`'s title on the
detail route. Rejected — `NoticeDetailPage` already renders the resolved title as its own `<h1>`;
duplicating it in the banner would be redundant.

**Known follow-up**: `MainContainer` and other shared layout primitives are in scope for the
draft `_docs/refactoring-plan/design-system-unification-roadmap.md` initiative — this fix
consumes the existing component as-is, it does not change it.

### Decision 10 — `NoticeListPage` gets an Actions column with a "View" link; `NoticeDetailPage`'s title uses `dts-heading-2`

**Choice**: `NoticeListPage`'s `DataTable` gains a final `Column` whose body renders
`<LangLink to={`/notices/${n.id}`}><Button icon="pi pi-eye" text size="small" /></LangLink>` —
this is the row's only way to reach the detail route. `NoticeDetailPage`'s `<h1>{title}</h1>`
becomes `<h1 className="dts-heading-2">{title}</h1>`.

**Rationale**: Human manual `yarn dev` UI validation (screenshot comparison, this time
against two real `DataTable`-adjacent list pages, not just a static info page) found: (1) there
was no way to navigate from the list to a notice's detail page at all — confirmed via a real
screenshot showing no action affordance on any row; (2) `NoticeDetailPage`'s title rendered as
unstyled plain text, visibly smaller/lighter than every other heading in the app. Both are fixed
using patterns already verified twice independently in this codebase: the `LangLink` +
`Button icon="pi pi-eye"` action-column pattern (`app/routes/$lang+/settings+/geography+/_index.tsx`
and the Hazardous Events list's Actions column), and the `dts-heading-2` class (confirmed styled
in `public/assets/css/style-dts.css`).

**Alternative considered**: Make the entire row clickable instead of a dedicated action button.
Rejected — neither real precedent in this codebase uses whole-row-click navigation; both use a
dedicated action column, so that's the actual established convention, not an invented one.

## Test infrastructure

**PGlite integration tests** (`tests/integration/domains/notices/routes/*.test.ts`): call the
exported `loader` function directly with a constructed `Request` object and a `params` object
(no `React Router` test harness, no HTTP server). Because these calls do not pass through
`root.tsx`'s `middleware`, `getRequestContext()` returns `undefined` inside the loader —
exercising exactly the session-fallback path from Decision 1. Setup import:
`import "../../../db/setup"` (three levels below `tests/integration/db/`) followed by
`import "reflect-metadata"`, matching `NoticesModule.test.ts`'s existing pattern.

**The `getAppContext()` seam.** The loader calls the real, unmodified
`getAppContext().get(UseCase)` (Decision 5) — it is not injectable and takes no test-only
branch. `getAppContext()` reads a module-level `appContext` singleton in `app/init.server.tsx`
that is only ever assigned inside `initServer()`. Integration tests do not call `initServer()`
(confirmed: `NoticesModule.test.ts` never calls it, and its `import "../../db/setup"` mocks only
`~/db.server`, not `~/init.server`), so calling the loader directly in a PGlite test would hit
the real `getAppContext()` guard and throw `"NestJS application context has not been
initialised. Call initServer() first."` instead of exercising the loader's DB-backed behaviour.

This is the same class of problem `tests/integration/db/setup.ts` already solves for the `dr`
DB singleton, via `vi.mock("~/db.server", ...)`. The notices route tests apply the identical
pattern one level up the stack, against the `~/init.server` module instead of `~/db.server`:

```ts
// Setup imports, in order — reflect-metadata before any NestJS decorator is evaluated,
// db/setup before any module resolution touches ~/db.server.
import "../../../db/setup";
import "reflect-metadata";

import { Test, type TestingModule } from "@nestjs/testing";
import { vi, beforeEach, afterEach } from "vitest";
import { NoticesModule } from "~/domains/notices/infrastructure/NoticesModule.server";

// Module-level variable the vi.mock factory closure reads from. vi.mock is hoisted
// above imports by Vitest, but the factory itself only runs when a mocked module is
// first imported — by which point beforeEach has already populated this variable for
// the current test, since the loader (and its `getAppContext()` call) is only invoked
// inside the test body, never at module-evaluation time.
let testingModule: TestingModule;

vi.mock("~/init.server", () => ({
  getAppContext: () => ({
    get: (token: Parameters<TestingModule["get"]>[0]) => testingModule.get(token),
  }),
}));

beforeEach(async () => {
  testingModule = await Test.createTestingModule({ imports: [NoticesModule] }).compile();
});

afterEach(async () => {
  await testingModule.close();
});
```

With this mock in place, the route file's own `import { getAppContext } from "~/init.server"`
resolves to the mocked export, so the loader's `getAppContext().get(ListNoticesUseCase)` call
(unmodified, no test-only conditional) is transparently redirected to the test's local
`Test.createTestingModule({ imports: [NoticesModule] })` instance — the same DI container
`NoticesModule.test.ts` already builds and verifies. This was verified directly: a throwaway
test file constructed exactly this mock, imported `getAppContext` from `~/init.server`, called
`.get(ListNoticesUseCase)`, and confirmed (a) the resolved instance is reference-equal to
`testingModule.get(ListNoticesUseCase)`, and (b) `useCase.execute(...)` completes a real
PGlite-backed DB round-trip through `DrizzleNoticeRepository` with no `as any` and no
TypeScript errors under `yarn tsc`. The verification file was deleted after confirming both
tests passed — it was not part of this proposal's shipped artifacts.

Each `*.test.ts` file under `tests/integration/domains/notices/routes/` repeats this `vi.mock`
block locally (test-file-scoped, not a shared `tests/integration/db/setup.ts`-style global)
because `vi.mock` factories are per-test-file and the `testingModule` each test compiles is
intentionally isolated per test (matching `NoticesModule.test.ts`'s existing
`beforeEach`-per-test isolation, so tests cannot leak DI state into one another).

**Playwright E2E** (`tests/e2e/notices/notices.spec.ts`): runs against the real dev server
(`yarn test:e2e`, `PORT=4000`), so `root.tsx` middleware, `initServer()`, and the real DB all
run for real. This tier is what actually proves the full request path (`middleware` →
`getAppContext()` → use case → `NoticeErrorBoundary`) works end-to-end, since the PGlite tier
above only exercises the loader function against a mocked `getAppContext()`, never the real
`initServer()`-bootstrapped singleton.

## Form-CSV-API pipeline impact

None. Notices has no `fieldsDef`, no CSV import/export, and no legacy `formScreen()` — it is a
Clean Architecture domain with no dependency on the Form-CSV-API pipeline.

## Risks / Trade-offs

- [Risk, known and accepted] This change uses `useViewContext().t({code, msg})` (the pre-existing
  `ViewContext` pattern) and the flat `locales/app/<lang>.json` files, not ADR-001's prescribed
  `react-i18next`/`remix-i18next` stack and namespaced `locales/<lang>/<domain>.json` structure.
  Neither `react-i18next` nor `remix-i18next` is installed in this repo today — ADR-001's
  frontend library decision has not yet been implemented for any domain. New `notices.*` keys
  were added only to `locales/app/en.json`; `fr`/`ar`/other locales have none, so non-English
  users will see the English fallback text (verified: `createTranslationGetter` falls back to
  the call site's inline `msg` when a locale has no entry for a code — it does not error).
  → **Mitigation:** accepted for this pilot because Notices has zero production data and zero
  real non-English users today — the blast radius of the gap is currently nil. A dedicated
  prerequisite OpenSpec intent (adopting `react-i18next`/`remix-i18next` per ADR-001, namespaced
  locale files, `i18next-parser` extraction, and a non-blocking CI check for missing keys across
  locales) is planned as the next intent after this one merges, with retrofitting this domain's
  `t()` calls as that intent's own proof-of-concept task — not deferred indefinitely, tracked as
  a scheduled follow-up.
- [Risk] This is the first production call site for `getAppContext()`. If `initServer()` has
  not completed (e.g. a request arrives during a cold start race), `getAppContext()` throws a
  generic `Error("NestJS application context has not been initialised...")`, which is not a
  `DomainError` and will render as a generic 500 via `NoticeErrorBoundary`'s fallback branch.
  → Mitigation: this is existing, already-specified behavior of `getAppContext()` (see
  `app/init.server.tsx`) and matches the intended behaviour for the ADR-003 "programmer error /
  infrastructure failure" category — no new handling is needed in this change, but it is called
  out here so a future reader understands why the notices loader can legitimately produce a
  bare 500 with no `code` field.
- [Risk] `NoticeErrorBoundary` renders after a serialisation round-trip; if a future change adds
  a field to the `ErrorResponse` envelope in the loader without updating the boundary's parsing,
  the mismatch will not be caught by TypeScript (the boundary receives `unknown` from
  `useRouteError()`). → Mitigation: both the loader and the boundary import the same
  `ErrorResponse` type from a single shared location (introduced in this change, see
  `notice-error-boundary` spec) rather than each defining their own inline shape.
- [Risk] The route adapter is the first place `page`/`pageSize` clamping logic is written for
  Notices; a future REST controller (Phase 5c) may need identical clamping and could
  copy-paste-drift from this implementation. → Mitigation: out of scope for this change to
  pre-emptively extract a shared pagination-parsing utility before a second consumer exists;
  flagged here so the Phase 5c author is aware of the precedent to reuse or generalise.
- [Risk] `_authenticated.tsx` runs `requireUser` but not a tenant check, and React Router v7
  runs all matched loaders in parallel (`Promise.all`), not in parent-then-child order — so the
  notices loader's own tenant check is load-bearing, not a redundant belt-and-suspenders check.
  → Mitigation: this is already how `hazardous-event+/new.tsx` handles it (see its comment at
  line 43-46); the notices loaders follow the same, already-proven pattern.
- [Known gap, out of scope] **Uncoordinated styling layers.** PrimeReact's stock
  `lara-light-blue` theme, a bare Tailwind v4 import, and legacy `style-dts.css` hardcoded hex
  colors are three uncoordinated styling layers with no unified design-token system and no dark
  mode — a pre-existing, app-wide gap this change does not fix, named here so `NoticeListPage`'s
  `DataTable` styling isn't mistaken for an oversight.

## Open Questions

None outstanding — all decisions above were either explicitly settled in the intent brief or
resolved by direct precedent found in the current codebase during Phase 0 research.
