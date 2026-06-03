## ADDED Requirements

### Requirement: HazardousEventListPage accepts typed loader data as a prop

`HazardousEventListPage` (exported from `app/frontend/events/hazardeventlist.tsx`)
SHALL accept a `data: HazardousEventListLoaderData` prop. The component MUST NOT
call `useLoaderData()` internally. All data the component needs for rendering SHALL
be sourced exclusively from the `data` prop.

`HazardousEventListLoaderData` SHALL be a type alias derived as
`Awaited<ReturnType<typeof hazardousEventsLoader>>` and exported from the same
module, so the type is always consistent with the server handler.

#### Scenario: Component renders item rows from injected data

- **GIVEN** stub loader data containing one hazardous event item with a known UUID
  prefix and a `hipHazard.name` of "Flood"
- **WHEN** `HazardousEventListPage` is rendered with that data and `isPublic: false`
- **THEN** the rendered output SHALL contain a table row with a link whose text
  starts with the first five characters of the UUID
- **AND** the rendered output SHALL contain the text "Flood" in the hazard-type
  column

#### Scenario: Component renders empty-state when no items present

- **GIVEN** stub loader data where `data.data.items` is an empty array and
  `data.data.pagination.totalItems` is 0
- **WHEN** `HazardousEventListPage` is rendered with that data
- **THEN** the rendered output SHALL contain the "No records found" message
- **AND** the rendered output SHALL NOT contain a `<table>` element

#### Scenario: Component renders in public mode without record-status column

- **GIVEN** stub loader data with one item
- **WHEN** `HazardousEventListPage` is rendered with `isPublic: true`
- **THEN** the rendered output SHALL NOT contain a column header whose text is
  "Record status"
- **AND** the rendered output SHALL NOT contain the status dot `span` elements
  with `dts-status` class names for that item

#### Scenario: No useLoaderData import remains in the component module

- **GIVEN** the refactored `app/frontend/events/hazardeventlist.tsx`
- **WHEN** the file is inspected
- **THEN** it SHALL NOT contain any import of `useLoaderData` from `react-router`
- **AND** it SHALL NOT call `useLoaderData` anywhere in the module

### Requirement: Route files pass loader data explicitly to HazardousEventListPage

The route module `app/routes/$lang+/_public+/hazardous-event+/_index.tsx` and the
picker route `app/routes/$lang+/hazardous-event+/picker.tsx` SHALL each call
`useLoaderData()` once in the route's default export function and SHALL pass the
result as the `data` prop to `HazardousEventListPage`. Neither route SHALL import
`useLoaderData` for the purpose of supplying it to the page component from inside
the component.

#### Scenario: Index route passes full loader data as prop

- **GIVEN** the refactored `_index.tsx` route module
- **WHEN** the default export function renders `HazardousEventListPage`
- **THEN** `HazardousEventListPage` SHALL receive `data={ld}` where `ld` is the
  value returned by `useLoaderData<typeof loader>()`
- **AND** `HazardousEventListPage` SHALL NOT call `useLoaderData()` itself during
  that render

#### Scenario: Picker route passes full loader data as prop

- **GIVEN** the refactored `picker.tsx` route module
- **WHEN** the default export function renders `HazardousEventListPage`
- **THEN** `HazardousEventListPage` SHALL receive a `data` prop equal to the value
  returned by `useLoaderData<typeof loader>()` in the picker route
- **AND** `HazardousEventListPage` SHALL NOT call `useLoaderData()` itself during
  that render

### Requirement: HazardousEventListPage is unit-testable without a React Router context

`HazardousEventListPage` SHALL be renderable in a Vitest unit test that stubs
`useRouteLoaderData` via `vi.mock("react-router", ...)` without requiring a live
React Router `<RouterProvider>` or loader infrastructure.

#### Scenario: Unit test renders component successfully with stub props

- **GIVEN** `useRouteLoaderData` is stubbed via `vi.mock("react-router", ...)` to
  return `{ common: { lang: "en", user: null } }`
- **AND** `globalThis.createTranslationGetter` is stubbed to return a passthrough
  translation getter
- **AND** a stub `HazardousEventListLoaderData` value is constructed with one item
  and valid pagination
- **WHEN** `HazardousEventListPage` is rendered via `renderToString` from
  `react-dom/server` with `data=<stub>`, `isPublic: false`,
  `basePath: "/hazardous-event"`
- **THEN** `renderToString` SHALL complete without throwing
- **AND** the returned HTML string SHALL contain `data-testid="list-table"`

#### Scenario: Unit test confirms no useLoaderData call is made during render

- **GIVEN** `useLoaderData` in the mocked `react-router` module is a spy that
  throws if called
- **WHEN** `HazardousEventListPage` is rendered via `renderToString` with all
  required props
- **THEN** the spy SHALL NOT be called
- **AND** `renderToString` SHALL complete without throwing
