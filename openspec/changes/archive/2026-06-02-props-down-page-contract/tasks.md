## 1. TDD Red — Write Failing Unit Test

- [x] 1.1 Create `tests/unit/frontend/hazardeventlist.test.tsx`.
      Use `vi.mock("react-router", ...)` to stub `useRouteLoaderData` and stub
      `useLoaderData` as a throwing spy (to confirm the component never calls it).
      Stub `globalThis.createTranslationGetter` with a passthrough translator.
      Construct a minimal `HazardousEventListLoaderData` stub: one item with a
      known `id` prefix and `hipHazard.name = "Flood"`, plus valid `pagination`,
      `filters`, `hip`, `organizations`, `isPublic: false`, and `countryAccountsId`.
      Use `renderToString` from `react-dom/server` to render `HazardousEventListPage`
      with the stub data and assert:
  - the rendered HTML string contains `data-testid="list-table"`
  - the rendered HTML string contains the first 5 chars of the stub item UUID
  - the rendered HTML string contains "Flood"
    Add a second test with `data.data.items = []` and
    `data.data.pagination.totalItems = 0` asserting the empty-state message is
    present and no `list-table` testid appears.
    Add a third test with `isPublic: true` asserting "Record status" header text
    is absent.
    Verify the test file fails with "Cannot find module '~/frontend/events/hazardeventlist'"
    or a type error — confirming it is genuinely red before implementation.
    Run: `yarn vitest run tests/unit/frontend/hazardeventlist.test.tsx`

- [x] 1.2 Confirm the import of `HazardousEventListPage` and
      `HazardousEventListLoaderData` from `~/frontend/events/hazardeventlist` causes
      a compile/import error at this stage (component does not yet export these names).
      No fix is applied yet — this is the TDD red phase.

## 2. Create Shared PageProps Type

- [x] 2.1 Create `app/frontend/page-props.ts` with the following content:
  ```ts
  /**
   * Contract for all page-level components in the Clean Architecture migration.
   * Page components MUST accept loader data via this prop and MUST NOT call
   * useLoaderData() internally. The route file is the sole adapter that calls
   * useLoaderData() and passes the result as the `data` prop.
   */
  export type PageProps<T> = {
  	data: T;
  };
  ```
  Run: `yarn tsc` to confirm zero errors on this new file.

## 3. Refactor HazardousEventListPage

- [x] 3.1 In `app/frontend/events/hazardeventlist.tsx`:
  - Add import: `import type { PageProps } from "~/frontend/page-props";`
  - Add import: `import type { hazardousEventsLoader } from "~/backend.server/handlers/events/hazardevent";`
    (if not already present — it is, on line 6, but the type alias is new)
  - Export the loader data type alias immediately after the existing imports:
    ```ts
    export type HazardousEventListLoaderData = Awaited<
    	ReturnType<typeof hazardousEventsLoader>
    >;
    ```
  - Rename `ListViewArgs` → `HazardousEventListPageProps` and change its shape to:
    ```ts
    type HazardousEventListPageProps =
    	PageProps<HazardousEventListLoaderData> & {
    		isPublic: boolean;
    		basePath: string;
    		linksNewTab?: boolean;
    		actions?: (item: any) => React.ReactNode;
    	};
    ```
  - Remove the `ctx: ViewContext` field from `HazardousEventListPageProps` — the
    component MUST call `const ctx = new ViewContext()` internally (or use
    `useViewContext()`) to obtain the view context, consistent with how other
    components in the codebase acquire it.
  - Rename the export from `ListView` → `HazardousEventListPage`.
  - Remove the `useLoaderData` import and the `const ld = useLoaderData<...>()`
    call on the first line of the function body.
  - Replace all references to `ld` inside the component body with `args.data`.
  - Remove `useRouteLoaderData` if it is only used for user data inside this
    component — obtain `user` via `ctx.user` from `useViewContext()` instead
    (since `ViewContextResult` already carries `user`).
  - Run: `yarn vitest run tests/unit/frontend/hazardeventlist.test.tsx`

- [x] 3.2 Verify the component no longer imports or calls `useLoaderData`.
      Run: `yarn tsc` — zero TypeScript errors expected at this point (both source
      and test files must type-check cleanly).

## 4. Update Consumer: Public Index Route

- [x] 4.1 In `app/routes/$lang+/_public+/hazardous-event+/_index.tsx`:
  - Update the import line from `import { ListView }` to
    `import { HazardousEventListPage }` from `~/frontend/events/hazardeventlist`.
  - In the `Data` default export, update the `<ListView ...>` JSX to
    `<HazardousEventListPage ... data={ld} />`.
  - Remove the `ctx` prop from the call site (the component now acquires it
    internally).
  - Confirm `isPublic` and `basePath` props remain correct.
  - Run: `yarn vitest run tests/unit/frontend/hazardeventlist.test.tsx`

## 5. Update Consumer: Picker Route

