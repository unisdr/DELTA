# Phase 1 — Structural Improvements

> Structural improvements with measurable performance, testability, or maintainability payoff. Safe to ship behind feature flags where applicable.
>
> **48 items** — check status in [`../INDEX.md`](../INDEX.md)

---

### P1-1 · Configure Explicit DB Connection Pool

| | |
|---|---|
| **Issue** | ISSUE-001 |
| **File** | `app/db.server.ts:20` |
| **Current** | `dr = drizzle(process.env.DATABASE_URL!, { logger: false, schema })` — defaults to 10 connections |

**TDD steps:**
1. `test(red):` Write unit test asserting `initDB()` throws if `DATABASE_POOL_MAX` is not a valid integer in range [5, 200].
2. `test(red):` Write integration test asserting pool does not exhaust under 20 concurrent requests.
3. `fix:` Replace raw URL string with explicit `pg.Pool`:

```typescript
// app/db.server.ts — target state
import { Pool } from "pg";

export function initDB() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: Number(process.env.DATABASE_POOL_MAX ?? 20),
    idleTimeoutMillis: Number(process.env.DATABASE_POOL_IDLE_TIMEOUT_MS ?? 30000),
    connectionTimeoutMillis: Number(process.env.DATABASE_POOL_CONNECT_TIMEOUT_MS ?? 5000),
    statement_timeout: Number(process.env.DATABASE_STATEMENT_TIMEOUT_MS ?? 10000),
  });
  dr = drizzle(pool, { logger: false, schema });
}
```

**New env vars to document in `example.env`:** `DATABASE_POOL_MAX`, `DATABASE_POOL_IDLE_TIMEOUT_MS`, `DATABASE_POOL_CONNECT_TIMEOUT_MS`, `DATABASE_STATEMENT_TIMEOUT_MS`.

---

---

### P1-2 · Introduce Session Write Threshold

| | |
|---|---|
| **Issue** | ISSUE-002 |
| **File** | `app/utils/session.ts:196–199` |
| **Current** | `UPDATE session SET lastActiveAt = now` runs on **every** authenticated request (162 call sites) |

**TDD steps:**
1. `test(red):` Write test asserting `getUserFromSession` does NOT issue a DB update when `lastActiveAt` was updated less than `SESSION_ACTIVITY_WRITE_THRESHOLD_MINUTES` ago.
2. `test(red):` Write test asserting it DOES update when last activity was older than the threshold.
3. `fix:` Wrap the UPDATE in a conditional:

```typescript
// app/utils/session.ts:196 — target state
const WRITE_THRESHOLD_MINUTES = Number(process.env.SESSION_ACTIVITY_WRITE_THRESHOLD_MINUTES ?? 5);

if (minutesSinceLastActivity > WRITE_THRESHOLD_MINUTES) {
  await dr.update(sessionTable)
    .set({ lastActiveAt: now })
    .where(eq(sessionTable.id, sessionId));
}
```

**New env var:** `SESSION_ACTIVITY_WRITE_THRESHOLD_MINUTES` (default `5`).

---

---

### P1-3 · Rewrite Cost Calculator — Eliminate N+1 Query Loop

| | |
|---|---|
| **Issue** | ISSUE-006 |
| **File** | `app/backend.server/models/analytics/disaster-events-cost-calculator.ts:246–273` |
| **Current** | `for` loop issuing one `SELECT` per sector-record pair inside the write transaction |

**TDD steps:**
1. `test(red):` Write integration-realdb test for a disaster event with 10 records × 3 sectors each. Assert `calculateTotals` completes in < 100ms and the Drizzle logger records exactly 1 SQL query (not 30+).
2. `fix:` Replace the loop with a single SQL query using `LEFT JOIN` + `COALESCE` + `SUM`:

```typescript
// Target: one query using conditional aggregation
const result = await tx
  .select({
    totalRecoveryCost: sql<number>`
      COALESCE(SUM(
        COALESCE(sdr.damage_recovery_cost::numeric,
                 d.total_recovery::numeric, 0)
      ), 0)`,
  })
  .from(sectorDisasterRecordsRelationTable.as("sdr"))
  .leftJoin(damagesTable.as("d"), and(
    eq(sql`d.record_id`, sql`sdr.disaster_record_id`),
    eq(sql`d.sector_id`, sql`sdr.sector_id`),
  ))
  .where(inArray(sectorDisasterRecordsRelationTable.disasterRecordId, recordIds));
```

3. Move `updateTotalsUsingDisasterRecordId` **out of the write transaction** — call it after `tx` commits using `setImmediate` or queue it via pg-boss (introduced in Phase 3).

---

---

### P1-4 · Audit Client Bundle for Server-Only Package Leakage

| | |
|---|---|
| **Observed** | `nodemailer` appeared in Vite's `(client)` optimized dependencies log when visiting the accept-invite page — a Node.js-only package has no place in a browser bundle |
| **Root cause (hypothesis)** | Files in `app/backend.server/` (104 files) lack the `.server.ts` suffix. React Router v7's Vite plugin guarantees server-only isolation via this naming convention. Without it, tree-shaking of server imports in route files is best-effort and not guaranteed — complex import chains (e.g. `invite.ts → email.ts → nodemailer`) can leak into the client bundle |
| **Risk** | Server-only packages in client bundle = potential exposure of DB connection logic, password hashing, email internals. Also causes blank-page delays in dev as Vite tries to pre-bundle Node.js packages for the browser |

#### Action required (before fixing)

Run `yarn build` and audit the generated client bundles:

```bash
yarn build
# then grep client bundle output for known server-only packages:
grep -r "nodemailer\|bcryptjs\|drizzle-orm\|pg\b\|node-postgres" dist/client/assets/
```

If any server-only strings appear in `dist/client/`, the leak is confirmed. The full extent determines the fix scope — whether it's a few specific files or a systematic rename of all 104 files in `backend.server/`.

**Do not rename files or fix imports until the audit confirms the scope.**

**Measure:** Zero server-only package references in `dist/client/assets/` after fix.

---

---

### P1-5 · Fix Vite Lazy Dependency Discovery in Dev Mode

| | |
|---|---|
| **Observed** | First visit to any route triggers a Vite re-optimisation + full page reload in dev. Seen with `primereact/tabview`, `react-icons/fa`, `primereact/datatable` etc. |
| **File** | `vite.config.ts:51` — `optimizeDeps.include` only lists `react`, `react-dom`, `react-router` |
| **Impact** | Dev-only. No production impact. Jarring UX during local development. |

#### Root cause

Vite lazily discovers dependencies by scanning imports as routes are first visited. When it finds a package not in its pre-bundle cache, it re-optimises and forces a full page reload. This will keep happening for every new route visited in a fresh `yarn dev` session.

The workaround (`optimizeDeps.include` listing every PrimeReact subpackage) is a manual maintenance burden — any new import added to the codebase would require a corresponding update to the config.

#### Approach to decide at implementation time

The right solution should make Vite aware of all client-side dependencies **structurally** at startup, not through a hand-maintained list. Options to evaluate:

1. **Central eager-import barrel** — a shared module imported early (e.g. app entry point) that re-exports all shared UI packages, giving Vite a single place to scan
2. **React Router Vite plugin route scanning** — investigate if `@react-router/dev/vite` exposes a hook to pre-scan all route files for imports at startup
3. **`optimizeDeps.include` with code-gen** — a small script that scans `app/**/*.{ts,tsx}` for `from "primereact/..."` imports and writes `vite.config.ts` automatically, so the list stays in sync

**Do not implement until approach is agreed.**

**Measure:** Zero `[vite] ✨ new dependencies optimized` log lines after navigating through all main routes in a fresh `yarn dev` session.

---

---

### P1-6 · Translation Import — Fix Workflow Gap + Parallelise Startup Queries

| | |
|---|---|
| **Observed** | "Skipping outdated translation" warnings on every import run; slow startup when import is triggered |
| **Files** | `app/backend.server/services/translationDBUpdates/sources.ts:147`, `update.ts:241` |

#### Root cause

Translation entries use **content-hash IDs**: `<type>.<uuid>.<sha256-6-chars>`. The hash is derived from the English source text at export time. When a DB record's English text changes, its hash changes — invalidating all translated entries for that record. The importer skips non-matching IDs (correct behaviour), but this exposes a **workflow gap**: locale files are out of sync with current DB content, meaning `ar/es/fr/ru/zh` users see untranslated strings.

