## 1. Red — Write the failing unit test

- [x] 1.1 Create the directory `tests/unit/frontend/` if it does not exist
- [x] 1.2 Create `tests/unit/frontend/useViewContext.test.ts` with a `vi.mock("react-router", ...)` stub for `useRouteLoaderData` and a `vi.stubGlobal` for `globalThis.createTranslationGetter`; import `useViewContext` from `~/frontend/context` and write test cases for: (a) happy path with lang + user returning correct `{ t, lang, user, url }` shape, (b) happy path with `user: null`, (c) missing lang throws an Error whose message contains "lang", (d) `useRouteLoaderData` returns `undefined` — hook MUST throw (not silently return undefined fields)
- [x] 1.3 Confirm the tests are red: `yarn vitest run tests/unit/frontend/useViewContext.test.ts` — all four test cases MUST fail (import resolves but `useViewContext` does not exist yet)

## 2. Green — Implement useViewContext and ViewContextResult

- [x] 2.1 In `app/frontend/context.ts`, add the exported `ViewContextResult` interface that extends `DContext` and adds `user: UserForFrontend | null`
- [x] 2.2 Add the exported `useViewContext()` function that: calls `useRouteLoaderData("root") as CommonData`, throws `new Error("lang not passed to ViewContext")` when `lang` is falsy, derives `{ baseLang, isDebug }` via `parseLanguageAndDebugFlag`, calls `globalThis.createTranslationGetter(baseLang)`, calls `createTranslator(translationGetter, baseLang, isDebug)`, and returns `{ t, lang, user, url: (path) => urlLang(lang, path) }`
- [x] 2.3 Replace the body of the `ViewContext` class constructor to delegate to `useViewContext()` and assign all fields (`t`, `lang`, `user`, `url` as a bound function); add `@deprecated Use useViewContext() instead` JSDoc to the class
- [x] 2.4 Confirm tests are green: `yarn vitest run tests/unit/frontend/useViewContext.test.ts`

## 3. Refactor

- [x] 3.1 Review `app/frontend/context.ts` for clarity: confirm no logic is duplicated between `useViewContext()` and the `ViewContext` shim; ensure the `url` field on `ViewContextResult` is typed as `(path: string) => string` consistent with `DContext.url`
- [x] 3.2 Confirm refactored tests still pass: `yarn vitest run tests/unit/frontend/useViewContext.test.ts`

## 4. Verification — 7 Quality Gates

- [x] 4.1 **Gate 1 — Tests green**: `yarn vitest run tests/unit/frontend/useViewContext.test.ts`
- [x] 4.2 **Gate 2 — TypeScript clean**: `yarn tsc` — zero errors
- [x] 4.3 **Gate 3 — Prettier clean**: `yarn format:check` (run `yarn format` if it fails, then recheck)
- [x] 4.4 **Gate 4 — Anti-pattern review**: manually check `.github/skills/anti-pattern-check/SKILL.md` — confirm no `any` types without justification, no hook called from outside a React function, no constructor-level hook violations introduced beyond the intentional shim
- [x] 4.5 **Gate 5 — SOLID review**: invoke the `solid-reviewer` agent on `app/frontend/context.ts` and `tests/unit/frontend/useViewContext.test.ts`
- [x] 4.6 **Gate 6 — Documentation review**: confirm comments in `context.ts` explain WHY (e.g. why the shim exists, why `globalThis.createTranslationGetter` is used) rather than WHAT
- [x] 4.7 **Gate 7 — Project conventions review**: verify against `.github/copilot-instructions.md` — new test is under `tests/` using Vitest, file is `*.test.ts`, no `node:test`, no `import "./setup"` (this is a pure unit test that does not need PGlite setup)

## 5. Archive and PR

- [x] 5.1 Run `/opsx:archive` on the `feature/ca-view-context-hook` branch to archive this change
- [x] 5.2 Raise a PR targeting `dev` with commit prefix `Refactor:` describing the hook introduction and the backward-compatible shim
