# Notices Pilot Roadmap — Clean Architecture Migration

## Purpose

This document is the implementation roadmap from the current state (ADRs committed,
`feature/foundational-architecture`) through to a live **Notices pilot** that proves the
Clean Architecture + DDD + NestJS Strangler Fig pattern end-to-end.

Notices is a synthetic domain (zero existing data, no migration risk) chosen deliberately
to validate the full architectural stack — domain entity → use case → repository →
NestJS module → React Router route adapter — without touching production data.

Once this pilot is complete and the pattern is proven, every subsequent domain migration
follows the same sequence.

---

## Reading This Document

Work is split into three categories:

| Symbol | Meaning |
|--------|---------|
| 🔷 **OpenSpec Intent** | Invoke `/opsx:propose "<text>"` to generate spec artifacts; implement via `/opsx:apply` |
| ⬜ **Non-OpenSpec task** | Mechanical / unambiguous; create files or run commands directly |
| 🏁 **Phase gate** | Explicit "done" criteria before the next phase begins |

Each OpenSpec Intent lives on its own branch and its own PR to `dev`.
Branch naming: `feature/ca-<intent-slug>`.

Non-OpenSpec tasks are grouped into a single branch: `feature/ca-scaffold-and-deps`.

---

## Phase 0 — Foundation ✅

- ADRs 001–005 written, reviewed, and committed on `feature/foundational-architecture`
- Worktree synced

---

## Phase 1 — Pre-Pilot Structural Fixes

These four fixes are prerequisites for the pilot. They establish the auth layout
pattern, the hook convention, the component contract, and the request-context
infrastructure that the Notices route adapter will build on.

**Parallelism:** P1-8, P1-10, P1-14 are independent and can proceed concurrently.
P1-12 depends on P1-10.

---

### 🔷 P1-8 — Dual Layout Routes: Authenticated + Public

**Branch:** `feature/ca-dual-layout-routes`

**Intent for `/opsx:propose`:**
```
Create two layout route files — app/routes/$lang+/_authenticated.tsx (wraps with
authLoaderWithPerm, redirects unauthenticated users) and app/routes/$lang+/_public.tsx
(passes through without auth check, supports both logged-in and anonymous users) —
then migrate 3–5 representative routes under the correct layout so the pattern is
established; all other routes migrate in their own domain rewrites
```

**Files touched:**
- `app/routes/$lang+/_authenticated.tsx` (new)
- `app/routes/$lang+/_public.tsx` (new)
- 3–5 representative existing routes nested under the correct layout

**Test tier:** Integration + E2E — integration tests (Vitest + vi.mock) verify each layout
loader in isolation. **E2E tests (Playwright) are also required** to verify the full request
lifecycle: unauthenticated navigation redirects to login; authenticated navigation with
`EditData` permission renders the page; authenticated navigation without the permission
shows 403. Route migrations change HTTP request orchestration — that is only verifiable
end-to-end.

> **Lesson learned (P1-8 implementation):** Integration tests with vi.mock passed while two
> runtime bugs existed — parallel React Router v7 loader execution causing wrong auth behaviour,
> and a missing `userSession` injection that `authLoaderWithPerm` had provided implicitly.
> Both were caught only by manual `yarn dev` testing. E2E tests would have caught both
> automatically. Route migration specs MUST include Playwright tests; vi.mock tests alone
> are insufficient for request-lifecycle changes.

**Why now:** The Notices route adapter (Phase 5) must nest cleanly under
`_authenticated.tsx`. Both layouts must exist before any new route uses them.

---

### 🔷 P1-10 — ViewContext Class → useViewContext Hook

**Branch:** `feature/ca-view-context-hook`

**Intent for `/opsx:propose`:**
```
Convert ViewContext in app/frontend/context.ts from a class instantiated with
new ViewContext() to a useViewContext() React hook, so it follows React hook rules
and can be tested in isolation without class instantiation
```

