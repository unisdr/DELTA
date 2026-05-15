## ADDED Requirements

### Requirement: Unauthenticated request is redirected to login

The `loader` exported from `app/routes/$lang+/_authenticated.tsx` MUST call `requireUser`
from `~/utils/auth`. When the request carries no valid session, `requireUser` throws a
redirect response to `/:lang/user/login?redirectTo=<encoded-path>`. The layout loader MUST
NOT swallow or transform this redirect — it MUST propagate it to React Router unchanged.

#### Scenario: No session cookie present

- **WHEN** a `GET` request is made to any route nested under `_authenticated` with no session
  cookie
- **THEN** the `_authenticated.tsx` loader MUST throw a `Response` with `Location` header
  pointing to `/:lang/user/login` and a `3xx` status code

#### Scenario: TOTP-enabled user without completed TOTP step

- **WHEN** a `GET` request is made by a user whose session shows `totpEnabled: true` and
  `session.totpAuthed: false`
- **THEN** the `_authenticated.tsx` loader MUST throw a redirect to `/:lang/user/totp-login`

### Requirement: Authenticated request passes through with session data

The `loader` exported from `_authenticated.tsx` MUST resolve the `UserSession` and return it
so that child routes can read it via `useRouteLoaderData`. The loader MUST NOT perform any DB
query of its own. It MUST return an object of shape `{ userSession: UserSession }`.

#### Scenario: Valid authenticated session

- **WHEN** a `GET` request arrives with a valid session cookie for an authenticated user
- **THEN** the loader MUST return `{ userSession }` where `userSession.user.id` is the
  authenticated user's ID
- **AND** the HTTP response status from the loader MUST be `200`

### Requirement: Layout component renders child routes without additional chrome

The default export component of `_authenticated.tsx` MUST render only `<Outlet />` with no
additional wrapper elements, headings, or navigation chrome. Global chrome is rendered by
`root.tsx` and SHALL NOT be duplicated here.

#### Scenario: Component renders outlet only

- **WHEN** the `_authenticated` layout component is rendered
- **THEN** the rendered output MUST include an `<Outlet />` and MUST NOT include any
  `<header>`, `<nav>`, or `<footer>` elements added by this component

### Requirement: Migrated authenticated routes no longer duplicate auth logic

Routes migrated under `_authenticated.tsx` (settings/system, and others in future migrations)
MUST remove their own `authLoaderWithPerm` wrapper. Authentication MUST be guaranteed by the
parent layout. Each migrated route's loader SHALL be a plain `async` function that accepts
`LoaderFunctionArgs` (extended with `userSession`).

#### Scenario: Migrated settings/system route loader runs without own auth wrapper

- **WHEN** an authenticated request reaches `settings+/system` after migration
- **THEN** the `system.tsx` loader MUST execute without calling `authLoaderWithPerm` itself
- **AND** the `userSession` MUST be available to the loader via the `LoaderFunctionArgs`
  passed down from the parent layout

### Requirement: Non-migrated routes are unaffected

Routes that are NOT migrated under `_authenticated.tsx` MUST continue to call their own
`authLoaderWithPerm` wrappers and MUST continue to function exactly as before this change.

#### Scenario: Non-migrated route still enforces its own auth

- **WHEN** a request reaches a route that is NOT yet migrated under any layout
- **THEN** that route's own auth wrapper MUST execute as it did before this change
- **AND** its behaviour MUST be identical to pre-migration behaviour
