## ADDED Requirements

### Requirement: Anonymous request passes through without redirect

The `loader` exported from `app/routes/$lang+/_public.tsx` MUST call `optionalUser` from
`~/utils/auth`. When the request carries no session, `optionalUser` MUST return `null` and
the layout loader MUST NOT throw a redirect. It MUST return `{ userSession: null }` so child
routes can determine anonymous vs. authenticated state.

#### Scenario: No session cookie present

- **WHEN** a `GET` request arrives at a route nested under `_public` with no session cookie
- **THEN** the `_public.tsx` loader MUST return successfully with HTTP status `200`
- **AND** the returned data MUST include `userSession: null`

#### Scenario: Valid authenticated session

- **WHEN** a `GET` request arrives at a route nested under `_public` with a valid session
  cookie
- **THEN** the `_public.tsx` loader MUST return successfully with HTTP status `200`
- **AND** the returned data MUST include `userSession` with the authenticated `UserSession`
  object (not `null`)

### Requirement: TOTP-incomplete authenticated session is redirected

Even for public layout routes, a user who has TOTP enabled but has not completed the TOTP
step MUST be redirected. The `optionalUser` helper in `~/utils/auth` already throws a redirect
in this case; the `_public.tsx` loader MUST NOT suppress this redirect.

#### Scenario: TOTP-enabled user without completed TOTP step on a public route

- **WHEN** a `GET` request arrives at a public-layout route with a session that has
  `totpEnabled: true` and `session.totpAuthed: false`
- **THEN** the `_public.tsx` loader MUST propagate the redirect to `/:lang/user/totp-login`
  thrown by `optionalUser`

### Requirement: Layout component renders child routes without additional chrome

The default export component of `_public.tsx` MUST render only `<Outlet />` with no
additional wrapper elements, headings, or navigation chrome.

#### Scenario: Component renders outlet only

- **WHEN** the `_public` layout component is rendered
- **THEN** the rendered output MUST include an `<Outlet />` and MUST NOT include any
  `<header>`, `<nav>`, or `<footer>` elements added by this component

### Requirement: Migrated public routes receive optional session from parent layout

Routes migrated under `_public.tsx` (hazardous-event list, disaster-event list,
about-the-system, faq) MUST be able to access `userSession` (possibly `null`) from the parent
layout via `useRouteLoaderData`. These routes SHALL NOT duplicate the `optionalUser` session
read unless their internal logic requires it for a reason the parent cannot satisfy.

#### Scenario: Migrated hazardous-event list route receives optional session

- **WHEN** an anonymous request reaches the hazardous-event list route after migration
- **THEN** the route MUST render without error
- **AND** the `isPublic` flag computed by the route MUST be `true`

#### Scenario: Migrated about-the-system route renders for anonymous user

- **WHEN** an anonymous `GET` request reaches `about/about-the-system` after migration
- **THEN** the route MUST return HTTP `200` with the page content
- **AND** no redirect to a login page MUST occur

### Requirement: Non-migrated public-or-auth routes are unaffected

Routes that use `authLoaderPublicOrWithPerm` and are NOT yet migrated under `_public.tsx`
MUST continue to function exactly as before this change.

#### Scenario: Non-migrated public-or-auth route still enforces its own logic

- **WHEN** a request reaches a route that uses `authLoaderPublicOrWithPerm` and is NOT yet
  migrated under any layout
- **THEN** that route's own wrapper MUST execute as it did before this change
- **AND** its behaviour MUST be identical to pre-migration behaviour