**Files touched:**
- `app/frontend/context.ts` (rewrite)
- All route files calling `new ViewContext()` (search + replace)

**Test tier:** Unit — `useViewContext()` returns the correct `{ t, lang, user }` shape
when root loader data is present.

**Why now:** The Notices presentation layer will call `useViewContext()`. Starting on
the old pattern means an immediate second refactor.

---

### 🔷 P1-12 — Props-Down Page Component Contract

**Branch:** `feature/ca-props-down-contract`  
**Depends on:** P1-10

**Intent for `/opsx:propose`:**
```
Establish a typed PageProps<T> contract for page-level components so they receive
loader data via props rather than calling useLoaderData() internally — pick
HazardousEventListPage as the reference implementation; refactor it to accept
data: HazardousEventListLoaderData as a prop
```

**Files touched:**
- `app/frontend/events/hazardeventlist.tsx`
- `app/routes/$lang+/hazardous-event+/_index.tsx`

**Test tier:** Unit — component renders correctly given props (no loader call in test).

**Why now:** The Notices page component must follow this pattern from day one. Proving
it on one existing component makes it a known-good template.

---

### 🔷 P1-14 — Request-Scoped Session Memoization

**Branch:** `feature/ca-session-memoization`

**Intent for `/opsx:propose`:**
```
Memoize getUserFromSession() within a single request using AsyncLocalStorage so
the session is read from the DB at most once per request regardless of how many
auth checks run in nested loaders or actions
```

**Files touched:**
- `app/utils/session.ts`
- `app/utils/requestContext.server.ts` (new)

**Test tier:** Unit — second call within the same `withRequestContext()` scope does
not hit the DB.

**Note:** `requestContext.server.ts` is also the `AsyncLocalStorage` infrastructure
required by ADR-004 (logging). Later intents extend it with `traceId` propagation.

---

### 🏁 Phase 1 Gate

All four intents merged to `dev`. Running `yarn test:run2 && yarn tsc && yarn format:check`
passes with zero errors on `dev`.

---

## Phase 2 — Shared Infrastructure

### ⬜ 2a — Directory Scaffolding

**Branch:** `feature/ca-scaffold-and-deps`

Create the folder skeleton with `.gitkeep` files:

```
app/
  domains/
    notices/
      domain/
      application/
        use-cases/
        ports/
      infrastructure/
      presentation/
  shared/
    errors/
    logging/
  infrastructure/
```

Commit message: `Refactor: scaffold Clean Architecture directory structure`

---

### 🔷 2b — DomainError Hierarchy

**Branch:** `feature/ca-domain-error-hierarchy`

**Intent for `/opsx:propose`:**
```
Add shared domain error base class DomainError and concrete types (NotFoundError,
ValidationError, AuthorizationError, ConflictError) in app/shared/errors/ — each
with a typed code: string and statusHint: number following ADR-003, usable by all
future domain implementations
```

**Files touched:**
- `app/shared/errors/DomainError.ts` (new)
- `app/shared/errors/index.ts` (barrel export)

**Test tier:** Unit — each type has correct `code`, `statusHint`, `message`, and
`context` fields. No DB dependency.

---

### 🔷 2c — ILogger Port

**Branch:** `feature/ca-ilogger-port`

**Intent for `/opsx:propose`:**
```
Add ILogger port interface in app/shared/logging/ILogger.ts with methods info,
warn, error, debug (each accepting Record<string, unknown>) so use cases declare
ILogger as a dependency and tests inject a no-op — following ADR-004. Add
NoOpLogger in app/shared/logging/NoOpLogger.ts as the test double.
```

**Files touched:**
- `app/shared/logging/ILogger.ts` (new)
- `app/shared/logging/NoOpLogger.ts` (new)

**Test tier:** `yarn tsc` only — TypeScript interface satisfaction is the test.

---

### 🏁 Phase 2 Gate

