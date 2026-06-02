## Context

`app/frontend/context.ts` exports a single `ViewContext` class. Its constructor
calls `useRouteLoaderData("root")` — a React hook — which violates React's Rules
of Hooks (hooks must only be called at the top level of a React function component
or a custom hook, never inside a constructor). Despite this, the pattern works in
practice because React Router does not enforce the rule at runtime for
`useRouteLoaderData`. The bug surfaces as:

1. Untestability: constructing the class in a unit test requires mocking React's
   internal hook dispatcher.
2. Rule violation: strict-mode linting (e.g. `eslint-plugin-react-hooks`) flags
   hook calls inside constructors.
3. Roadmap blocker: P1-12 (Notices page component contract) will call
   `useViewContext()` directly; building against the class pattern forces an
   immediate second refactor.

The class is referenced in 101 files across `app/routes/`, `app/components/`, and
`app/frontend/`. Migrating all callsites atomically is a separate concern; this
change introduces the hook and keeps a backward-compatible class re-export.

## Goals / Non-Goals

**Goals:**

- Export a `useViewContext()` custom hook from `app/frontend/context.ts` that
  returns `ViewContextResult` (see Decisions below).
- Export a `ViewContextResult` TypeScript interface for use by callers that want
  to type their local variable explicitly.
- Preserve `ViewContext` as a thin backward-compatible class so existing `new
  ViewContext()` callsites continue to compile and run without changes.
- Add a unit test at `tests/unit/frontend/useViewContext.test.ts` that covers the
  happy path and the missing-`lang` error path.

**Non-Goals:**

- Migrating all existing `new ViewContext()` callsites to the hook (follow-up sweep).
- Changing the `DContext` interface in `app/utils/dcontext.ts`.
- Any DB schema, migration, or server-side change.

## Decisions

### Decision 1 — Hook return type includes `user`

`DContext` defines `{ lang, t, url }`. The existing class also exposes `user`
(used directly in several callsites as `ctx.user`). The hook return type SHALL
include `user` to avoid a regression. Defining a separate `ViewContextResult`
interface that extends `DContext` with `user` is cleaner than widening `DContext`
itself — `DContext` is also implemented by `BackendContext` on the server, which
should not be forced to carry a `UserForFrontend`.

**Type to introduce:**
```ts
export interface ViewContextResult extends DContext {
  user: UserForFrontend | null;
}
```

The hook signature:
```ts
export function useViewContext(): ViewContextResult
```

### Decision 2 — Keep `ViewContext` class as a compatibility shim

Alternative considered: remove the class immediately and do a bulk find-replace
across 101 files. Rejected because: (a) it creates a giant PR with high merge-
conflict risk; (b) it conflates a structural refactor with a behaviour-neutral
wrapper addition. The shim approach lets the hook ship cleanly and lets callsites
migrate incrementally.

The shim is a minimal class whose constructor calls `useViewContext()` and copies
all returned fields onto `this`:

```ts
/** @deprecated Use useViewContext() instead */
export class ViewContext implements ViewContextResult {
  t: Translator;
  lang: string;
  user: UserForFrontend | null;
  url: (path: string) => string;
  constructor() {
    const ctx = useViewContext();
    this.t = ctx.t;
    this.lang = ctx.lang;
    this.user = ctx.user;
    this.url = ctx.url;
  }
}
```

The `@deprecated` JSDoc tag makes it visible in IDE hover tooltips without
requiring any separate deprecation mechanism.

### Decision 3 — Unit test mocks `useRouteLoaderData` via `vi.mock`

The unit test lives in `tests/unit/frontend/useViewContext.test.ts`. It uses
`vi.mock("react-router", ...)` to stub `useRouteLoaderData` so no React Router
context is needed. The `createTranslationGetter` global must also be stubbed
(it is normally set by `init.server.tsx` or `frontend/translations.ts`).

No PGlite setup is needed — this is a pure frontend unit test. The test MUST NOT
import `./setup` (that is the PGlite integration setup).

`vitest.config.ts` already includes `tests/unit/**/*.test.{ts,tsx}` in the
`include` glob, so no config changes are required.

### Decision 4 — `url()` method vs. field

`DContext.url` is declared as a method `url(path: string): string`. `ViewContextResult`
extends `DContext`, so `url` on the returned object must be a function. The hook
will build `url` as a closure over `lang`:

```ts
url: (path: string) => urlLang(lang, path),
```

This keeps the method semantics identical to the class, with no runtime difference.

## Risks / Trade-offs

- [Risk] `globalThis.createTranslationGetter` is called unconditionally in the
  hook body. In the test environment this global is not set.
  → Mitigation: the unit test sets `globalThis.createTranslationGetter` to a stub
  before importing the hook, or uses `vi.stubGlobal`.

- [Risk] The backward-compatible class shim still calls a hook inside a
  constructor. The rule violation is preserved until all callsites migrate.
  → Mitigation: the `@deprecated` tag is explicit; the shim is intentionally
  temporary. A follow-up task can do the full sweep once P1-12 is merged.

- [Risk] `urlLang` import in `context.ts` is already present (used by the old
  `url()` method). No new import is needed.

## Migration Plan

1. Implement `useViewContext()` and `ViewContextResult` in `context.ts`.
2. Replace the `ViewContext` class body with the shim.
3. Write the unit test and verify it goes red before implementation (TDD).
4. Run `yarn tsc` and `yarn format:check` — no other files need to change.
5. Open PR targeting `dev`. No DB migration, no deployment steps.

## Open Questions

- None. The scope is fully bounded by the two files listed in the proposal.