Two separate technical issues compound the slow startup:

1. **9 sequential DB queries** in `sources.ts:147` — one per table/column, not parallelised
2. **Individual `UPDATE` per grouped row** in `update.ts:241` — many DB round-trips instead of a batch

#### Fix A — Workflow (functional, zero code change, highest value)

Re-export and re-import translations to regenerate locale files against current DB content:

```bash
yarn export_tables_for_translation   # regenerates locales/content/*.json
# send files for translation if needed, then:
yarn import_translation_tables        # re-imports translated CSV back
```

**Measure:** `Skipping outdated translation` warning count drops to 0 on next startup.

#### Fix B — Parallelise source queries (technical)

In `sources.ts`, replace the sequential `for` loop with `Promise.all`:

```typescript
// sources.ts:147 — current (sequential)
for (const src of sources) {
  const rows = await src.query();
  ...
}

// target state
const allRows = await Promise.all(sources.map(src => src.query().then(rows => ({ src, rows }))));
for (const { src, rows } of allRows) { ... }
```

**TDD steps:**
1. `test(red):` Log query timing — assert `getTranslationSources()` completes in < 200ms with a seeded DB (currently dominated by 9 serial round-trips).
2. `perf:` Apply `Promise.all` change.

#### Fix C — Batch DB updates (technical)

In `update.ts:241`, replace individual awaited updates with a single transaction using `jsonb_set` or `||` merge:

```typescript
// target state — one transaction, all updates batched
await dr.transaction(async (tx) => {
  for (const { table, column, id, translations } of grouped.values()) {
    await tx.update(table)
      .set({ [column]: sql`${table[column]} || ${JSON.stringify(translations)}::jsonb` })
      .where(eq(table["id"], id));
  }
});
await setLastTranslationImportAt(now);
```

**Measure:** Log `elapsed_ms` in `importTranslationsIfNeeded()` before and after. Target: < 500ms for a full import run.

#### Severity summary

| Concern | Type | Priority |
|---|---|---|
| Outdated translation IDs — missing translations for non-EN users | Functional | **High** — Fix A first |
| 9 sequential source queries at startup | Performance | Medium — Fix B |
| Per-row UPDATE round-trips | Performance | Low — Fix C |

---

---

### P1-7 · Complete UI Migration — Legacy `fieldsDef` Forms → PrimeReact + Tailwind

| | |
|---|---|
| **Observed** | Create/edit routes render visibly older UI (custom `dts-form` CSS classes, `mg-button`) while list pages, modals, and settings use the newer PrimeReact + Tailwind design |
| **Status** | In-progress migration — new system is adopted for lists/views, old system remains on forms |

#### Two coexisting design systems

**Old system** — `fieldsDef`-driven, `formScreen()` renderer (`app/frontend/form.tsx`):
- CSS: `dts-form`, `dts-form-component`, `mg-button`, `mg-button-primary`
- Forms rendered automatically from `fieldsDef` schema — no bespoke JSX per field
- Powers the Form-CSV-API pattern (CSV import/export and API driven by same definition)

**New system** — hand-crafted PrimeReact + Tailwind:
- Components: `Card`, `DataTable`, `Button`, `Dialog`, `Dropdown` etc. from `primereact/*`
- Layout via Tailwind utility classes

#### Routes still on old system (need migration)

| Route | File |
|---|---|
| Hazardous event — new | `hazardous-event+/new.tsx` |
| Hazardous event — edit | `hazardous-event+/edit.$id.tsx` |
| Disaster event — edit | `disaster-event+/edit.$id.tsx` |
| Disaster record — edit secondary | `disaster-record+/edit-sec.$disRecId+/_index.tsx` |
| Disaster record — damages edit | `disaster-record+/edit-sub.$disRecId+/damages+/edit.$id.tsx` |
| Disaster record — disruptions edit | `disaster-record+/edit-sub.$disRecId+/disruptions+/edit.$id.tsx` |
| Disaster record — losses edit | `disaster-record+/edit-sub.$disRecId+/losses+/edit.$id.tsx` |
| Disaster record — non-economic losses | `disaster-record+/non-economic-losses.$id+/_index.tsx` |
| Settings — assets | `settings+/assets+/_index.tsx`, `settings+/assets+/edit.$id.tsx` |
| Settings — geography upload | `settings+/geography+/upload.tsx` |

#### Frontend components still mixing old CSS

`app/frontend/form.tsx`, `app/frontend/events/hazardeventform.tsx`, `app/frontend/division.tsx`, `app/frontend/hip/hazardpicker.tsx`, `app/frontend/spatialFootprintFormView.tsx` and ~10 others still use `dts-form*` / `mg-button*` classes.

#### Important constraint

The `fieldsDef` / `formScreen()` pattern is not just UI — it also drives **CSV import/export and REST API**. Migrating a form to hand-crafted PrimeReact JSX must not break the CSV/API layer. Ensure `fieldsDef` is preserved on the model even after replacing the form rendering.

**Measure:** Zero `dts-form`, `mg-button` class usages in route files. Visual consistency audit across all create/edit routes.

---

---

### P1-8 · Add Top-Level Authenticated Layout Route

| | |
|---|---|
| **Issue** | Structural / maintainability |
| **Current** | No `_layout.tsx` exists at `app/routes/$lang+/`. Every authenticated route independently calls `authLoader`/`authLoaderWithPerm`, renders `<MainMenuBar>`, and assembles its own full-page chrome. Auth logic is duplicated across 200+ route loaders. |
| **Impact** | Any change to auth enforcement or the nav shell must be applied to every route individually. A route that forgets to call `authLoader` silently becomes publicly accessible. |

**What a root authenticated layout provides:**

1. Auth check runs once — any unauthenticated request redirects to login from a single place
2. `<MainMenuBar>` rendered once — guaranteed consistent across all authenticated pages
3. `<Outlet />` injects page content — child routes only render their own content, no shell duplication

**Implementation approach (Strangler Fig — do not break existing routes):**

1. Create `app/routes/$lang+/_layout.tsx` with `authLoader` + `<MainMenuBar>` + `<Outlet />`
2. Migrate routes section by section — verify each section works under the layout before removing its local `authLoader` call
3. Keep per-route permission checks (`authLoaderWithPerm("ViewData", ...)`) in place — the layout handles authentication (is the user logged in?), individual routes handle authorisation (does this user have permission X?)

**Note:** The `admin+/` section uses a separate super admin session — it should NOT be wrapped by the user-session layout. Keep `admin+/` routes independent.

**TDD steps:**
1. `test(red):` Write an E2E test asserting that visiting any authenticated route without a session redirects to `/login`. Verify it catches a route that currently has no `authLoader` (e.g., after temporarily removing auth from one route).
2. `feat:` Create the root layout. Migrate one section (e.g., `settings+/`) as a pilot.
3. `refactor:` Migrate remaining sections iteratively.

**Measure:** All authenticated page routes removed of their `authLoader` boilerplate; auth redirect test passes for all sections.

---

---

### P1-9 · Consolidate UI Directory Structure

| | |
|---|---|
| **Issue** | Structural / maintainability |
| **Current** | UI code lives in four locations: `app/components/`, `app/frontend/`, `app/frontend/components/`, `app/pages/` — with no documented convention. `app/frontend/pagination/api.server.ts` (server-only code) lives inside the client-side `frontend/` directory. `settings/nav.tsx` is a component file co-located in `app/routes/`. |

**Target structure:**
```
app/
├── routes/       ← routing only (loader, action, meta, <PageComponent />)
├── pages/        ← full-page components, one per route section
├── components/   ← generic, domain-agnostic UI (charts, maps, dialogs)
└── frontend/     ← domain-specific helpers during migration; dissolve as migration completes
    └── utils/, hooks/  ← move to app/utils/ when frontend/ is dissolved
```

**Steps:**
1. Document the convention above in `CLAUDE.md` — prevents further ad-hoc additions
2. Move `app/frontend/pagination/api.server.ts` → `app/backend.server/pagination/` (it is server-only request parsing)
3. Move `app/routes/$lang+/settings/nav.tsx` → `app/frontend/` or `app/components/` (component file does not belong in `routes/`)
4. Do not yet dissolve `app/frontend/` — wait until form migration (P1-7) reaches ~80%