`yarn tsc` passes with all new files. `yarn test:run2` green.

---

## Phase 3 — NestJS Bootstrap

### ⬜ 3a — Install NestJS Dependencies

**Branch:** `feature/ca-scaffold-and-deps` (same branch as 2a)

```bash
yarn add @nestjs/core @nestjs/common reflect-metadata
yarn add -D @nestjs/testing
```

Add `import 'reflect-metadata'` as the **first import** in `app/entry.server.tsx`.

Commit message: `Feature: add NestJS core dependencies`

---

### 🔷 3b — CoreModule and NestJS Application Context

**Branch:** `feature/ca-nestjs-core-bootstrap`

**Intent for `/opsx:propose`:**
```
Bootstrap NestFactory.createApplicationContext() in app/init.server.tsx with a
CoreModule that provides the Drizzle dr singleton as a DI token DRIZZLE_CLIENT,
so downstream domain modules can inject it — NestJS starts as an application context
only (no HTTP server); existing initDB() still runs first to create the Drizzle
instance before NestJS bootstraps
```

**Files touched:**
- `app/init.server.tsx` (update — add async bootstrap, keep existing init order)
- `app/infrastructure/CoreModule.ts` (new)
- `app/infrastructure/DrizzleProvider.ts` (new)

**Test tier:** Integration — `Test.createTestingModule([CoreModule])` resolves
the `DRIZZLE_CLIENT` token and returns the Drizzle instance.

---

### 🏁 Phase 3 Gate

`yarn dev` starts without error. NestJS application context bootstrap log line is
visible in console output. `yarn tsc` clean.

---

## Phase 4 — Notices Domain

Work through these intents in order. Each depends on the previous.

---

### 🔷 4a — Notices Schema and Migration

**Branch:** `feature/ca-notices-schema-migration`

**Intent for `/opsx:propose`:**
```
Add noticesTable Drizzle schema in app/drizzle/schema/noticesTable.ts with columns:
id UUID PK, countryAccountsId FK (tenant isolation), titleJson JSONB (i18n),
bodyJson JSONB (i18n), isPublished boolean default false, publishedAt TIMESTAMPTZ
nullable, audience TEXT enum ('public'|'private'|'all') default 'private',
createdAt TIMESTAMPTZ, updatedAt TIMESTAMPTZ — then generate migration with yarn dbsync
```

**Files touched:**
- `app/drizzle/schema/noticesTable.ts` (new)
- `app/drizzle/migrations/<timestamp>_add_notices_table.sql` (generated)
- `app/drizzle/migrations/meta/_journal.json` (updated by drizzle-kit)

**Test tier:** PGlite — migration applies cleanly; table has correct columns and
constraints.

> **Note on `audience`:** The pilot serves authenticated users only. The column exists
> from day one so no breaking migration is needed when public/hybrid audience support
> is added. Pilot use cases receive `tenantId` and return all notices regardless of
> audience; audience filtering comes in a later intent.

---

### 🔷 4b — INoticeRepository Port

**Branch:** `feature/ca-inotice-repository-port`

**Intent for `/opsx:propose`:**
```
Define INoticeRepository port interface in
app/domains/notices/application/ports/INoticeRepository.ts with methods:
findById(id: string, tenantId: string): Promise<Notice>,
findAll(tenantId: string, pagination: Pagination): Promise<Notice[]>,
save(notice: Notice): Promise<Notice>,
delete(id: string, tenantId: string): Promise<void> —
this is the contract only; the Drizzle implementation comes in a separate intent
```

**Files touched:**
- `app/domains/notices/application/ports/INoticeRepository.ts` (new)

**Test tier:** `yarn tsc` only — TypeScript interface.

---

### 🔷 4c — Notice Domain Entity

**Branch:** `feature/ca-notice-entity`

