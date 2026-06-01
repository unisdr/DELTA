## ADDED Requirements

### Requirement: useViewContext MUST return correct shape from root loader data
`useViewContext()` SHALL return an object conforming to `ViewContextResult`:
`{ t, lang, user, url }` when root loader data is present and contains a valid
`lang` string. The returned `t` MUST be a callable `Translator` function. The
returned `url` MUST be a function that prepends the current language segment to
a path.

#### Scenario: Happy path — lang and user present
- **WHEN** `useRouteLoaderData("root")` returns `{ common: { lang: "en", user: { id: "u1" } } }`
- **THEN** `useViewContext()` SHALL return an object where `result.lang === "en"`
- **THEN** `result.user` SHALL deep-equal `{ id: "u1" }`
- **THEN** `result.t` SHALL be a function
- **THEN** `result.url("/foo")` SHALL return `"/en/foo"`

#### Scenario: Happy path — user is null (unauthenticated)
- **WHEN** `useRouteLoaderData("root")` returns `{ common: { lang: "fr", user: null } }`
- **THEN** `useViewContext()` SHALL return an object where `result.lang === "fr"`
- **THEN** `result.user` SHALL be `null`
- **THEN** `result.t` SHALL be a function

### Requirement: useViewContext MUST throw when root data or lang is unavailable
`useViewContext()` MUST throw when root loader data is absent or does not contain
a `lang` value. This mirrors the implicit and explicit guards in the original
`ViewContext` constructor.

#### Scenario: lang is absent from common data
- **WHEN** `useRouteLoaderData("root")` returns `{ common: { lang: "", user: null } }`
- **THEN** `useViewContext()` SHALL throw an `Error`
- **THEN** the error message SHALL contain the word "lang"

#### Scenario: root loader data is not yet available
- **WHEN** `useRouteLoaderData("root")` returns `undefined` or `null`
- **THEN** `useViewContext()` SHALL throw an `Error`
- **AND** existing callsites MUST NOT silently receive `undefined` values — a
  thrown error is the correct and expected outcome

### Requirement: ViewContext class remains callable for backward compatibility
The `ViewContext` class SHALL remain exported from `app/frontend/context.ts` so
that existing `new ViewContext()` callsites continue to compile and run without
modification. The class MUST delegate entirely to `useViewContext()` — it SHALL
NOT duplicate the logic from the hook.

#### Scenario: Instantiation via new ViewContext() still works
- **WHEN** `new ViewContext()` is called inside a React function component with
  valid root loader data present
- **THEN** the instance SHALL expose `t`, `lang`, `user`, and `url` with the same
  values as `useViewContext()` would return in the same render context

### Requirement: ViewContextResult interface is exported
A TypeScript interface `ViewContextResult` SHALL be exported from
`app/frontend/context.ts`. It SHALL extend `DContext` and add `user:
UserForFrontend | null`.

#### Scenario: Type is importable by callers
- **WHEN** a caller imports `{ ViewContextResult }` from `~/frontend/context`
- **THEN** TypeScript SHALL resolve the import without error
- **THEN** the type SHALL include `t`, `lang`, `url`, and `user` fields