**No TDD needed** — structural move only. Verify by running `yarn tsc` with zero new errors after each move.

---

---

### P1-10 · Replace `ViewContext` Class with `useViewContext()` Hook

| | |
|---|---|
| **Issue** | Architectural / testability |
| **File** | `app/frontend/context.ts` |
| **Current** | `ViewContext` is a class that calls `useRouteLoaderData("root")` inside its constructor. Every component does `new ViewContext()` at render time. Calling hooks inside a class constructor violates React's rules of hooks — works in practice but is fragile, untestable, and prevents memoization. |

**Impact:**
- Cannot render any component in unit tests or Storybook without a full React Router context
- Cannot inject a mock context for testing
- Every render creates a new `ViewContext` instance — translator and url helper are re-constructed on every render

**TDD steps:**
1. `test(red):` Write a unit test that renders a simple component using `ViewContext` outside a router context. Assert it renders without throwing. Currently it will throw.
2. `refactor:` Convert to a React context + custom hook:

```ts
// app/frontend/context.ts — target state
const ViewContextReact = React.createContext<ViewContextValue | null>(null);

export function ViewContextProvider({ children }: { children: React.ReactNode }) {
    const rootData = useRouteLoaderData("root") as CommonData;
    const value = useMemo(() => buildViewContextValue(rootData), [rootData]);
    return <ViewContextReact.Provider value={value}>{children}</ViewContextProvider>;
}

export function useViewContext(): ViewContextValue {
    const ctx = useContext(ViewContextReact);
    if (!ctx) throw new Error("useViewContext must be used within ViewContextProvider");
    return ctx;
}
```

3. `refactor:` Add `<ViewContextProvider>` to the root layout. Replace all `new ViewContext()` call sites with `useViewContext()` — this is a mechanical find-and-replace across the codebase.

**Measure:** `new ViewContext()` grep returns zero results. Components can be rendered in Vitest without a React Router context wrapper.

---

---

### P1-11 · Establish Design Tokens in `tailwind.config.ts`

| | |
|---|---|
| **Issue** | Maintainability / brand consistency |
| **Current** | UNDRR brand blue `#004F91` is hardcoded as arbitrary Tailwind values (`text-[#004F91]`, `bg-[#004F91]`) in multiple files. One instance has a bug: `'text-[#004F91]'` with literal single quotes inside the string (in `MainMenuBar.tsx`). No design tokens defined anywhere. |

**Steps:**
1. `fix:` Create `tailwind.config.ts` (or extend existing) with a `theme.extend.colors` block:
```ts
theme: {
    extend: {
        colors: {
            brand: {
                primary: '#004F91',
                // add secondary, accent as needed
            }
        }
    }
}
```
2. `refactor:` Replace all `text-[#004F91]` / `bg-[#004F91]` occurrences with `text-brand-primary` / `bg-brand-primary`
3. `fix:` Fix the `MainMenuBar.tsx` bug (`'text-[#004F91]'` with quotes)
4. Add a lint rule (or Tailwind plugin) to flag new arbitrary color values

**Measure:** Zero `[#004F91]` grep results in `app/`. Zero arbitrary hex color values (`\[#[0-9a-fA-F]+\]`) in new component files after this point.

---

---

### P1-12 · Enforce Props-Down Contract for Page Components

| | |
|---|---|
| **Issue** | Architectural / testability / reusability |
| **Files** | `app/pages/AccessManagementPage.tsx`, `app/pages/OrganizationManagementPage.tsx` and all future pages |
| **Current** | Page components call `useLoaderData<typeof loader>()` internally, importing the loader type directly from the route file. This is 1:1 page-to-route coupling — the page cannot be used by any other route, cannot be tested without a full router context, and cannot receive data from a different source. |

**Target pattern:**
```tsx
// Route file — owns data fetching
export default function RouteShell() {
    const data = useLoaderData<typeof loader>();
    return <AccessManagementPage items={data.items} organizations={data.organizations} />;
}

// Page component — pure, props-in, no router hooks
interface AccessManagementPageProps {
    items: UserCountryAccount[];
    organizations: Organization[];
}
export default function AccessManagementPage({ items, organizations }: AccessManagementPageProps) {
    // no useLoaderData, no useRouteLoaderData
}
```

**Steps:**
1. Document this contract in `CLAUDE.md` under a new "Page Component Convention" section — all future pages follow this pattern
2. Migrate existing `app/pages/` files to the props-down pattern as part of their next touch
3. When migrating old `formScreen()` forms, apply this pattern from the start — do not repeat the `useLoaderData` inside page components anti-pattern

**No separate TDD needed** — covered by P1-10's unit test requirement: a component following this pattern is naturally testable without a router context.

**Measure:** Zero `useLoaderData` or `useRouteLoaderData` calls inside files in `app/pages/`.

---

---

### P1-13 · Parallelize Root Loader Independent Async Calls

| | |
|---|---|
| **Issue** | Performance — every page load |
| **File** | `app/root.tsx:62–138` |
| **Current** | 8 sequential `await` calls in the root loader. Calls 1–7 are independent — none of their results feed into another. Total wait time = sum of all 7 sequential DB/session operations on every page load. |

**Fix:** Group independent calls under `Promise.all`:

```ts
// app/root.tsx — target state
const [user, superAdminSession, session, userRole, countryAccountsId, settings, userForFrontend] =
    await Promise.all([
        getUserFromSession(request),
        getSuperAdminSession(request),
        sessionCookie().getSession(request.headers.get("Cookie")),
        getUserRoleFromSession(request),
        getCountryAccountsIdFromSession(request),
        getCountrySettingsFromSession(request),
        authLoaderGetOptionalUserForFrontend(routeArgs),
    ]);
const translations = loadTranslations(lang); // synchronous cache lookup, no await needed
```

**Note:** This depends on P1-14 (session memoization) being done first, otherwise multiple parallel calls will each parse the cookie independently and race on the session store.

**TDD steps:**
1. `test(red):` Add a timing assertion — mock each session function to delay 50ms, assert root loader resolves in < 200ms (not > 350ms as sequential would require).
2. `perf:` Apply `Promise.all` refactor.

**Measure:** Root loader wall-clock time drops by ~60% on a typical page load (measured via server-timing headers).

---

---

### P1-14 · Request-Scoped Session Memoization

| | |
|---|---|
| **Issue** | Performance — redundant work per request |
| **Files** | `app/utils/session.ts` — all session helper functions |
| **Current** | `getUserFromSession`, `getSuperAdminSession`, `getUserRoleFromSession`, `getCountryAccountsIdFromSession` each independently call `sessionCookie().getSession(request.headers.get("Cookie"))`. On a typical authenticated edit page, the session cookie is parsed 8+ times per HTTP request. |

**Fix:** Memoize session parsing at the request boundary using a `WeakMap` keyed on the `Request` object:

```ts
// app/utils/session.ts — add memoization layer
const sessionCache = new WeakMap<Request, ReturnType<typeof sessionCookie>["getSession"] extends (...args: any) => infer R ? R : never>();

export async function getSession(request: Request) {
    if (sessionCache.has(request)) return sessionCache.get(request)!;
    const session = await sessionCookie().getSession(request.headers.get("Cookie"));
    sessionCache.set(request, session);
    return session;
}
```

All session helpers then call `getSession(request)` instead of `sessionCookie().getSession(...)` directly. The `WeakMap` ensures no memory leak — entries are GC'd when the `Request` object goes out of scope at the end of the request.

**TDD steps:**
1. `test(red):` Assert that calling `getUserFromSession` + `getUserRoleFromSession` on the same `Request` results in exactly one call to `sessionCookie().getSession`. Currently it will be two.
2. `refactor:` Introduce `getSession(request)` memoization helper. Update all callers.

**Measure:** `sessionCookie().getSession` called exactly once per `Request` object. Confirm via test spy.

---

---

### P1-15 · Use `defer()` for Heavy Loaders — Progressive Page Rendering

