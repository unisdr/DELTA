## 1. Write failing tests (Red)

- [x] 1.1 Create `tests/integration/routes/layout-auth.test.ts` — import the `loader` export
      from `app/routes/$lang+/_authenticated.tsx` (file does not exist yet, so `loader` is
      undefined; the import will succeed but calls will throw). Write a test asserting that calling
      the loader with an unauthenticated request throws/rejects with a redirect `Response` to
      `/:lang/user/login`. Use `vi.mock("~/utils/session")` to control `getUserFromSession` return
      value (return `null` for unauthenticated). Confirm the test fails (file-not-found or
      assertion failure). Run: `yarn vitest run tests/integration/routes/layout-auth.test.ts`

- [x] 1.2 In the same test file, add a test asserting that calling the `_authenticated.tsx`
      loader with a valid mock `UserSession` returns `{ userSession }` with the mock user's `id`.
      Use `vi.mock` to make `getUserFromSession` return a minimal `UserSession` object.

- [x] 1.3 In the same test file, add a test asserting that calling the `_public.tsx` loader
      with no session cookie returns `{ userSession: null }` and does NOT throw.

- [x] 1.4 In the same test file, add a test asserting that calling the `_public.tsx` loader
      with a valid mock session returns `{ userSession }` with the mock user's `id`.

## 2. Implement `_authenticated.tsx` (Green — authenticated layout)

- [x] 2.1 Create `app/routes/$lang+/_authenticated.tsx`. Export:
  - `AuthenticatedLayoutData` type: `{ userSession: UserSession }` (import `UserSession` from
    `~/utils/session`)
  - `loader`: calls `requireUser(args)` from `~/utils/auth`; returns
    `Response.json({ userSession })` — where `userSession` is the value returned by
    `requireUser`. If `requireUser` throws (redirect), propagate it unchanged.
  - Default export component: renders `<Outlet />` only (import from `react-router`). No
    chrome, no wrapper elements.
  - Run: `yarn vitest run tests/integration/routes/layout-auth.test.ts` — tests 1.1 and 1.2
    MUST pass.

## 3. Implement `_public.tsx` (Green — public layout)

- [x] 3.1 Create `app/routes/$lang+/_public.tsx`. Export:
  - `PublicLayoutData` type: `{ userSession: UserSession | null }` (import `UserSession` from
    `~/utils/session`)
  - `loader`: calls `optionalUser(args)` from `~/utils/auth`; returns
    `Response.json({ userSession })` — where `userSession` is `null` or the resolved session.
    If `optionalUser` throws (TOTP redirect), propagate it unchanged.
  - Default export component: renders `<Outlet />` only. No chrome, no wrapper elements.
  - Run: `yarn vitest run tests/integration/routes/layout-auth.test.ts` — all 4 tests MUST pass.

## 4. Migrate representative authenticated route

`settings+/system.tsx` is excluded from this pilot — `settings+/route.tsx` contains a
redirect rule and auth guard that would be severed by moving `system.tsx` to `_authenticated+/`.
That migration is deferred to the Settings domain rewrite. See design.md Decision 1 and Q4.

- [x] 4.1 Verify the migration candidate before starting: confirm `hazardous-event+/new.tsx`
      uses `authLoaderWithPerm` and that `hazardous-event+/` has no `route.tsx`. If confirmed,
      use it. If `new.tsx` uses a different wrapper, pick another `authLoaderWithPerm` route
      from a directory that has no `route.tsx`.

- [x] 4.2 Create `app/routes/$lang+/_authenticated+/` directory. Create
      `app/routes/$lang+/_authenticated+/hazardous-event+/` directory. Move the confirmed route
      file into `_authenticated+/hazardous-event+/`. The URL MUST remain unchanged (e.g.,
      `/:lang/hazardous-event/new`). Remove the `authLoaderWithPerm` wrapper from the loader;
      replace it with a plain `async (args: LoaderFunctionArgs)` function. The `_authenticated`
      parent layout now guarantees the user is logged in. Confirm `yarn tsc` clean.

- [x] 4.3 Run `yarn dev` [MANUAL VERIFICATION REQUIRED] — verify the route URL still resolves and an unauthenticated request
      is redirected to login. Run: `yarn vitest run tests/integration/routes/layout-auth.test.ts`
      — no regressions.

## 5. Migrate representative public routes

All migrations below use the **directory grouping approach**: create `app/routes/$lang+/_public+/`
and move files into subdirectories within it. The `_public` prefix is pathless — all URLs are
unchanged. Only move files from directories that have no `route.tsx`.

