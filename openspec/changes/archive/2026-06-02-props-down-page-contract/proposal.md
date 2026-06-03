## Why

`ListView` in `app/frontend/events/hazardeventlist.tsx` calls `useLoaderData()`
internally, coupling the component to a live React Router loader context and making
it impossible to render in isolation. Establishing a typed `PageProps<T>` contract
and refactoring `ListView` → `HazardousEventListPage` to receive loader data as a
prop creates a verified, independently-testable template that the Notices page
component (Phase 5) MUST follow from day one.

## What Changes

- `app/frontend/events/hazardeventlist.tsx` — rename `ListView` to
  `HazardousEventListPage`; replace the internal `useLoaderData()` call with a
  typed `data: HazardousEventListLoaderData` prop; export the
  `HazardousEventListLoaderData` type alias derived from `hazardousEventsLoader`'s
  return type; keep the `ListViewArgs` interface (renamed `HazardousEventListPageProps`)
  to carry the remaining render-control props (`isPublic`, `basePath`, `linksNewTab`,
  `actions`).
- `app/frontend/page-props.ts` — **new file** that exports the shared
  `PageProps<T>` generic type used by all page-level components following this
  contract.
- `app/routes/$lang+/_public+/hazardous-event+/_index.tsx` — update the import
  name from `ListView` to `HazardousEventListPage` and pass `data={ld}` as an
  explicit prop; no logic changes to the loader or the rest of the route.
- `app/routes/$lang+/hazardous-event+/picker.tsx` — update the import name from
  `ListView` to `HazardousEventListPage` and pass `data` prop; this is the second
  consumer of the component and must be updated atomically with the rename.
- `tests/unit/frontend/hazardeventlist.test.tsx` — **new file**; unit-tests
  `HazardousEventListPage` by rendering it with injected `data` props, asserting
  it renders correctly without a live loader context.

No DB migration is required. This is a pure frontend refactor with no schema or
server-side changes.

## Capabilities

### New Capabilities

- `page-props-generic-contract`: A shared `PageProps<T>` generic type exported
  from `app/frontend/page-props.ts` that all future page-level components MUST
  use to declare their typed data prop.
- `hazardous-event-list-page`: `HazardousEventListPage` component in
  `app/frontend/events/hazardeventlist.tsx` that renders the hazardous-event list
  given a typed `data: HazardousEventListLoaderData` prop and MUST NOT call
  `useLoaderData()` internally.

### Modified Capabilities

<!-- No existing spec-level requirements change — the route behaviour is preserved;
     only the internal data-access mechanism of the component changes. -->

## Impact

- **Files changed**:
  - `app/frontend/page-props.ts` — new; defines `PageProps<T>` generic
  - `app/frontend/events/hazardeventlist.tsx` — rename export; replace
    `useLoaderData` with prop; export `HazardousEventListLoaderData` type
  - `app/routes/$lang+/_public+/hazardous-event+/_index.tsx` — update import and
    add `data` prop at call site
  - `app/routes/$lang+/hazardous-event+/picker.tsx` — update import and add `data`
    prop at call site (second consumer)
  - `tests/unit/frontend/hazardeventlist.test.tsx` — new unit test
- **DB migration required**: No
- **Test approach**: Unit (Vitest, `yarn test:run2`) — render component with
  stub props using `vi.mock("react-router", ...)` and `vi.stubGlobal`; no PGlite
  or real DB needed
- **Auth / multi-tenancy implications**: None — this is a pure frontend
  presentational refactor; the loader retains all auth wrappers and
  `countryAccountsId` scoping unchanged
- **Breaking changes**: `ListView` export is renamed to `HazardousEventListPage`;
  all consumers (two route files) are updated in the same PR so no external
  breakage occurs