| | |
|---|---|
| **Issue** | Performance — perceived load time on slow connections |
| **Files** | `app/routes/$lang+/hazardous-event+/edit.$id.tsx`, `app/routes/$lang+/disaster-event+/edit.$id.tsx`, and other edit routes loading tree/GeoJSON data |
| **Current** | Edit page loader awaits 6 queries sequentially (event record, HIP data, division tree, division GeoJSON, country settings, validator users) before sending any HTML. Field workers on slow connections see a blank page until all complete. |

**Fix:** Use React Router's `defer()` to split critical path data (needed for initial render) from deferred data (can stream in after shell):

```ts
// edit.$id.tsx loader — target state
export const loader = authLoaderWithPerm("EditData", async (args) => {
    const item = await getItem2(ctx, params, hazardousEventById); // critical — needed for form
    const user = await authLoaderGetUserForFrontend(args);         // critical — affects form display

    return defer({
        item,          // resolved immediately — page shell renders
        user,
        hip: dataForHazardPicker(ctx),              // deferred — streams in
        treeData: loadDivisionTree(countryAccountsId), // deferred — streams in
        divisionGeoJSON: loadDivisionGeoJSON(countryAccountsId), // deferred — streams in
    });
});
```

In the component, wrap deferred values in `<Suspense>` + React Router's `<Await>`:
```tsx
<Suspense fallback={<LoadingSpinner />}>
    <Await resolve={data.treeData}>
        {(treeData) => <DivisionTreeSelector data={treeData} />}
    </Await>
</Suspense>
```

**TDD steps:**
1. `test(red):` E2E test asserting the form title is visible within 1 second on a throttled (Slow 3G) connection. Currently fails because all data must load before any HTML arrives.
2. `perf:` Apply `defer()` to the edit loader, splitting critical from deferred data.

**Measure:** Time-to-first-meaningful-paint on the edit page drops to < 1s on a simulated 3G connection (Lighthouse / Playwright network throttling).

---

---

### P1-16 · Fix N+1 in Email Validator Loop — Batch User Fetch

| | |
|---|---|
| **Issue** | Performance — DB round-trips per validation notification |
| **File** | `app/backend.server/services/emailValidationWorkflowService.ts:118–139` |
| **Current** | `emailAssignedValidators` fetches each validator user individually inside a `for` loop: one `UserRepository.getById(userId)` call per validator, plus one call for the submitter. 5 assigned validators = 6 sequential DB round-trips before any email is sent. |

**Fix:** Replace the sequential loop with a batch fetch:

```ts
// Before
for (const userId of validatorUserIds) {
    const user = await UserRepository.getById(userId); // DB call per iteration
    ...
}

// After
const [submitter, ...validators] = await UserRepository.getByIds([
    submittedByUserId,
    ...validatorUserIds,
]);
// then iterate over validators without any DB calls
```

`UserRepository.getByIds` does not yet exist — add it alongside `getById` as a single `WHERE id = ANY($1)` query.

**TDD steps:**
1. `test(red):` Call `emailAssignedValidators` with 3 validators. Assert `UserRepository.getById` is called at most 1 time (batch fetch), not 4.
2. `feat:` Add `UserRepository.getByIds(ids: string[])`. Update `emailAssignedValidators` to use it.

**Measure:** `UserRepository.getById` call count = 0 inside the validator loop. Total user fetches = 1 batch query regardless of validator count.

---

---

### P1-17 · Register `form_test.ts` with Vitest — Fix Test Framework Split

| | |
|---|---|
| **Issue** | Test infrastructure — tests not running in CI |
| **Files** | `app/backend.server/handlers/form/form_test.ts`, `app/backend.server/handlers/all_test.ts`, `app/backend.server/all_test.ts` |
| **Current** | `form_test.ts` (820+ lines covering the entire Form-CSV-API triple) uses Node.js's built-in test runner (`import { describe, it } from "node:test"`). It lives under `app/`, not `tests/`. The Vitest config only includes `tests/**`. These tests almost certainly do not run in `yarn test:run2` — the most thoroughly tested abstraction in the codebase may be excluded from CI. |

**Fix options (pick one):**

1. **Migrate to Vitest** (recommended): Replace `import { describe, it, before } from "node:test"` with Vitest equivalents (`import { describe, it, beforeAll } from "vitest"`). Move the file to `tests/unit/handlers/form/form.test.ts`. No logic changes needed — Vitest's API is compatible.
2. **Add a separate Node runner script**: Add `"test:node": "node --test app/backend.server/all_test.ts"` to `package.json` and add it to CI. Keeps Node runner but makes it explicit.

**Recommended: Option 1** — a single test framework reduces cognitive overhead and means all tests run under the same coverage reporter.

**TDD steps:**
1. `test:` Confirm the current gap: run `yarn test:run2` and verify `form_test.ts` coverage is not reported.
2. `chore:` Migrate to Vitest. Verify `yarn test:run2` now includes and passes all `form_test` cases.

**Measure:** `yarn coverage` report includes `app/backend.server/handlers/form/form.ts` with ≥ 80% coverage (currently the tests exist but may not count toward coverage).

---

---

### P1-18 · Fix `getDescendantDivisionIds` Full Table Scan

| | |
|---|---|
| **Issue** | Performance — full table transfer for every geographic filter call |
| **File** | `app/backend.server/utils/geographicFilters.ts:105–144` |
| **Current** | `getDescendantDivisionIds(divisionId)` fetches ALL rows from `divisionTable` (every administrative division in the database), builds a JavaScript `Map`, and traverses the tree in-memory to find descendants. A country with 5,000 sub-divisions transfers all 5,000 rows on every geographic filter call. |

**Fix:** Replace with a PostgreSQL recursive CTE or the existing stored procedure pattern already used elsewhere in the codebase:

```ts
// Option A — recursive CTE (no new stored procedure needed)
const descendants = await dr.execute(sql`
    WITH RECURSIVE descendants AS (
        SELECT id FROM division WHERE id = ${divisionId}
        UNION ALL
        SELECT d.id FROM division d
        INNER JOIN descendants anc ON d.parent_id = anc.id
    )
    SELECT id FROM descendants
`);
return descendants.rows.map(r => r.id as string);

// Option B — use existing stored procedure if one exists for divisions
// (dts_get_sector_descendants pattern already used in disaster_record.ts)
```

Also: add a TTL or invalidation hook to `divisionCache` (currently a module-level `Map` with no expiry).

**TDD steps:**
1. `test(red):` Assert `getDescendantDivisionIds` with 1 parent division makes exactly 1 DB query regardless of total division count. Currently it fetches all rows.
2. `perf:` Replace full-table fetch with recursive CTE.

**Measure:** `EXPLAIN ANALYZE` shows no `Seq Scan` on `division` table for geographic filter calls. Query count = 1 per geographic filter application.

---

---

### P1-19 · Remove Dev/Prod Behavioral Split in Geographic Filter

| | |
|---|---|
| **Issue** | Correctness — different filter behavior in dev vs production |
| **File** | `app/backend.server/utils/geographicFilters.ts:238–269` |
| **Current** | `applyGeographicFilters()` contains a `NODE_ENV === "development"` branch that, when a "preferred spatial format" is detected, **returns early without adding any spatial filter condition**. In development mode, geographic filtering is silently skipped. This means geographic filter behavior cannot be tested in the development environment — dev and production return different results for the same query. |

**Fix:** Remove the `NODE_ENV === "development"` short-circuit branch entirely. If the debug format analysis is needed during development, keep `debugMatchedGeoFormat()` as a standalone utility callable on demand, but do not let it alter the filter logic:

```ts
// Remove this entire block:
if (process.env.NODE_ENV === "development" && rawSpatialData) {
    // ...
    if (preferred) {
        return baseConditions; // ← this must be removed
    }
}
```

**TDD steps:**
1. `test(red):` Write a test calling `applyGeographicFilters` with `NODE_ENV=development` and `rawSpatialData` containing a "preferred format". Assert the returned conditions array is longer than the input (filter was applied), not equal (filter was skipped).
2. `fix:` Remove the dev-only branch.

**Measure:** `applyGeographicFilters` returns identical conditions in both `NODE_ENV=development` and `NODE_ENV=production`. Zero `process.env.NODE_ENV` checks in filter logic files.

---

---