- [x] 5.1 In `app/routes/$lang+/hazardous-event+/picker.tsx`:
  - Update the import line from `import { ListView }` to
    `import { HazardousEventListPage }` from `~/frontend/events/hazardeventlist`.
  - In the `Data` default export, add `const ld = useLoaderData<typeof loader>();`
    after `const ctx = new ViewContext();`.
  - Convert the plain function call `ListView({ ctx, ... })` to JSX
    `<HazardousEventListPage data={ld} isPublic={false} basePath="..." ... />`.
  - Remove the `ctx` prop from the JSX (component acquires it internally).
  - Confirm `linksNewTab` and `actions` props remain correct.
  - Run: `yarn vitest run tests/unit/frontend/hazardeventlist.test.tsx`

## 6. Full Test Pass and Quality Gates

- [x] 6.1 Gate 1 — Run unit test file:
      `yarn vitest run tests/unit/frontend/hazardeventlist.test.tsx`
      All scenarios (items present, empty state, public mode, no useLoaderData call)
      MUST pass green.

- [x] 6.2 Gate 2 — TypeScript check:
      `yarn tsc`
      Zero type errors across all changed files.

- [x] 6.3 Gate 3 — Prettier check:
      `yarn format:check`
      If not clean, run `yarn format` then re-check.

- [x] 6.4 Gate 4 — Anti-pattern review:

  > **Known pre-existing bug (do not fix in this PR):** The hazardous-event picker
  > is opened via `<LangLink target="_blank" rel="opener">` which opens a new browser
  > tab instead of a popup window. The picker is built around `window.opener.postMessage`
  > and `window.close()`, which requires it to be opened as a popup via
  > `window.open(url, 'picker', 'width=900,height=600')`. Using `target="_blank"` makes
  > `window.opener` null in most browsers, so clicking "Select" shows an error alert
  > and the parent form never receives the selection. Fix: replace the `<LangLink>` with
  > a `<button onClick>` that calls `window.open(...)` with explicit popup dimensions.
  > This will be addressed when the hazardous-event module is picked up for refactoring.
  >
  > **Known pre-existing bug (do not fix in this PR):** The "Clear filters" button
  > navigates to `ctx.url(args.basePath)` — a bare path with no query params — which
  > resets pagination and any sort state alongside the filters. The correct behaviour
  > is to strip only filter params and preserve table-state params (page, pageSize,
  > sort column/direction). This will be addressed when the hazardous-event module is
  > picked up for full refactoring. The P1-12 refactor MUST preserve the existing
  > (buggy) behaviour unchanged — do not accidentally fix or worsen it.

  Open `.github/skills/anti-pattern-check/SKILL.md` and manually verify none of
  the listed anti-patterns appear in any changed file. In particular confirm:
  - No `as any` type assertions introduced (except pre-existing `actions` param
    which is already typed `any` in the original codebase and is out of scope)
  - No `useLoaderData` remaining in `hazardeventlist.tsx`
  - No `authLoaderApiDocs` usage introduced
  - `countryAccountsId` scoping unchanged in loader

- [x] 6.5 Gate 5 — SOLID review:
      Invoke `solid-reviewer` agent on the changed files. Confirm:
  - Single Responsibility: `HazardousEventListPage` is a pure render function;
    loader invocation is solely the route's responsibility.
  - Open/Closed: `PageProps<T>` generic is open for extension by future page
    components without modification.

- [x] 6.6 Gate 6 — Documentation review:
      Confirm JSDoc and inline comments in changed files explain WHY (architectural
      motivation: CA props-down contract) not WHAT. The `PageProps<T>` type MUST have
      a JSDoc comment explaining the contract rule (component MUST NOT call
      `useLoaderData()`). Exported `HazardousEventListLoaderData` MUST have a brief
      comment explaining it is derived from the handler to stay in sync.

- [x] 6.7 Gate 7 — Project conventions review:
      Check `.github/copilot-instructions.md`:
  - Route files nest under `$lang+/` — confirmed unchanged.
  - Server-only imports in route files use `.server` suffix — confirmed unchanged.
  - `LangLink` used for internal links — confirmed unchanged.
  - No new translation strings added (no `yarn i18n:extractor` run needed).

- [x] 6.8 Gate 8 — Code review:
      Run `.github/skills/code-review/SKILL.md` in full on all changed files.
      Address any findings before archiving.

## 7. Regression and Archive

- [x] 7.1 Regression check: Run the full PGlite unit + integration suite:
      `yarn test:run2`
      Zero new failures. Any pre-existing failures MUST be confirmed as pre-existing
      by running the suite on the `dev` branch base before attributing them to this
      change. Do not archive until regression is clean or pre-existing failures are
      documented.

- [x] 7.2 Archive: On the `feature/ca-props-down-contract` branch, run
      `/opsx:archive` to move this change from `openspec/changes/` to
      `openspec/changes/archive/`. Tick this checkbox after archive completes
      successfully.

- [ ] 7.3 Raise PR: Push branch to `origin` with
      `git push origin feature/ca-props-down-contract` and open a PR targeting `dev`
      (not `main`). PR title should be:
      `Refactor: props-down PageProps<T> contract — HazardousEventListPage reference impl`
      Link to the Notices Pilot Roadmap item P1-12 in the PR description.
