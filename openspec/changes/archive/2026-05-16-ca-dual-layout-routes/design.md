## Context

The codebase uses React Router v7 (Remix-style SSR) with file-based routing under
`app/routes/$lang+/`. Every route file today independently calls an `authLoader*` or
`authAction*` helper from `~/utils/auth`, meaning the 60+ route files each replicate the
same session-read → redirect-if-unauthenticated logic. The `remix-flat-routes` convention
(used by this project) supports pathless layout routes: a file named `_layoutName.tsx`
becomes a layout that wraps children whose filename segment starts with `_layoutName.`.

The `root.tsx` loader independently reads the session to populate the global shell
(`RegularMenuBar`, footer). That read is unconditional and cannot be deduped easily without
a larger refactor. The layout loaders will each add one additional session read for the routes
placed under them — this is acceptable because cookie sessions are serialised/deserialised in
memory and the cost is negligible.

## Goals / Non-Goals

**Goals:**

- Create `_authenticated.tsx` as a pathless layout route that enforces `requireUser` and
  makes `userSession` available to child routes via their parent loader data.
- Create `_public.tsx` as a pathless layout route that resolves an optional session via
  `optionalUser` and makes it available without enforcing authentication.
- Migrate 5 representative routes to prove the pattern before the broader roll-out.
- Add integration tests that exercise both layout loaders in isolation.

**Non-Goals:**

- Migrating all 60+ routes (that is the Strangler Fig roadmap, done incrementally).
- Removing the `RegularMenuBar` from `root.tsx` or consolidating the root + layout session
  reads (a separate refactor).
- Changing URL structure — migrated routes keep exactly the same URLs.
- Validating `countryAccountsId` inside the layout loaders (remains per-route).

## Decisions

### Decision 1: Pathless layout route — directory grouping, not flat-file prefix

**Choice:** Create `_authenticated.tsx` and `_public.tsx` as layout files at
`app/routes/$lang+/`. For pilot route migrations, use the **directory grouping approach**:
create `_public+/` and `_authenticated+/` at `app/routes/$lang+/` and move migrated
directories into them.

**Why flat-file prefix was rejected (revised):** In `remix-flat-routes`, the dot-prefix
convention (`_name.child.tsx`) only wraps files at the **same directory level** as the layout
file. All routes in this codebase live inside `+` subdirectories (`about+/`, `faq+/`,
`hazardous-event+/`, etc.). Using flat-file prefix would require pulling files out of their
subdirectories and encoding the full path in the filename (e.g.,
`_public.about.about-the-system.tsx`). This splits domain directories across two locations
and creates a confusing inconsistency during the Strangler Fig transition.

**Directory grouping approach:** `_public+/` and `_authenticated+/` are pathless directories
(`_` prefix = no URL segment added). Routes placed inside them preserve their exact URLs while
adopting the parent layout. A file at `_public+/faq+/_index.tsx` renders at `/:lang/faq`
unchanged.

**Constraint — no `route.tsx` in target directories:** Only directories that have NO
`route.tsx` are candidates for migration in this pilot. A `route.tsx` with loader logic
(auth guard, redirect) creates a parent–child dependency that a directory move would sever.
`settings+/` is the only directory in this codebase with a functional `route.tsx` and is
therefore excluded from the pilot. Its migration is deferred to the Settings domain rewrite.

**Rationale:** The directory grouping approach is unambiguous, works for index routes
(`_index.tsx` naming is preserved), and keeps each domain's files co-located.

### Decision 2: `_authenticated.tsx` calls `requireUser`, not `authLoaderWithPerm`

**Choice:** The layout's loader calls `requireUser(args)` directly (the bare "is logged in?"
check) rather than `authLoaderWithPerm(permission, fn)`. Per-route permission checks remain
in each route's own loader/action.

**Alternative considered:** Calling `authLoaderWithPerm` with a base permission like
`"ViewData"`. Rejected because not all authenticated routes require `"ViewData"` — settings
routes, user-profile routes, and admin routes have different permission requirements. Using
a single broad permission would either be too restrictive or too permissive.

**Rationale:** The layout's single responsibility is "is the user logged in?". Authorisation
(which permission) remains the child route's concern. This matches the Single Responsibility
Principle and avoids coupling the layout to a specific permission.