### P1-20 · Enforce `tx` on All `logAudit` Calls Inside Transactions

| | |
|---|---|
| **Issue** | Correctness — audit log integrity |
| **File** | `app/backend.server/models/auditLogs.ts` — `logAudit` |
| **Current** | `logAudit(action, type, id, userId, tx?)` accepts an optional `tx`. When `tx` is omitted, the audit insert uses the global `dr` connection — outside any surrounding transaction. If the calling transaction rolls back, the audit record remains committed. Audit logs can contain entries for failed/rolled-back operations. |

**Fix (two parts):**

**Part A — Make `tx` required on the internal function:**
```ts
// Add a strict variant that requires tx
export async function logAuditInTx(
    action: string, entityType: string, entityId: string, userId: string,
    tx: Tx,  // required — no default fallback
): Promise<void> {
    await tx.insert(auditLogsTable).values({ ... });
}
```

**Part B — Add ESLint rule to prevent bare `logAudit` calls inside transaction callbacks:**
Use `no-restricted-syntax` to flag `logAudit(` called without a `tx` argument inside `dr.transaction(async (tx) => { ... })` blocks.

**TDD steps:**
1. `test(red):` Write test: inside a `dr.transaction()` that rolls back, call `logAudit` without `tx`. Assert no audit record exists in DB after rollback. Currently it will exist.
2. `refactor:` Identify all `logAudit` call sites that are inside transaction blocks but omit `tx`. Pass `tx` explicitly.

**Measure:** Zero `logAudit` calls inside `dr.transaction()` blocks that omit the `tx` argument. Audit logs contain only committed operations.

---

---

### P1-21 · Move Model Integration Tests to `tests/integration-realdb/`

| | |
|---|---|
| **Issue** | Test infrastructure — tests not running in CI |
| **Files** | `app/backend.server/all_test.ts`, `app/backend.server/models/all_test.ts`, `app/backend.server/handlers/all_test.ts`, and all `*_test.ts` files they aggregate |
| **Current** | All model/handler tests use Node.js's built-in test runner (`node:test`), require a live DB, and live under `app/` (excluded from both Vitest configs). They almost certainly do not run in `yarn test:run2` or `yarn test:run3`. Coverage from these tests is not counted. |

**Fix:**
1. Migrate all `*_test.ts` files to Vitest (`import { describe, it, beforeAll } from "vitest"`)
2. Move files to `tests/integration-realdb/models/` and `tests/integration-realdb/handlers/`
3. Remove the `all_test.ts` aggregators — Vitest discovers tests by glob, no manual aggregation needed
4. Remove `node:test` imports from the codebase entirely

**TDD steps:**
1. `test:` Run `yarn test:run3` and confirm the model/handler tests are absent from coverage output.
2. `chore:` Migrate one test file (e.g., `password_check_test`) to Vitest + `tests/integration-realdb/` as proof of concept.
3. `chore:` Migrate remaining files.

**Measure:** `yarn test:run3` includes all migrated tests. `grep -r "from \"node:test\""` returns zero results. `app/` directory contains zero `*_test.ts` files.

---

---

### P1-22 · Fix `authLoaderApiDocs` — Add Tenant Check on API Key Path

| | |
|---|---|
| **Issue** | Auth correctness — tenant validation skipped for API key callers |
| **File** | `app/utils/auth.ts` — `authLoaderApiDocs` |
| **Current** | When the `X-Auth` header is present, `apiAuth` validates the key exists but the handler calls `fn(args)` without checking `countryAccountsId`. Session-based auth via `authLoaderWithPerm` requires a valid tenant; API key auth does not. |

**Fix:** After `apiAuth` succeeds, extract and validate `countryAccountsId` from the API key record (it is stored on `api_key.country_accounts_id`) and inject it into the request context before calling `fn`.

**Measure:** API key callers to the docs endpoint without a valid tenant association receive 403, not the docs payload.

---

---

### P1-23 · Remove `hasPermission` Dead Code Branch

| | |
|---|---|
| **File** | `app/utils/auth.ts` — `hasPermission` |
| **Current** | `if (isSuperAdmin(effectiveRole)) { return roleHasPermission(...) }` followed immediately by `return roleHasPermission(...)` — both branches identical. |

**Fix:** Remove the `if` block entirely. One line.

**Measure:** `hasPermission` is 3 lines. `isSuperAdmin` not called inside it.

---

---

### P1-24 · Fix SSO `editProfile` and `passwordReset` Empty Functions

| | |
|---|---|
| **Issue** | Correctness — SSO profile edit and password reset silently broken |
| **File** | `app/utils/ssoauzeb2c.ts` |
| **Current** | Both functions have their implementations commented out and return `undefined`. Callers expecting a redirect receive nothing. |

**Fix options (pick one):**
1. Implement the redirect using the existing `baseURL()` and config helpers — the commented code shows the URL pattern, it just needs to be uncommented and wired
2. If intentionally disabled, replace the functions with explicit `throw new Error("Not implemented")` so callers fail loudly, not silently

**Measure:** `editProfile` and `passwordReset` either produce a valid Azure B2C redirect or throw explicitly. Neither silently returns `undefined`.

---

---

### P1-25 · Add Startup Validation for Required Environment Variables

| | |
|---|---|
| **Issue** | Ops — misconfiguration detected at runtime, not startup |
| **File** | `app/utils/config.ts`, `app/utils/env.ts` |
| **Current** | All Azure B2C config accessors return `|| ""` — missing vars produce empty strings with no warning. The app attempts SSO flows with blank `client_id` and fails at runtime with a cryptic Azure error. No startup check validates required vars when `AUTHENTICATION_SUPPORTED=sso_azure_b2c`. |

**Fix:** Add a `validateConfig()` function called in `initServer()` that checks required vars and throws with a human-readable list of what's missing:

```ts
export function validateConfig() {
    const required: [string, string][] = [
        ["SESSION_SECRET", "always"],
        ["DATABASE_URL", "always"],
        ["SSO_AZURE_B2C_CLIENT_ID", "when AUTHENTICATION_SUPPORTED includes sso_azure_b2c"],
        // ...
    ];
    const missing = required
        .filter(([key]) => !process.env[key])
        .map(([key, when]) => `  ${key} (required ${when})`);
    if (missing.length) throw new Error(`Missing required env vars:\n${missing.join("\n")}`);
}
```

**Measure:** Starting the app with `AUTHENTICATION_SUPPORTED=sso_azure_b2c` but no `SSO_AZURE_B2C_CLIENT_ID` throws a clear error at boot, not at the first SSO login attempt.

---

---

### P1-26 · Fix Email Transporter — Singleton, Not Per-Send

| | |
|---|---|
| **Issue** | Performance — new SMTP connection created per email |
| **File** | `app/utils/email.ts` — `sendEmail` calls `createTransporter()` on every invocation |

**Fix:** Create the transporter once at module init or in `initServer()` and reuse it:

```ts
let _transporter: nodemailer.Transporter | null = null;
export function initEmailTransport() {
    _transporter = createTransporter();
}
export async function sendEmail(to, subject, text, html) {
    if (!_transporter) throw new Error("Email transport not initialized");
    // use _transporter
}
```

**Measure:** One SMTP connection established for the process lifetime (or connection pool). `createTransporter()` called once, not once per email.

---

---

### P1-27 · Consolidate Two Logging Systems — Adopt `logger.server.ts` as Sole Logger

| | |
|---|---|
| **Issue** | Maintainability — two `createLogger` implementations with same signature |
| **Files** | `app/utils/logger.ts` (150 lines, console wrappers), `app/utils/logger.server.ts` (550 lines, Winston) |
| **Current** | Which logger a module gets depends on import path. Most code uses raw `console.log` directly. Structured log fields, log rotation, and remote transport are unavailable to any module that doesn't explicitly import from `logger.server.ts`. |

**Fix:**
1. Remove `logger.ts` (or keep a minimal re-export shim for client-side use)
2. Ensure `logger.server.ts` is the single structured logging entry point for all server-side code
3. Remove `process.setMaxListeners(0)` — fix the underlying listener leak instead
4. Remove `createLogStream()` — it monkey-patches global `console.*` which breaks test isolation
5. Adopt `appLogger` from `logger.server.ts` in place of all `console.log/error/warn` calls in server-side code (start with P0-3 clean-up pass)

