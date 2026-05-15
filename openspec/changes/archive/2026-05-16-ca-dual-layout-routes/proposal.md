## Why

Every authenticated route in `app/routes/$lang+/` independently calls `authLoaderWithPerm`,
`authLoader`, or `optionalUser`, duplicating auth enforcement across 60+ route loaders. There
are no shared parent layout routes to centralise this concern. Extracting auth enforcement into
two React Router v7 layout route files eliminates that duplication, makes the auth contract
explicit, and establishes the Strangler Fig foundation for all future route migrations.

## What Changes

- **New file** `app/routes/$lang+/_authenticated.tsx` — layout route whose loader calls
  `authLoaderWithPerm` for the minimum "logged-in" check, redirects unauthenticated users to
  `/user/login`, and makes `userSession` available to child routes via loader data.
- **New file** `app/routes/$lang+/_public.tsx` — layout route whose loader calls `optionalUser`,
  passes through for anonymous visitors, and makes the optional session available to child routes.
- **Migrated route** `app/routes/$lang+/settings+/system.tsx` — moved under the
  `_authenticated` layout (renamed segment prefix) as a representative authenticated detail route.
- **Migrated route** `app/routes/$lang+/hazardous-event+/_index.tsx` — moved under the
  `_public` layout as a representative public-or-auth list route.
- **Migrated route** `app/routes/$lang+/disaster-event+/_index.tsx` — moved under the
  `_public` layout as a second representative public-or-auth list route.
- **Migrated route** `app/routes/$lang+/about+/about-the-system.tsx` — moved under the
  `_public` layout as a representative fully-anonymous route.
- **Migrated route** `app/routes/$lang+/faq+/_index.tsx` — moved under the `_public` layout
  as a representative no-loader anonymous route.
- **New test file** `tests/integration/routes/layout-auth.test.ts` — integration tests
  confirming the `_authenticated` loader redirects unauthenticated requests and the `_public`
  loader passes through.

No routes outside the 5 migrated representatives are touched in this change (Strangler Fig).
Existing non-migrated routes continue to call auth helpers directly and are not affected.

## Capabilities

### New Capabilities

- `authenticated-layout-route`: A React Router v7 parent layout route at the `$lang+` level
  that enforces authentication for all child segments, eliminating per-route auth duplication.
- `public-layout-route`: A React Router v7 parent layout route at the `$lang+` level that
  passes through for anonymous users while still resolving an optional session for personalised
  rendering in child segments.

### Modified Capabilities

<!-- No existing spec-level behaviour changes. Non-migrated routes are unaffected. -->

## Impact

**Files changing:**

| File                                            | Reason                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| `app/routes/$lang+/_authenticated.tsx`          | New: layout route enforcing `requireUser`                                |
| `app/routes/$lang+/_public.tsx`                 | New: layout route allowing anonymous access                              |
| `app/routes/$lang+/settings+/system.tsx`        | Migrate: adopt `_authenticated` layout; remove own `authLoaderWithPerm`  |
| `app/routes/$lang+/hazardous-event+/_index.tsx` | Migrate: adopt `_public` layout; remove own `authLoaderPublicOrWithPerm` |
| `app/routes/$lang+/disaster-event+/_index.tsx`  | Migrate: adopt `_public` layout; remove own `authLoaderPublicOrWithPerm` |
| `app/routes/$lang+/about+/about-the-system.tsx` | Migrate: adopt `_public` layout (no auth change, already anonymous)      |
| `app/routes/$lang+/faq+/_index.tsx`             | Migrate: adopt `_public` layout (no auth change, already anonymous)      |
| `tests/integration/routes/layout-auth.test.ts`  | New: integration tests for layout loaders                                |

**DB migration required:** No.

**Test approach:** Integration tests using Vitest with mocked session utilities (`vi.mock`).
No real DB or PGlite needed — tests exercise the loader functions directly by constructing
mock `Request` objects. Suite: `yarn test:run2`.

**Security / multi-tenancy implications:**

- `_authenticated.tsx` is a security-sensitive file. Its loader MUST call `requireUser` (via
  `authLoader` / `authLoaderWithPerm`) and MUST throw a redirect on failure. It must NOT
  validate `countryAccountsId` — that remains per-route because some authenticated routes
  (e.g. `user/select-instance`) do not require an active instance.
- `_public.tsx` calls `optionalUser` only; it never throws a redirect. Anonymous access is
  intentional and correct for the routes placed under it.
- Neither layout route performs DB queries, so multi-tenancy scoping is not applicable at
  this layer.
- The `root.tsx` loader already reads the session independently to build the menu bar. The
  layout loaders will each add one additional session read per request for routes placed under
  them. This is a known and acceptable trade-off (cookie-based sessions are cheap).