**Intent for `/opsx:propose`:**
```
Create Notice domain entity in app/domains/notices/domain/Notice.ts with private
constructor and static create() factory — validates that titleJson has at least one
non-empty locale entry and that publishedAt is null when isPublished is false —
throws ValidationError on violation; entity has zero framework dependencies
```

**Files touched:**
- `app/domains/notices/domain/Notice.ts` (new)
- `app/domains/notices/domain/Notice.test.ts` (new)

**Test tier:** Unit — factory throws `ValidationError` on bad input; constructs
correctly on valid input. Zero DB dependency.

---

### 🔷 4d — CreateNotice Use Case

**Branch:** `feature/ca-create-notice-use-case`

**Intent for `/opsx:propose`:**
```
Add CreateNoticeUseCase in app/domains/notices/application/use-cases/CreateNotice.ts
that accepts CreateNoticeCommand { tenantId, titleJson, bodyJson, isPublished },
constructs a Notice entity via Notice.create() (letting ValidationError propagate),
persists via INoticeRepository.save(), and returns NoticeDto — injects ILogger
and INoticeRepository via constructor
```

**Files touched:**
- `app/domains/notices/application/use-cases/CreateNotice.ts` (new)
- `app/domains/notices/application/dto/NoticeDto.ts` (new)
- `app/domains/notices/application/use-cases/CreateNotice.test.ts` (new)

**Test tier:** Unit — mock repository + NoOpLogger. Happy path returns DTO;
`ValidationError` propagates; repository error propagates.

---

### 🔷 4e — ListNotices Use Case

**Branch:** `feature/ca-list-notices-use-case`

**Intent for `/opsx:propose`:**
```
Add ListNoticesUseCase in app/domains/notices/application/use-cases/ListNotices.ts
that accepts ListNoticesQuery { tenantId, locale, page, pageSize }, fetches from
INoticeRepository.findAll(), maps to NoticeDto[] using the requested locale from
the i18n JSON, and returns an empty array (not an error) when the tenant has no notices
```

**Files touched:**
- `app/domains/notices/application/use-cases/ListNotices.ts` (new)
- `app/domains/notices/application/use-cases/ListNotices.test.ts` (new)

**Test tier:** Unit — mock repository; returns mapped list, empty array for zero results.

---

### 🔷 4f — GetNoticeById Use Case

**Branch:** `feature/ca-get-notice-by-id-use-case`

**Intent for `/opsx:propose`:**
```
Add GetNoticeByIdUseCase in app/domains/notices/application/use-cases/GetNoticeById.ts
that accepts GetNoticeByIdQuery { id, tenantId, locale }, fetches via
INoticeRepository.findById(), throws NotFoundError if not found or if the returned
notice belongs to a different tenant, and maps to NoticeDto
```

**Files touched:**
- `app/domains/notices/application/use-cases/GetNoticeById.ts` (new)
- `app/domains/notices/application/use-cases/GetNoticeById.test.ts` (new)

**Test tier:** Unit — mock repository; returns DTO for valid id+tenant; throws
`NotFoundError` for wrong tenant (tenant isolation enforced at application layer).

---

### 🔷 4g — DrizzleNoticeRepository

**Branch:** `feature/ca-drizzle-notice-repository`

**Intent for `/opsx:propose`:**
```
Implement DrizzleNoticeRepository in
app/domains/notices/infrastructure/DrizzleNoticeRepository.ts fulfilling
INoticeRepository — all queries scoped with eq(noticesTable.countryAccountsId, tenantId);
findById throws NotFoundError when row is missing; unique constraint violations mapped
to ConflictError; injects DRIZZLE_CLIENT token via NestJS DI
```

**Files touched:**
- `app/domains/notices/infrastructure/DrizzleNoticeRepository.ts` (new)
- `tests/integration/domains/notices/DrizzleNoticeRepository.test.ts` (new)

**Test tier:** PGlite integration — CRUD operations with tenant isolation: a notice
created for tenant A is not visible from tenant B.

---