**Measure:** `console.log/error/warn` in `app/backend.server/` and `app/utils/` returns zero results (except inside `logger.server.ts` itself). One structured log stream per process.

---

---

### P1-28 · Make Session Timeout Configurable via Environment Variable

| | |
|---|---|
| **File** | `app/utils/session-activity-config.ts` |
| **Current** | `sessionActivityTimeoutMinutes = 40` hardcoded. Different deployment environments need different values. |

**Fix:**
```ts
export const sessionActivityTimeoutMinutes =
    parseInt(process.env.SESSION_TIMEOUT_MINUTES || "40", 10);
export const sessionActivityWarningBeforeTimeoutMinutes =
    parseInt(process.env.SESSION_WARNING_MINUTES || "10", 10);
```

**Measure:** Setting `SESSION_TIMEOUT_MINUTES=60` changes session timeout without a code change.

---

---

### P1-29 · Fix Cross-Tenant Leak in `spatial-footprint-geojson.ts`

| | |
|---|---|
| **Issue** | Security — cross-tenant data access |
| **File** | `app/routes/$lang+/api+/spatial-footprint-geojson.ts` |
| **Current** | Raw SQL query against `disaster_records` has no `country_accounts_id` filter. Any logged-in user who knows another tenant's `record_id` can retrieve their spatial footprint. Compounds the `authLoaderApiDocs` tenant bypass (P1-22). |

**Fix:** Add `AND disaster_records.country_accounts_id = ${countryAccountsId}` to the raw SQL. Extract `countryAccountsId` from the session (caller is the authenticated frontend map component).

**TDD steps:**
1. `test(red):` Request spatial footprint with a `record_id` belonging to tenant B while authenticated as tenant A. Assert 404.
2. `fix:` Add `country_accounts_id` filter to the SQL query.

---

---

### P1-30 · Fix Cross-Tenant Leak in `geojson.$id.ts`

| | |
|---|---|
| **Issue** | Security — cross-tenant data access (divisions are per-tenant) |
| **File** | `app/routes/$lang+/api+/geojson.$id.ts` |
| **Current** | `divisionTable.findFirst({ where: eq(divisionTable.id, id) })` has no `countryAccountsId` filter. Divisions are uploaded and scoped per tenant via `division+/upload.ts`. `authLoaderPublicOrWithPerm` means unauthenticated callers can access any tenant's division geometry in public mode. |

**Fix:** Add `and(eq(divisionTable.id, id), eq(divisionTable.countryAccountsId, countryAccountsId))` to the query. Resolve `countryAccountsId` from the session or the API key — the route uses `authLoaderPublicOrWithPerm` so need to handle the public (unauthenticated) case: in public mode, scope to the instance's default country account.

**TDD steps:**
1. `test(red):` Request division geometry with an ID belonging to tenant B while authenticated as tenant A. Assert 404.
2. `fix:` Add `countryAccountsId` filter.

---

---

### P1-31 · Add Auth to `subsectors.tsx`

| | |
|---|---|
| **File** | `app/routes/$lang+/api+/subsectors.tsx` |
| **Current** | Plain `async function loader(args)` — no HOF wrapper, no session check. Endpoint is accessible to any unauthenticated caller. Called internally via `useFetcher()` which sends the session cookie, so in practice callers are authenticated — but the route enforces nothing. |

**Fix:** Wrap with `authLoaderApi`:
```ts
export const loader = authLoaderApi(async (args) => {
    const ctx = new BackendContext(args);
    // ... existing body
});
```

**Measure:** Unauthenticated GET to `/api/subsectors` returns 401.

---

---

### P1-32 · Complete `organization+/` API Module

| | |
|---|---|
| **Issue** | Functional gap — Form-CSV-API contract broken for organizations |
| **Files** | `app/routes/$lang+/api+/organization+/` — missing `list.ts`, `update.ts`, `upsert.ts` |
| **Current** | Only `_index.tsx`, `add.ts`, `fields.ts` exist. External systems can create organizations via API but cannot query or update them. Every other domain resource (disaster-event, disaster-record, asset, damage, etc.) has the full CRUD set. |

**Fix:** Add `list.ts`, `update.ts`, `upsert.ts` following the pattern established in `disaster-event+/`. Ensure `countryAccountsId` is enforced on all three. Update `_index.tsx` to document the new endpoints.

**TDD steps:**
1. `test(red):` Write integration tests for `GET /api/organization/list` (expect 200 with tenant-scoped results), `POST /api/organization/update` (expect updated record), `POST /api/organization/upsert` (expect create-or-update).
2. `fix:` Implement the three route files.

---

---

### P1-33 · Fix `mcp.ts` — Auth on GET/SSE Path + `notifications/initialized` Handler

| | |
|---|---|
| **File** | `app/routes/$lang+/api+/mcp.ts` |

**Issue A — Unprotected SSE path:**
The `loader` (GET) handles SSE stream setup with no authentication. Any caller can establish an SSE connection. The POST action correctly calls `apiAuth`. The SSE stream delivers only the endpoint event (the POST URL) which is low-risk on its own, but it is inconsistent with the overall API key security model.

**Fix A:** Add `apiAuth` check at the top of the `loader` before establishing the SSE stream. Return 401 if the key is missing or invalid.

**Issue B — MCP protocol: `notifications/initialized` not silently ignored:**
The MCP spec (section 3.4) requires servers to silently ignore notification methods — requests that have a `method` but no `id`. The current `default` branch returns `-32601 Method not found`. Clients send `notifications/initialized` immediately after the `initialize` handshake and do not expect any response; receiving an error response breaks the initialization flow for well-behaved MCP clients.

**Fix B:** Add a check before the `switch` statement:
```ts
// MCP spec: notifications have no id — must be silently ignored
if (!req.id && req.method) {
    return new Response(null, { status: 204 });
}
```

**Measure:** MCP client initialization completes without errors. Authenticated SSE upgrade returns stream; unauthenticated returns 401.

---

---

### P1-34 · Align Language Availability — Expose fr, es, zh in Language Picker

| | |
|---|---|
| **Issue** | Configuration mismatch — translations exist but are unreachable via UI |
| **Files** | `app/backend.server/translations.ts:140`, `app/utils/lang.backend.ts:5` |
| **Current** | Two separate language lists with no shared source of truth: `VALID_LANGUAGES = ["ar", "zh", "en", "fr", "ru", "es"]` (routing) vs `availableLanguagesWhiteList = ["en", "ru", "ar"]` (picker + settings validation). French, Spanish, and Chinese locale files exist and are fully translated (~6,791 lines each) but the language picker never shows them and `settingsService.ts` rejects them as invalid. |

**Fix:** Either:
1. Derive `availableLanguagesWhiteList` from `VALID_LANGUAGES` — one source of truth
2. Or make the whitelist an explicit subset with a comment explaining why certain languages are excluded (e.g. "translation review pending")

```ts
// app/backend.server/translations.ts
import { VALID_LANGUAGES } from "~/utils/lang.backend";
// use VALID_LANGUAGES directly, or filter against a documented exclusion set
```

**Measure:** French, Spanish, and Chinese appear in the language picker dropdown and can be selected without the settings service rejecting them.

---

---

### P1-35 · Remove Duplicate Translation Loading Logic

| | |
|---|---|
| **File** | `app/backend.server/translations.ts` |
| **Current** | Two exported functions in the same file do near-identical work: `loadTranslations(lang)` (called from `root.tsx` to build the browser payload, returns `Record<string, Translation>`) and `createTranslationGetter(lang)` (set on `globalThis` at startup, returns a closure over a `Map`). Both call `loadLang()` and iterate the same raw JSON array. A bug fix in one doesn't automatically apply to the other. |

**Fix:** Unify into a single implementation. `createTranslationGetter` is the authoritative server-side version. `loadTranslations` should call it or share the underlying map.

**Measure:** `loadTranslations` and `createTranslationGetter` share a single parse/build path. Removing one does not change observable behaviour.

---

---

### P1-36 · Fail Build on Duplicate Translation Keys