- [x] 5.1 Create `app/routes/$lang+/_public+/` directory. Create
      `app/routes/$lang+/_public+/faq+/` directory. Move `faq+/_index.tsx` to
      `_public+/faq+/_index.tsx`. URL MUST remain `/:lang/faq`. No auth wrapper to remove (no
      loader). Confirm `yarn tsc` clean. Confirm `yarn dev` serves `/:lang/faq`.

- [x] 5.2 Create `app/routes/$lang+/_public+/about+/` directory. Move only
      `about+/about-the-system.tsx` to `_public+/about+/about-the-system.tsx`. The remaining
      files in `about+/` (`methodologies.tsx`, `partners.tsx`, `support.tsx`,
      `technical-specifications.tsx`) stay in the original `about+/` directory — do NOT move them.
      URL MUST remain `/:lang/about/about-the-system`. No auth wrapper to remove. Confirm `yarn tsc`
      clean. Confirm `yarn dev`.

- [x] 5.3 Move `hazardous-event+/_index.tsx` to `_public+/hazardous-event+/_index.tsx`.
      `authLoaderPublicOrWithPerm` wrapper intentionally kept — it embeds a 3-step auth chain
      (countryAccountsId check + approvedRecordsArePublic gate + optionalUser) that cannot be
      safely collapsed to `optionalUser` alone. Removing it would allow anonymous access on
      private instances. Wrapper removal is deferred to a dedicated spec in the main roadmap.
      URL remains `/:lang/hazardous-event`. Confirm `yarn tsc` clean. Confirm `yarn dev`.

Note: `disaster-event+/_index.tsx` was an earlier candidate but is deferred. The three routes
above (5.1–5.3) sufficiently prove the `_public` layout pattern. Verify `disaster-event+/` has
no `route.tsx` before including it in a future migration.

## 6. Refactor and quality gates

- [x] 6.1 **Gate 1** — Run `yarn vitest run tests/integration/routes/layout-auth.test.ts`.
      All tests MUST be green.

- [x] 6.2 **Gate 2** — Run `yarn tsc`. Zero TypeScript errors. Pay special attention to:
  - `AuthenticatedLayoutData` and `PublicLayoutData` type exports are importable from their
    respective layout files.
  - The migrated routes no longer reference removed `authLoaderWithPerm` imports (remove
    unused imports).

- [x] 6.3 **Gate 3** — Run `yarn format:check`. If it fails, run `yarn format` then recheck.
      Note: 449 pre-existing format issues exist across the repo; all our new files pass Prettier.

- [x] 6.4 **Gate 4** — Anti-pattern review. Open
      `.github/skills/anti-pattern-check/SKILL.md` and verify:
  - `_authenticated.tsx` uses `requireUser` (not `authLoaderApiDocs`, not a bare session read
    without redirect on failure).
  - No `authLoaderApiDocs` patterns introduced.
  - No `sanitizeInput` on user-generated text.
  - No missing `await` on any Drizzle mutation (not applicable here but scan the migrated
    routes for pre-existing violations not introduced by this change).
  - Also fixed pre-existing `as any` cast in new.tsx: `(params as any).lang` → `params.lang ?? "en"`.

- [x] 6.5 **Gate 5** — SOLID review. Invoke the `solid-reviewer` agent on the two new layout
      files (`_authenticated.tsx` and `_public.tsx`) and confirm: Single Responsibility (each
      layout does exactly one thing — auth check or optional auth); no violations flagged.

- [x] 6.6 **Gate 6** — Documentation review. Confirm inline comments in `_authenticated.tsx`
      and `_public.tsx` explain WHY (e.g. "This layout centralises auth enforcement so child routes
      do not need to duplicate it — Strangler Fig migration") not WHAT. No comment should merely
      restate the code.

- [x] 6.7 **Gate 7** — Project conventions review. Check `.github/copilot-instructions.md`:
  - Both layout files use `react-router` (not `@remix-run/react`).
  - No `authLoaderApiDocs` used.
  - Internal links in any new JSX use `LangLink` or `urlLang`.
  - No direct `console.log` calls in production paths.

## 7. Archive and PR

- [ ] 7.1 After all 7 gates pass, run `/opsx:archive` on branch
      `feature/ca-dual-layout-routes` to archive this change.

- [ ] 7.2 Raise a PR from `feature/ca-dual-layout-routes` targeting `dev` with title:
      `Feature: ca-dual-layout-routes — add _authenticated and _public layout routes (5 routes migrated)`.