### 🔷 4h — NoticesModule

**Branch:** `feature/ca-notices-module`

**Intent for `/opsx:propose`:**
```
Create NoticesModule in app/domains/notices/infrastructure/NoticesModule.ts as a
NestJS module that registers DrizzleNoticeRepository as the INoticeRepository provider
(using NOTICE_REPOSITORY injection token) and exports CreateNoticeUseCase,
ListNoticesUseCase, GetNoticeByIdUseCase — import into CoreModule so they are
resolvable from the application context
```

**Files touched:**
- `app/domains/notices/infrastructure/NoticesModule.ts` (new)
- `app/infrastructure/CoreModule.ts` (update — add `NoticesModule` to imports)
- `tests/integration/domains/notices/NoticesModule.test.ts` (new)

**Test tier:** Integration — `Test.createTestingModule([NoticesModule])` resolves
all three use cases using PGlite.

---

### 🏁 Phase 4 Gate

`yarn test:run2` fully green. `yarn tsc` clean. All unit and PGlite integration tests
for the Notices domain pass on `dev`.

---

## Phase 5 — Route Adapter and Presentation

### 🔷 5a — Notices Route Adapter

**Branch:** `feature/ca-notices-route-adapter`

**Intent for `/opsx:propose`:**
```
Add React Router route files app/routes/$lang+/notices+/_index.tsx and
app/routes/$lang+/notices+/$id.tsx as thin adapters — loaders resolve use cases from
the NestJS application context, wrap execution in withRequestContext({ traceId,
tenantId, userId }), catch DomainError and return structured ErrorResponse per ADR-003,
return { success: true, data: NoticeDto[] } on success — each route file MUST NOT
exceed 60 lines; no business logic in route files
```

**Files touched:**
- `app/routes/$lang+/notices+/_index.tsx` (new — list)
- `app/routes/$lang+/notices+/$id.tsx` (new — single notice)

**Test tier:** PGlite integration — call the exported `loader` function directly with
a mock `Request`; verify response shape and status codes. E2E Playwright test for
the rendered page.

---

### 🔷 5b — Notices ErrorBoundary

**Branch:** `feature/ca-notices-error-boundary`

**Intent for `/opsx:propose`:**
```
Add NoticeErrorBoundary in app/domains/notices/presentation/NoticeErrorBoundary.tsx
that uses useRouteError() to extract the ErrorResponse shape, renders a user-friendly
error message, and displays the traceId as a copyable error reference — export as
ErrorBoundary from both notices route files per ADR-003
```

**Files touched:**
- `app/domains/notices/presentation/NoticeErrorBoundary.tsx` (new)
- `app/routes/$lang+/notices+/_index.tsx` (update — add `export { ErrorBoundary }`)
- `app/routes/$lang+/notices+/$id.tsx` (update — add `export { ErrorBoundary }`)

**Test tier:** E2E Playwright — navigate to notices with a broken repository; verify
the error boundary renders with a visible, copyable error reference ID.

---

### 🏁 Pilot Complete Gate

All of the following must pass on `dev` before the pilot is declared done:

- [ ] Notices list page renders at `/:lang/notices` for an authenticated user
- [ ] Notices are scoped strictly to the authenticated user's tenant
- [ ] Unauthenticated user is redirected to login
- [ ] Unknown notice ID renders the `NoticeErrorBoundary` with a `traceId`
- [ ] All `yarn test:run2` tests green
- [ ] All `yarn test:e2e` Playwright tests green
- [ ] `yarn tsc` zero errors
- [ ] `yarn format:check` clean

---

## Dependency Graph