| | |
|---|---|
| **File** | `scripts/extractor-i18n.ts:136` |
| **Current** | When two `.t()` call sites use the same `code`, the second is silently dropped (`duplicateCount++; return;`). The count is logged as a warning but does not fail the extraction. A developer renaming a component can accidentally reuse an existing key — the UI shows the old string for one of the two places. |

**Fix:** Exit non-zero if any duplicates are detected:
```ts
if (duplicateCount > 0) {
    console.error(`❌ ${duplicateCount} duplicate translation keys found. Fix before committing.`);
    process.exit(1);
}
```

Add `yarn i18n:extractor` to CI so duplicate keys are caught before merge.

**Measure:** Running `yarn i18n:extractor` with a duplicate `code` exits 1 and prints the conflicting key.

---

---

### P1-37 · Add CI/CD Pipeline

| | |
|---|---|
| **Issue** | No automated quality gates on any commit or PR |
| **Current** | No `.github/` directory. Only quality gate is a `pre-push` husky hook running `lint-staged` (prettier) + `tsc --noEmit`. No tests run automatically. No build check. Hooks can be bypassed with `git push --no-verify`. |

**Target pipeline (GitHub Actions — two workflows):**

**`ci.yml` — runs on every PR:**
```yaml
jobs:
  quality:
    - yarn tsc --noEmit
    - yarn format:check
    - yarn test:run2          # Vitest unit + integration
    - yarn build              # verify production build succeeds
  security:
    - yarn audit --level high
    - i18n extraction check (yarn i18n:extractor + diff check)
```

**`e2e.yml` — runs on merge to main:**
```yaml
jobs:
  e2e:
    - yarn build
    - start react-router-serve (production)
    - yarn test:e2e
```

**Measure:** Open PRs show green/red CI status. A TypeScript error, test failure, or broken build blocks merge.

---

---

### P1-38 · Consolidate to Single Migration System — Drizzle Only

| | |
|---|---|
| **Issue** | Two independent schema management systems with no shared state |
| **Files** | `app/drizzle/migrations/`, `scripts/dts_database/` |
| **Current** | Drizzle Kit (TypeScript schema → timestamped migration files, tracked in `__drizzle_migrations__`) and raw SQL scripts (`dts_db_schema.sql` snapshot + `upgrade_from_*.sql` patches) are both packaged into every release. Neither system knows about the other. `init_db.sh` restores from the static snapshot which goes stale whenever Drizzle adds migrations. |

**Fix:**
1. Declare Drizzle Kit as the single authoritative migration system
2. Regenerate `dts_db_schema.sql` as a Drizzle-generated dump after every migration run — automate this in CI
3. Replace the `init_db.sh` schema restore with `drizzle-kit migrate` on first boot
4. Retire `upgrade_from_*.sql` scripts — document that upgrades from pre-0.2.0 must first apply the legacy SQL patches manually, then hand off to Drizzle

**Measure:** A new installation runs `drizzle-kit migrate` to build the schema from scratch. No SQL snapshot file needs to be kept in sync manually.

---

---

### P1-39 · Harden `docker-compose.yml` — Credentials, Healthcheck, Compose v2

| | |
|---|---|
| **Files** | `docker-compose.yml`, `Makefile` |

**Issue A — Hardcoded credentials:**
`POSTGRES_PASSWORD=2024` and matching `DATABASE_URL` committed to repo. No `docker-compose.prod.yml` or environment override exists. Teams deploying "via Docker" have no documented path to a secure production configuration.

**Fix A:** Use Docker secrets or a `.env` file that is gitignored:
```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  DATABASE_URL: ${DATABASE_URL}
```

**Issue B — No DB healthcheck; `depends_on` does not wait for ready:**
`depends_on: db` starts the `app` container when the `db` *container* starts, not when PostgreSQL is ready. First-boot startup consistently fails and requires a manual restart.

**Fix B:**
```yaml
db:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 5s
    retries: 10
app:
  depends_on:
    db:
      condition: service_healthy
```

**Issue C — Adminer exposed with no auth:**
`adminer` service provides full DB GUI access on port 8080 with no authentication in a production-like compose file.

**Fix C:** Remove `adminer` from the default compose file. Provide it in a separate `docker-compose.dev.yml` override used only locally.

**Issue D — `docker-compose` v1 CLI in Makefile:**
`docker-compose` (Python, deprecated) should be `docker compose` (Go v2 plugin).

**Fix D:** Replace all `docker-compose` calls in `Makefile` with `docker compose`.

**Measure:** `make start` works on Docker Desktop and Docker Engine ≥ 24. First boot succeeds without manual restart. No Adminer in production compose.

---

---

### P1-40 · Isolate Migrations as a Pre-Deploy Step

| | |
|---|---|
| **Issue** | Correctness — concurrent migration runs in a multi-node deployment |
| **Files** | `package.json:dev`, `Dockerfile.app` |
| **Current** | `yarn dev` runs `yarn dbsync` (Drizzle migrations) on every startup. In a multi-node deployment (Docker Swarm, Kubernetes), all nodes start concurrently and each would attempt to run migrations simultaneously. Drizzle Kit has no distributed migration lock — concurrent runs can conflict or produce duplicate migration entries. |

**Fix:** Migrations must run **once** as a pre-deployment job, not at application startup:
1. Remove `yarn dbsync` from the `dev` script (keep it as a standalone `yarn dbsync` command for local convenience)
2. Add a `migrate` service to docker-compose that runs `drizzle-kit migrate` and exits:
```yaml
migrate:
  image: the-app-image
  command: yarn dbsync
  depends_on:
    db:
      condition: service_healthy
  restart: "no"
```
3. Document: in CI/CD, the migrate step must complete before app replicas are started

**Measure:** Starting 3 app replicas simultaneously does not trigger any migration. Migrations run exactly once per deployment.

---

---

### P1-41 · Add Docker Swarm Configuration for 3-Node Horizontal Scaling

| | |
|---|---|
| **Issue** | No swarm deployment config exists; several stateful concerns block horizontal scaling |
| **Files** | `docker-compose.yml`, new `docker-compose.swarm.yml` |

**Horizontal scaling assessment:**

| Concern | Status | Notes |
|---|---|---|
| Session sharing | ✅ Safe | PostgreSQL-backed — any node handles any request |
| Translation cache | ✅ Safe | Baked into image — identical across nodes |
| Static assets | ✅ Safe | Served by `react-router-serve` from build output |
| File uploads (P2-5) | ❌ Blocker | Local disk — must move to object storage first |
| Migration on startup (P1-40) | ❌ Blocker | Must be isolated pre-deploy step first |
| Translation import race (P2-6) | ❌ Blocker | TOCTOU race — add `SELECT FOR UPDATE` on `dts_system_info` row |
| DB connection pool (P1-1) | ⚠️ Configure | 3 nodes × uncapped pool can exhaust `max_connections` |
| DB single point of failure | ⚠️ Risk | Single PostgreSQL container — no standby |
| Log aggregation | ⚠️ Operational | Each node writes to own container filesystem |

**Fix — `docker-compose.swarm.yml`:**
```yaml
services:
  app:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      restart_policy:
        condition: on-failure
        delay: 5s
      resources:
        limits:
          memory: 512M
    environment:
      DATABASE_POOL_MAX: "10"   # caps each node at 10 connections = 30 total for 3 nodes
```

**Prerequisite order:** P2-5 (object storage) → P1-40 (migration isolation) → P2-6 (translation import race) → P1-1 (pool config) → this item.

**Measure:** `docker stack deploy -c docker-compose.swarm.yml delta` starts 3 replicas. Rolling restart of one node does not drop in-flight requests. Any node can handle any authenticated session.

---

---

### P1-42 · Fix `testSchema` Duplication in PGlite Integration Tests

| | |
|---|---|
| **Issue** | Test infrastructure — silent schema drift |
| **Files** | `tests/integration/db/setup.ts`, `tests/integration/db/testSchema/` (~30 files) |
| **Current** | `tests/integration/db/testSchema/` manually copies every file from `app/drizzle/schema/`. When a column is added to production schema and the copy is not updated, PGlite tests pass against a stale schema. There is no sync check. The duplication is invisible until a test fails due to a missing column — and some schema drift may never produce a test failure. |

