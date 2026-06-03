## Context

`app/frontend/events/hazardeventlist.tsx` exports a `ListView` component that calls
`useLoaderData<Awaited<ReturnType<typeof hazardousEventsLoader>>>()` on line 40.
This couples the component to a live React Router loader context and duplicates
data-fetching intent already expressed in both consuming route files. There are
exactly two consumers today:

1. `app/routes/$lang+/_public+/hazardous-event+/_index.tsx` — the primary list
   page (public + authenticated).
2. `app/routes/$lang+/hazardous-event+/picker.tsx` — the hazardous-event picker
   popup that shares the same `ListView`.

Neither consumer passes loader data as a prop; both rely on `ListView` calling
`useLoaderData()` internally.

The `DisasterEventsPage` component in `app/frontend/disaster-event/` already
follows the props-down pattern (it accepts `data: any[]` etc.) but uses `any`
types. This change establishes the correct, typed pattern using a `PageProps<T>`
generic — a single authoritative contract that future page components (including
the Notices page, Phase 5) MUST use.

## Goals / Non-Goals

**Goals:**

- Define `PageProps<T>` as a shared generic type exported from
  `app/frontend/page-props.ts`.
- Export `HazardousEventListLoaderData` as a type alias derived from
  `hazardousEventsLoader`'s inferred return type, so the type is always consistent
  with the server handler without manual duplication.
- Rename `ListView` → `HazardousEventListPage` and update its props type from
  `ListViewArgs` to `HazardousEventListPageProps` (which embeds the `PageProps<T>`
  data field).
- Remove `useLoaderData()` from `hazardeventlist.tsx`; it MUST NOT appear in the
  component file after this change.
- Update both consumer route files (`_index.tsx` and `picker.tsx`) to pass `data`
  explicitly.
- Add a unit test at `tests/unit/frontend/hazardeventlist.test.tsx` that renders
  `HazardousEventListPage` with fully-typed stub data and verifies the component
  renders without a React Router loader context.

**Non-Goals:**

- Migrating the 101 existing `new ViewContext()` callsites to `useViewContext()`.
- Changing `hazardousEventsLoader` or any server-side code.
- Migrating `picker.tsx`'s own loader or auth wrapper.
- Moving `picker.tsx` to the `_authenticated+` layout structure — it currently
  lives at the old flat path (`$lang+/hazardous-event+/picker.tsx`) and will be
  migrated as part of the strangler-fig route restructuring in a future phase. The
  props-down pattern applied here will already be in place when that migration
  happens; no additional props changes will be needed at that point.
- Touching `DisasterEventsPage` — it is a separate component with its own type
  situation.
- DB schema or migration changes.

## Decisions

### Decision 1 — `PageProps<T>` generic is minimal: `{ data: T }`

The only field guaranteed on every page-level component is the typed loader data.
Render-control props (`isPublic`, `basePath`, `linksNewTab`, `actions`) are
component-specific and MUST NOT be folded into the generic — doing so would force
all page components to accept fields they don't need.

**Type to introduce in `app/frontend/page-props.ts`:**

```ts
/**
 * Contract for all page-level components in the Clean Architecture migration.
 * Page components MUST accept data via this prop and MUST NOT call useLoaderData()
 * internally.
 */
export type PageProps<T> = {
	data: T;
};
```

`HazardousEventListPageProps` then intersects this with the existing render-control
fields:

```ts
type HazardousEventListPageProps = PageProps<HazardousEventListLoaderData> & {
	isPublic: boolean;
	basePath: string;
	linksNewTab?: boolean;
	actions?: (item: any) => React.ReactNode;
};
```

### Decision 2 — `HazardousEventListLoaderData` derived via `Awaited<ReturnType<>>`

The loader return type is large and would drift if typed manually. Using
`Awaited<ReturnType<typeof hazardousEventsLoader>>` ties the component type
directly to the handler — any handler change that changes the return shape will
immediately surface as a compile error at the component.

```ts
import { hazardousEventsLoader } from "~/backend.server/handlers/events/hazardevent";

export type HazardousEventListLoaderData = Awaited<
	ReturnType<typeof hazardousEventsLoader>
>;
```

This type is exported so both the route files and tests can reference it without
repeating the derivation.

### Decision 3 — Route file passes `data={ld}` verbatim

The route file `_index.tsx` currently calls `useLoaderData<typeof loader>()` and
returns `{ ...eventsData, instanceName }`. The loader return type therefore extends
`HazardousEventListLoaderData` with `instanceName`. To avoid making
`HazardousEventListPage` aware of `instanceName`, the route passes `data={ld}` as
the full loader output; the component only destructures the fields it uses from
`data`, which is a subset of the full loader type. TypeScript's structural typing
allows `data: HazardousEventListLoaderData` to accept a superset — or the type
annotation on `data` can be widened to `HazardousEventListLoaderData & { instanceName?: string }`.