```
Phase 1 (parallel):  P1-8 │ P1-10 │ P1-14
                               └───────► P1-12

Phase 2:             2a (dirs) ──────────────────────────────────► 3a (yarn add)
                     2b (DomainError) │ 2c (ILogger)

Phase 3:             3a → 3b (CoreModule bootstrap)

Phase 4:             4a (schema)
                     ├─► 4b (INoticeRepository port)
                     │   ├─► 4c (Notice entity)
                     │   │   ├─► 4d (CreateNotice UC)
                     │   │   ├─► 4e (ListNotices UC)
                     │   │   └─► 4f (GetNoticeById UC)
                     │   └─► 4g (DrizzleNoticeRepository)
                     └─────────────────────────────► 4h (NoticesModule)

Phase 5:             5a (route adapter) → 5b (ErrorBoundary)
```

---

## All OpenSpec Intents at a Glance

| # | Intent | Branch | Test tier |
|---|--------|--------|-----------|
| P1-8 | Dual layout routes (auth + public) | `feature/ca-dual-layout-routes` | Integration |
| P1-10 | ViewContext → useViewContext hook | `feature/ca-view-context-hook` | Unit |
| P1-12 | Props-down page component contract | `feature/ca-props-down-contract` | Unit |
| P1-14 | Session memoization + RequestContext | `feature/ca-session-memoization` | Unit |
| 2b | DomainError hierarchy | `feature/ca-domain-error-hierarchy` | Unit |
| 2c | ILogger port + NoOpLogger | `feature/ca-ilogger-port` | tsc |
| 3b | CoreModule NestJS bootstrap | `feature/ca-nestjs-core-bootstrap` | Integration |
| 4a | Notices schema + migration | `feature/ca-notices-schema-migration` | PGlite |
| 4b | INoticeRepository port | `feature/ca-inotice-repository-port` | tsc |
| 4c | Notice domain entity | `feature/ca-notice-entity` | Unit |
| 4d | CreateNotice use case | `feature/ca-create-notice-use-case` | Unit |
| 4e | ListNotices use case | `feature/ca-list-notices-use-case` | Unit |
| 4f | GetNoticeById use case | `feature/ca-get-notice-by-id-use-case` | Unit |
| 4g | DrizzleNoticeRepository | `feature/ca-drizzle-notice-repository` | PGlite |
| 4h | NoticesModule wiring | `feature/ca-notices-module` | Integration |
| 5a | Notices route adapter | `feature/ca-notices-route-adapter` | PGlite + E2E |
| 5b | Notices ErrorBoundary | `feature/ca-notices-error-boundary` | E2E |

---

## Non-OpenSpec Tasks

| Task | Branch | Action |
|------|--------|--------|
| 2a — Directory scaffold | `feature/ca-scaffold-and-deps` | Create `app/domains/`, `app/shared/`, `app/infrastructure/` with `.gitkeep` |
| 3a — NestJS install | `feature/ca-scaffold-and-deps` | `yarn add @nestjs/core @nestjs/common reflect-metadata` + `yarn add -D @nestjs/testing` |
| reflect-metadata import | `feature/ca-scaffold-and-deps` | Add `import 'reflect-metadata'` as first import in `app/entry.server.tsx` |

---

## Architectural Decisions Informing This Plan

| ADR | Decision most relevant here |
|-----|----------------------------|
| [ADR-001](../decisions/ADR-001-multilingual-strategy.md) | `titleJson` / `bodyJson` JSONB for i18n; locale passed to use cases as `string` |
| [ADR-002](../decisions/ADR-002-timezone-handling.md) | `publishedAt` uses `TIMESTAMPTZ`; `createdAt`/`updatedAt` use `TIMESTAMPTZ` |
| [ADR-003](../decisions/ADR-003-error-handling-architecture.md) | `DomainError` hierarchy; `ErrorResponse` envelope; `ErrorBoundary` per domain |
| [ADR-004](../decisions/ADR-004-logging-and-traceability.md) | `ILogger` port; `AsyncLocalStorage` request context; `traceId` in every log line |
| [ADR-005](../decisions/ADR-005-currency-storage-and-conversion.md) | Not applicable to Notices — no monetary values |
