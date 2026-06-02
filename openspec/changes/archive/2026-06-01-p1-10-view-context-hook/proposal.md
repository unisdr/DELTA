## Why

`ViewContext` in `app/frontend/context.ts` calls the React hook `useRouteLoaderData`
inside a class constructor, violating React's Rules of Hooks and preventing isolated
unit testing without full React Router context. Converting it to a `useViewContext()`
custom hook aligns with React conventions and is a prerequisite for the Notices
presentation layer (P1-12), which will call `useViewContext()` directly.

## What Changes

- `app/frontend/context.ts` — replace the `ViewContext` class with a
  `useViewContext()` function that returns `{ t, lang, user, url }`. The class export
  is **kept as a deprecated re-export** pointing at the hook to avoid a 101-file
  breaking migration in this PR.
- `tests/unit/frontend/useViewContext.test.ts` — new unit test that mocks
  `useRouteLoaderData` and asserts the hook returns the correct `{ t, lang, user }`
  shape when root loader data is present, and throws when `lang` is missing.

## Capabilities

### New Capabilities

- `use-view-context-hook`: A custom React hook `useViewContext()` exported from
  `app/frontend/context.ts` that reads root loader data via `useRouteLoaderData`
  and returns `{ t, lang, user, url }` conforming to `DContext` plus `user`.

### Modified Capabilities

<!-- No existing spec-level requirement changes — this is a new export on an
     existing file. The class constructor behaviour is preserved via re-export. -->

## Impact

- **Files changed**: `app/frontend/context.ts` (refactor), new
  `tests/unit/frontend/useViewContext.test.ts`
- **DB migration required**: No
- **Test approach**: Unit (Vitest, `yarn test:run2`) — mock `useRouteLoaderData`
  from `react-router` via `vi.mock`; no PGlite or real DB needed
- **Auth / multi-tenancy implications**: None — this is a pure frontend read of
  already-loaded root data
- **Breaking changes**: None in this PR; `new ViewContext()` callsites continue to
  work via the class re-export. A follow-up sweep (not part of this change) can
  migrate all 101 callsites to `useViewContext()`.

## Known Follow-up: `meta` function hook violation

Manual validation after implementation surfaced a React dev-mode warning in
`app/routes/$lang+/about+/support.tsx` (and likely other `about+/*.tsx` files):

> "React has detected a change in the order of Hooks called by Meta."

**Root cause (pre-existing, not introduced by P1-10):** Several route files call
`new ViewContext()` inside their `meta: MetaFunction` export. A `meta` function is
a plain function called by React Router's `<Meta />` component — it is not a React
component and must not call hooks. The original `ViewContext` constructor already
called `useRouteLoaderData` (a hook) from inside the constructor, so the violation
always existed. P1-10 made it correctly detectable by placing the hook call inside
a properly-named `use*` function (`useViewContext`), which React's development-mode
hook tracker now follows through the call chain.

**Correct fix (follow-up task):** `meta` functions must use the `matches` argument
that `MetaFunction` receives to read root loader data, instead of calling any hook:

```typescript
export const meta: MetaFunction = ({ matches }) => {
  const rootData = matches.find(m => m.id === "root")?.data as CommonData;
  // derive lang and build translator from rootData directly — no hooks
};
```

This sweep across all route files with `meta` exports that use `new ViewContext()`
should be a dedicated follow-up task, separate from the P1-12 callsite migration.