The simpler approach: the component's `data` prop type is typed as
`HazardousEventListLoaderData`. The route's `ld` value includes `instanceName` as
an extra field not present in `HazardousEventListLoaderData`. TypeScript structural
typing allows passing a wider type to a narrower parameter; `ld` is a superset so
assignment is valid without any cast.

### Decision 4 — Picker route passes `data` from its own `useLoaderData`

`picker.tsx` has its own `loader` that calls `hazardousEventsLoader(args)` and
returns its result directly (no extra fields). After the refactor (converted from
plain function call to JSX in this PR):

```ts
export default function Data() {
  const ld = useLoaderData<typeof loader>();
  const ctx = new ViewContext();
  return (
    <MainContainer ...>
      <HazardousEventListPage
        data={ld}
        isPublic={false}
        basePath="/hazardous-event/picker"
        linksNewTab={true}
        actions={(item) => ...}
      />
    </MainContainer>
  );
}
```

This keeps the picker's render-control props intact while satisfying the new
contract. The pre-existing plain function call `ListView(args)` has been converted
to JSX `<HazardousEventListPage ... />` in this PR — no future cleanup needed.

### Decision 5 — Unit test uses `renderToString` from `react-dom/server`

`react-dom` is already a project dependency, so `renderToString` requires no new
packages. `@testing-library/react` is not installed and adding it for a single
component test is not justified. The test uses `renderToString` to produce an HTML
string and then asserts on substrings — `includes("data-testid=\"list-table\"")`,
`includes("Flood")`, etc. This is sufficient to verify the component renders the
correct structure given injected props.

React Router must be mocked to prevent `useRouteLoaderData` calls from failing
(the component calls `useViewContext()` via `new ViewContext()`, which calls
`useRouteLoaderData("root")` internally).

Test infrastructure needed:

- `vi.mock("react-router", ...)` to stub `useRouteLoaderData` (returning minimal
  valid root data `{ common: { lang: "en", user: null } }`) and to stub
  `useLoaderData` as a throwing spy (confirms the component never calls it)
- `vi.stubGlobal("createTranslationGetter", ...)` to provide a stub translator
- Stub `HazardousEventListLoaderData` value with the minimum fields the component
  reads (items array, pagination, filters, hip, organizations, isPublic,
  countryAccountsId)

No PGlite setup is needed. The global `setupFiles` in `vitest.config.ts` already
runs `tests/integration/db/setup.ts` for all tests; this is safe for unit tests
as confirmed by the existing `useViewContext.test.ts` pattern.

## Risks / Trade-offs

- [Resolved] `picker.tsx` previously called `ListView(args)` as a plain function
  rather than JSX (`<ListView ... />`). In this PR the call site is converted to
  `<HazardousEventListPage ... />` JSX — consistent with React convention and both
  other consumer sites.

- [Risk] The route `_index.tsx`'s loader returns `{ ...eventsData, instanceName }`,
  which is a superset of `HazardousEventListLoaderData`. Passing `ld` directly to
  `data` relies on TypeScript's structural subtype compatibility. If the loader
  return type is inferred as a union (e.g. due to conditional logic), this could
  fail.
  → Mitigation: `yarn tsc` is a mandatory quality gate; any structural mismatch
  surfaces immediately.

- [Risk] `@testing-library/react` may need to be installed as a dev dependency.
  → Mitigation: the tasks file checks for the package and includes an install step
  if needed.

- [Risk] The component calls `new ViewContext()` (which calls `useViewContext()`)
  in the render body. Tests must mock `useRouteLoaderData` before rendering.
  → Mitigation: the existing `useViewContext.test.ts` provides the exact mock
  pattern; the new test replicates it.

## Migration Plan

1. Write failing test in `tests/unit/frontend/hazardeventlist.test.tsx` (TDD red).
2. Create `app/frontend/page-props.ts` with `PageProps<T>`.
3. Refactor `hazardeventlist.tsx`: export `HazardousEventListLoaderData`, rename
   `ListView` → `HazardousEventListPage`, replace `useLoaderData` with `data` prop.
4. Update `_index.tsx` import and prop usage.
5. Update `picker.tsx` import and prop usage.
6. Run `yarn vitest run tests/unit/frontend/hazardeventlist.test.tsx` — test goes
   green.
7. Run `yarn tsc` — zero TypeScript errors.
8. Run `yarn format:check` — Prettier clean.
9. Run all 8 quality gates (see tasks.md).
10. Run full regression suite `yarn test:run2`.
11. Archive and raise PR to `dev`.

## Open Questions

- None. The scope is fully bounded by the four source files and one test file
  listed in the proposal.