**Fix:** In `tests/integration/db/setup.ts`, replace the import of the local `testSchema/` with the production schema directly:
```ts
// Before
import * as schema from "./testSchema";

// After
import * as schema from "~/drizzle/schema";
```
PGlite's `pushSchema` accepts the Drizzle schema object and creates the in-memory tables from it. The `testSchema/` directory can then be deleted entirely.

**TDD steps:**
1. `chore:` Delete `tests/integration/db/testSchema/` after switching the import.
2. `test:` Confirm `yarn test:run2` still passes — PGlite builds the schema from the production definition.

**Measure:** `tests/integration/db/testSchema/` directory does not exist. Adding a column to `app/drizzle/schema/` automatically applies to PGlite tests on the next run.

---

---

### P1-43 · Fix E2E Database Setup — Use Drizzle Migrations Instead of Static SQL Snapshot

| | |
|---|---|
| **Issue** | Test infrastructure — E2E tests run against potentially stale schema |
| **Files** | `tests/e2e/global.setup.ts:54-64`, `scripts/dts_database/dts_db_schema.sql` |
| **Current** | `global.setup.ts` creates the E2E test database by reading `dts_db_schema.sql` — the same static snapshot identified in P1-38 as diverging from Drizzle migrations. E2E tests may be running against a schema that doesn't match production. A missing column will cause a runtime error, not a schema validation error, making failures hard to diagnose. |
| **Blocked by** | P1-38 (single migration system), P1-40 (migration isolation) |

**Fix:** Once P1-38 and P1-40 are complete, replace the static SQL snapshot setup with a `drizzle-kit migrate` call:
```ts
// tests/e2e/global.setup.ts — replace current SQL file execution with:
execSync("yarn drizzle-kit migrate", {
  env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  stdio: "inherit",
});
```

**Measure:** E2E `global.setup.ts` does not reference `dts_db_schema.sql`. A new Drizzle migration is automatically applied to the E2E database on next test run without manual SQL edits.

---

---

### P1-44 · Add Dedicated Unit Tests for `auth.ts` and `session.ts`

| | |
|---|---|
| **Issue** | Zero test coverage on the two most security-critical utilities |
| **Files** | `app/utils/auth.ts`, `app/utils/session.ts` |
| **Current** | `setupSessionMocks()` in integration-realdb tests replaces `requireUser`, `authLoaderWithPerm`, and `authActionWithPerm` with no-ops. No test exercises the real auth HOF logic. Known auth bug (P1-22: tenant check skipped on API key path) cannot be caught by any existing test. `app/utils/session.ts` is similarly untested. |

**Target test cases for `auth.ts`:**
- `requireUser` redirects to login when no session
- `authLoaderWithPerm` returns 403 when user lacks the required permission
- `authLoaderWithPerm` on API key path still checks tenant (regression for P1-22)
- `authActionWithPerm` returns 403 on insufficient role

**Target test cases for `session.ts`:**
- `getUserFromSession` returns user when session is valid
- `getUserFromSession` returns null when session is missing or expired
- `destroyUserSession` handles missing session gracefully (regression for P0-15)

**TDD steps:**
1. `test(red):` Write unit test: call `authLoaderWithPerm` with a valid API key belonging to tenant A, passing a `countryAccountsId` for tenant B. Assert 403 response. This currently passes through (P1-22 bug).
2. `test(red):` Write unit test: `requireUser` with no session — assert redirect response with Location header.
3. `fix:` Address P1-22 tenant check. Verify red test turns green.

**Measure:** Coverage target for `app/utils/auth.ts` and `app/utils/session.ts` reaches ≥ 70% (see coverage ratchet table). Auth regressions are detectable without a full E2E run.

---

---

### P1-45 · Add `.github/` — Issue Templates, PR Template, CODEOWNERS

| | |
|---|---|
| **Issue** | No contributor infrastructure — issues filed inconsistently, PRs lack context, no automated reviewer assignment |
| **Files** | `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/CODEOWNERS` |
| **Current** | `.github/` directory does not exist. Any issue filed is free-form. Any PR is submitted without a quality checklist. No team member is automatically assigned as reviewer for any file path. |

**Files to create:**

`bug_report.md` — sections: Steps to reproduce, Expected behaviour, Actual behaviour, DELTA version, deployment type (Docker/manual), relevant logs.

`feature_request.md` — sections: Problem description, Proposed solution, Alternatives considered, Is this related to DPG compliance / Sendai Framework alignment?

`PULL_REQUEST_TEMPLATE.md` — checklist:
```markdown

---

### P1-46 · Adopt Conventional Commits + `release-please` for Automated Changelog

| | |
|---|---|
| **Issue** | Changelog has gaps, is hand-maintained, and misses versions entirely |
| **Files** | `CHANGELOG.md`, `package.json`, `.github/workflows/release-please.yml` |
| **Current** | v0.1.0–v0.1.2 are unrecorded. v0.2.0 has 4 bullet points for a major React + React Router upgrade. The changelog is entirely dependent on human memory at release time. |

**Fix — two parts:**

**Part 1: Adopt Conventional Commits** — document the commit format in `CONTRIBUTING.md` (P0-24):
- `feat:` — new feature → Minor version bump
- `fix:` — bug fix → Patch version bump
- `docs:` — documentation only
- `chore:` — tooling, dependency updates
- `BREAKING CHANGE:` footer → Major version bump

**Part 2: Add `release-please` GitHub Action** — on merge to `main`, this action:
1. Inspects commits since last release using Conventional Commits format
2. Opens (or updates) a "Release PR" that updates `CHANGELOG.md` and bumps `package.json` version
3. When the Release PR is merged, it creates a GitHub Release and git tag automatically

**Measure:** `CHANGELOG.md` is generated, not hand-written. Every release has a complete `[Unreleased]` section populated from merged commits. GitHub Releases are created automatically on version tags.

---

---

### P1-47 · Fix `_docs/api.md` — Write REST API Overview

| | |
|---|---|
| **Issue** | Entry point for API documentation is a 62-byte empty file |
| **File** | `_docs/api.md` |
| **Current** | Contains only `# API`. Any external integrator, DesInventar import team, or AI assistant navigating to API docs finds nothing. |

**Fix:** Write a proper API overview covering:
- Authentication (API key via `X-Auth` header — pointer to admin panel setup)
- Base URL pattern (`/{lang}/api/`)
- Available resource endpoints with brief descriptions (disaster records, damages, losses, disruptions, assets, geography, MCP)
- Link to the MCP endpoint doc (`_docs/mcp.md`)
- Link to the DesInventar import API doc (`_docs/api-for-desinventar-import.md`)
- Rate limiting and pagination conventions
- Pointer to `_docs/api-specs/` once OpenAPI specs exist (P2-7)

**Measure:** `_docs/api.md` provides a working entry point for API consumers. An external developer can understand the API surface from this file within 5 minutes.

---

---

### P1-48 · Formalize Architecture Decision Records (ADR System)

| | |
|---|---|
| **Issue** | Architectural reasoning is undocumented or scattered as one-off files |
| **Files** | `_docs/decisions/` (new directory), existing: `_docs/database-options.md`, `_docs/License/license-recommendation.md` |
| **Current** | Two existing docs are written in ADR style but live as unorganized files. The React Router v7 migration, Drizzle ORM choice, PGlite test isolation decision, and multi-tenancy strategy have no recorded rationale. Institutional knowledge lives only in developer memory. |

**Fix:** Adopt [MADR (Markdown Any Decision Records)](https://adr.github.io/madr/) format under `_docs/decisions/`:
```
_docs/decisions/
  0001-apache-license.md          ← convert from license-recommendation.md
  0002-postgresql-drizzle-orm.md  ← convert from database-options.md
  0003-react-router-v7.md         ← write new
  0004-pglite-test-isolation.md   ← write new
  0005-single-db-multi-tenancy.md ← write new
```

**In the AI-assisted lifecycle:** Add to `CONTRIBUTING.md` and the PR template that any PR introducing a significant architectural decision should include a new ADR under `_docs/decisions/`. AI assistants (Claude, etc.) can draft the ADR from the PR description and discussion — it gets committed alongside the code change. Architectural reasoning becomes versioned and permanently linked to the code it describes.

**Measure:** `_docs/decisions/` contains ≥ 5 ADRs covering the core technology choices. New ADRs are opened as part of PRs that change significant architecture.

---

---