### Decision 3: Layout renders `<Outlet />` only, adds no chrome

**Choice:** Both layout route components render only `<Outlet />`. No additional wrapping
elements, no chrome.

**Rationale:** `root.tsx` already renders the full shell (header, footer, menu bar) for every
route. Adding chrome in the layout routes would create double-wrapping for migrated routes.

### Decision 4: `AuthenticatedLayoutData` and `PublicLayoutData` types exported from layout files

**Choice:** Export the loader return type from each layout file so child routes can type
`useRouteLoaderData` calls.

**TypeScript types introduced:**

```ts
// In _authenticated.tsx
export type AuthenticatedLayoutData = {
	userSession: UserSession;
};

// In _public.tsx
export type PublicLayoutData = {
	userSession: UserSession | null;
};
```

`UserSession` is the existing type exported from `~/utils/session`.

**Rationale:** Explicit types prevent child routes from using `any` when reading parent loader
data via `useRouteLoaderData`. Exporting from the layout file keeps the types co-located with
their source of truth.

### Decision 5: Migrated routes — parallel loader constraint

**Choice:** React Router v7's `defaultDataStrategy` calls all matched route loaders via
`Promise.all` — parent layout loaders and child route loaders run **concurrently**, not
sequentially. The `_authenticated` layout's `requireUser` call therefore does NOT complete
before the child route's loader starts.

**Consequence for permission-checked routes:** A child route with a permission check (e.g.
`hasPermission(request, "EditData")`) must call `requireUser` at the top of its own loader.
Without it, an unauthenticated request reaches the permission check, `hasPermission` returns
`false`, and the route throws a 403 — which React Router renders as an error boundary — instead
of the expected login redirect.

**Rule for migrations under `_authenticated+/`:**
- Routes with **no permission check** (auth-only): may rely on the layout; their loaders need
  not call `requireUser` themselves. The layout redirect will win because React Router's
  `findRedirect` iterates results in reverse (child-first) and the child throws no redirect
  of its own.
- Routes with **a permission check**: MUST call `await requireUser(...)` before the permission
  check. The layout still provides value — it makes `userSession` available to the component
  tree via `useRouteLoaderData` and documents that the directory requires authentication — but
  it cannot act as the sole auth gate for these routes.

**Note on `findRedirect` child-first ordering:** React Router v7 `findRedirect` iterates
loaderResults in reverse (deepest/child first). If both parent and child throw a redirect,
the child's redirect wins. This means a child that has its own `requireUser` + login redirect
will produce the correct UX (login redirect with the current URL as `redirectTo`), regardless
of what the parent layout throws.

**`authLoaderGetUserForFrontend` / `authLoaderGetAuth` migration note:** These helpers read
`args.userSession` — a field that `authLoaderWithPerm` injected into loader args before calling
the inner function. When removing the wrapper, the migrated loader must:
1. Capture the `UserSession` returned by `requireUser`: `const userSession = await requireUser(...)`
2. Spread it into a named variable before passing to these helpers:
   ```ts
   const argsWithSession = { ...loaderArgs, userSession };
   const user = await authLoaderGetUserForFrontend(argsWithSession);
   ```
   (A named variable is required; TypeScript's excess property checking rejects an inline object
   literal because `authLoaderGetUserForFrontend` is typed as `{ request: Request }`.)

**Exception:** Routes under `_public.tsx` that previously used `authLoaderPublicOrWithPerm`
(which checks the `approvedRecordsArePublic` setting) must retain their own internal
public-or-auth logic, because the layout only resolves `optionalUser` — it does not know the
per-route public access rule.

### Decision 7: `route.tsx` single-responsibility convention going forward

**Choice:** `route.tsx` files in `+` directories MUST render only `<Outlet />` with no loader
logic. Redirect logic for a section's default URL belongs in that directory's `_index.tsx`,
not in `route.tsx`.

**Context:** `settings+/route.tsx` currently combines three concerns: a bare auth guard
(`authLoader`), a default redirect (`/settings` → `/settings/system`), and layout rendering
(`<Outlet />`). When the Settings domain is migrated under `_authenticated+/`, the auth guard
becomes redundant and the redirect should be extracted to `settings+/_index.tsx` (a
redirect-only file).

