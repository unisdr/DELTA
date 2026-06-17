## 1. Shared Pagination type (new)

- [x] 1.1 Create `app/shared/types/Pagination.ts` — export `interface Pagination { page: number; pageSize: number; }` with a JSDoc comment explaining WHY it lives in shared (multiple domain ports will reference it)
- [x] 1.2 Create `app/shared/types/index.ts` — barrel re-export of `Pagination` so consumers import from `~/shared/types`
- [x] 1.3 Run `yarn tsc` to verify `app/shared/types/` compiles clean

## 2. Red — failing unit tests for Notice.create()

- [x] 2.1 Create `app/domains/notices/domain/Notice.test.ts` with Vitest imports only (no PGlite setup, no `import "./setup"`) — write failing tests covering:
  - Happy path: valid `titleJson` with one locale, `isPublished=false`, `publishedAt=null` → returns `Notice` instance
  - Happy path: multiple locales in `titleJson` → returns without throwing
  - Happy path: `isPublished=true` with non-null `publishedAt` → returns without throwing
  - Failure: empty `titleJson` (`{}`) → throws `ValidationError` with message referencing `titleJson`
  - Failure: `titleJson` with only whitespace values (`{ en: "   ", fr: "" }`) → throws `ValidationError`
  - Failure: `publishedAt` non-null when `isPublished=false` → throws `ValidationError` with message referencing `publishedAt`/`isPublished`
  - Shared state: call `Notice.create(validProps)` twice sequentially and assert both return independent instances with no shared reference (proves no module-level mutable state — `create()` is synchronous, so sequential calls are sufficient)
  - Shared state: call `Notice.create(invalidProps)` twice sequentially and assert each throws its own independent `ValidationError`
- [x] 2.2 Verify all tests fail at this point (no `Notice.ts` implementation yet):
  ```
  yarn vitest run app/domains/notices/domain/Notice.test.ts
  ```

## 3. Green — implement Notice domain entity

- [x] 3.1 Create `app/domains/notices/domain/Notice.ts`:
  - Export `LocaleMap = Record<string, string>`
  - Export `Audience = "public" | "private" | "all"`
  - Export `interface NoticeProps` with fields: `id: string`, `tenantId: string`, `titleJson: LocaleMap`, `bodyJson: LocaleMap | null`, `isPublished: boolean`, `audience: Audience`, `publishedAt: Date | null`, `createdAt: Date`, `updatedAt: Date`
  - Export `class Notice` with `private constructor(private readonly props: NoticeProps)`
  - Add `static create(props: NoticeProps): Notice` factory that:
    1. Validates `titleJson` has at least one key with a non-empty trimmed value — throws `ValidationError` with message `"titleJson must have at least one non-empty locale entry"` on failure
    2. Validates `publishedAt === null` when `isPublished === false` — throws `ValidationError` with message `"publishedAt must be null when isPublished is false"` on failure
    3. Returns `new Notice(props)` if both checks pass
  - Expose all `NoticeProps` fields as `get` accessors returning `this.props.<field>`
  - Import only from `app/shared/errors/` — zero Drizzle, Remix, or framework imports
- [x] 3.2 Run tests to confirm all pass (Green):
  ```
  yarn vitest run app/domains/notices/domain/Notice.test.ts
  ```

## 4. Green — implement INoticeRepository port

- [x] 4.1 Create `app/domains/notices/application/ports/INoticeRepository.ts`:
  - Import `type { Notice } from "../../domain/Notice"` (relative — within the same domain)
  - Import `type { Pagination } from "~/shared/types"` (alias — crossing into shared layer)
  - Export `interface INoticeRepository` with exactly four methods:
    - `findById(id: string, tenantId: string): Promise<Notice>`
    - `findAll(tenantId: string, pagination: Pagination): Promise<Notice[]>`
    - `save(notice: Notice): Promise<Notice>`
    - `delete(id: string, tenantId: string): Promise<void>`
  - No implementation — interface only; zero framework imports
- [x] 4.2 Run `yarn tsc` to confirm zero type errors (TypeScript compilation is the test for this interface):
  ```
  yarn tsc
  ```

## 5. Refactor

- [x] 5.1 Review `Notice.ts` — confirm all `get` accessors are present for every `NoticeProps` field; confirm JSDoc comments explain WHY (business rule) not WHAT (code description)
- [x] 5.2 Review `INoticeRepository.ts` — confirm JSDoc on each method states the multi-tenancy contract (every method that reads/writes MUST receive `tenantId`)
- [x] 5.3 Review `Pagination.ts` — confirm JSDoc explains WHY it lives in `app/shared/types/` and that `page` is 1-based
- [x] 5.4 Run full test file one final time to confirm still green after refactor:
  ```
  yarn vitest run app/domains/notices/domain/Notice.test.ts
  ```

## 6. Quality gates

- [x] 6.1 **Gate 1 — Tests green**: `yarn vitest run app/domains/notices/domain/Notice.test.ts` passes with zero failures
- [x] 6.2 **Gate 2 — TypeScript**: `yarn tsc` exits with code 0, zero errors
- [x] 6.3 **Gate 3 — Prettier**: `yarn format:check` is clean; run `yarn format` if not
- [x] 6.4 **Gate 4 — Anti-pattern review**: read `.github/skills/anti-pattern-check/SKILL.md` and confirm none of the listed anti-patterns are present in the new files (`Notice.ts`, `INoticeRepository.ts`, `Pagination.ts`)
- [x] 6.5 **Gate 5 — SOLID review**: invoke the `solid-reviewer` agent on the three new source files; resolve any SRP or DIP violations before proceeding
- [x] 6.6 **Gate 6 — Documentation review**: confirm all comments in the new files explain WHY not WHAT; no comment merely restates the code
- [x] 6.7 **Gate 7 — Project conventions review**: read `.github/copilot-instructions.md` and confirm the new files follow: strict TypeScript, no `as any`, no framework imports in domain layer, `tenantId` scoping on port methods
- [x] 6.8 **Gate 8 — Code review**: run `.github/skills/code-review/SKILL.md` in full on the diff; resolve any findings before proceeding

## 7. Regression

- [x] 7.1 Run the full PGlite suite to confirm no pre-existing tests are broken by this change:
  ```
  yarn test:run2
  ```
  All failures MUST be confirmed as pre-existing (run on base branch first if any fail).

## 8. Archive and PR

- [x] 8.1 Tick every checkbox in this file (including this one) before archiving
- [x] 8.2 Run `/opsx:archive` on the `notice-entity-and-port` change to archive the change
- [x] 8.3 Raise a PR targeting `dev` with title `Feature: Notices domain entity and INoticeRepository port (Phase 4b+4c)`