**Rationale:** Mixing redirect logic into a layout file means any child route cannot be
independently moved without carrying that side-effect. Single-responsibility `route.tsx`
(Outlet only, no loader) avoids this coupling and makes directory migrations unambiguous.

### Decision 6: Test approach — mock session utilities with `vi.mock`

**Choice:** `tests/integration/routes/layout-auth.test.ts` uses `vi.mock("~/utils/session")`
and `vi.mock("~/utils/auth")` to control what session functions return, then calls the exported
`loader` functions directly with constructed `Request` objects.

**Alternative considered:** PGlite + real session flow. Rejected because the layout loaders
do not touch the database — they only read the session cookie. A full PGlite setup would add
unnecessary complexity.

**Rationale:** Session utilities are pure async functions; mocking them is the minimal and
most focused test strategy. This keeps the test suite in `yarn test:run2` (no external DB).

## Risks / Trade-offs

**[Risk] Double session read per request for migrated routes**
→ Mitigation: Cookie sessions are serialised/deserialised in memory (~0.1 ms each); the
performance impact is negligible. Accepted as an explicit trade-off for architectural
clarity. A future refactor can share the session read via React Router's loader context if
it becomes measurable.

**[Risk] URL breakage during directory moves**
→ Mitigation: Directory grouping (`_public+/faq+/`) preserves URLs unchanged because `_public`
is a pathless segment (no URL prefix added). The implementer must run `yarn dev` and manually
verify each migrated URL after the move. Integration tests confirm loader behaviour.
Only directories WITHOUT a `route.tsx` are moved in this pilot (see Decision 1).

**[Risk] Non-migrated routes are unaffected but look inconsistent during Strangler Fig**
→ Mitigation: This is by design. The inconsistency is temporary. The proposal explicitly
states that all other routes migrate in their own domain rewrites.

**[Risk] TypeScript strict mode: `useRouteLoaderData` may return `unknown`**
→ Mitigation: Export `AuthenticatedLayoutData` and `PublicLayoutData` from the layout files
and use them as the generic type argument to `useRouteLoaderData`.

## Migration Plan

1. Create `_authenticated.tsx` and `_public.tsx` (no routes moved yet; existing routes
   continue to function without any layout parent).
2. For each of the 5 representative routes, rename the file to adopt the layout prefix, and
   remove the now-redundant auth wrapper from its loader.
3. Run `yarn tsc` and `yarn test:run2` after each route migration to confirm no regression.
4. Raise a single PR for the 5-route migration on branch `feature/ca-dual-layout-routes`
   targeting `dev`.

**Rollback:** The change is a pure rename + extraction. Rolling back means renaming the files
back and restoring the per-route auth wrappers. No DB migration, no data loss risk.

## Open Questions

- **Q1:** Should `_authenticated.tsx` also check `countryAccountsId` and redirect to
  `/user/select-instance` if absent? Current decision: no — some valid authenticated routes
  (e.g. `user/select-instance` itself) do not require a selected instance. Revisit when
  those routes are migrated.
- **Q2:** Should `useRouteLoaderData` from `_authenticated.tsx` replace the session read in
  child route loaders entirely, or supplement it? Implementer may choose the simpler approach
  per route; the spec only requires that the layout data is available.
- **Q3 (resolved):** Should the pilot use flat-file prefix or directory grouping for route
  migrations? **Resolved: directory grouping** (`_public+/`, `_authenticated+/`). See
  Decision 1. Flat-file prefix is unworkable for subdirectory routes because it severs files
  from their domain directory and breaks `_index.tsx` naming.
- **Q4 (resolved):** Is `settings+/system.tsx` a valid pilot migration candidate? **Resolved:
  no.** `settings+/route.tsx` contains a redirect rule (`/settings` → `/settings/system`) and
  an auth guard that would be severed by moving `system.tsx` into `_authenticated+/`. Migration
  is deferred to the Settings domain rewrite, at which point `route.tsx` is deleted and replaced
  by `settings+/_index.tsx` (redirect only, no auth guard).
