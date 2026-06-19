## 1. Red Phase — Write Failing Tests

- [x] 1.1 Create `app/domains/notices/application/use-cases/ListNotices.test.ts` with
      `describe("ListNoticesUseCase")` block; import `ListNoticesUseCase` and
      `ListNoticesQuery` from `./ListNotices` (file does not exist yet — tests MUST fail
      to compile/run at this stage). Add a `makeRepository()` helper following the pattern
      in `CreateNotice.test.ts` (all four methods stubbed; `findAll` returns `Promise.resolve([])`
      by default).

- [x] 1.2 Write test: "returns a NoticeDto[] for each Notice returned by the repository" —
      mock `findAll` to resolve with two `Notice` instances built via `Notice.create()`;
      assert the returned array length is 2, each item has the correct `id`, `tenantId`,
      and `titleJson`, and `createdAt` is an ISO 8601 string.

- [x] 1.3 Write test: "returns an empty array when the repository returns no notices" —
      `findAll` resolves with `[]`; assert result is `[]` and no error is thrown.

- [x] 1.4 Write test: "passes tenantId and pagination to findAll exactly once" —
      call `execute({ tenantId: "t1", page: 2, pageSize: 10 })`; assert
      `findAll` was called once with `("t1", { page: 2, pageSize: 10 })`.

- [x] 1.5 Write test: "preserves full LocaleMap in each NoticeDto (does not strip locale keys)" —
      build a `Notice` with `titleJson: { en: "Title", fr: "Titre" }` and call
      `execute({ tenantId: "t1", page: 1, pageSize: 10 })`; assert `dto.titleJson` equals
      `{ en: "Title", fr: "Titre" }` (both keys present).

- [x] 1.6 Write test: "preserves a single-locale LocaleMap unchanged" —
      build a `Notice` with `titleJson: { en: "English Only" }` and call
      `execute({ tenantId: "t1", page: 1, pageSize: 10 })`; assert resolve (not reject) and
      `dto.titleJson` equals `{ en: "English Only" }`.

- [x] 1.7 Write test: "emits logger.info with msg, tenantId, and count on success" —
      spy on `logger.info`; call `execute` with two notices in the repo; assert
      `logger.info` called once with `{ msg: "notices.listed", tenantId: "t1", count: 2 }`.

- [x] 1.8 Write test: "emits logger.info with count: 0 for empty result" —
      `findAll` returns `[]`; assert `logger.info` called once with
      `{ msg: "notices.listed", tenantId: "t1", count: 0 }`.

- [x] 1.9 Write test: "propagates repository errors unmodified" —
      `findAll` rejects with `new Error("DB connection lost")`; assert `execute()` rejects
      with the same error instance and `logger.info` is NOT called.

- [x] 1.10 Write test: "two concurrent executions are independent" —
       call `execute({ tenantId: "tenant-A", page: 1, pageSize: 10 })` and
       `execute({ tenantId: "tenant-B", page: 1, pageSize: 10 })` simultaneously via
       `Promise.all`; assert `findAll` called twice total; result[0] contains only
       tenant-A notices, result[1] contains only tenant-B notices.

- [x] 1.11 Verify all tests fail (import error or test failure) by running:
       `yarn vitest run app/domains/notices/application/use-cases/ListNotices.test.ts`

## 2. Green Phase — Implement ListNoticesUseCase

- [x] 2.1 Create `app/domains/notices/application/use-cases/ListNotices.ts`. Export
      `ListNoticesQuery` interface: `{ tenantId: string; page: number; pageSize: number }`.

- [x] 2.2 Export `ListNoticesUseCase` class with constructor
      `(private readonly logger: ILogger, private readonly noticeRepository: INoticeRepository)`.
      Import `ILogger` from `~/shared/logging/ILogger`, `INoticeRepository` from
      `~/domains/notices/application/ports/INoticeRepository`,
      `NoticeDto` and `toNoticeDto` from `~/domains/notices/application/dto/NoticeDto`,
      `Pagination` from `~/shared/types`.

- [x] 2.3 Implement `async execute(query: ListNoticesQuery): Promise<NoticeDto[]>`:
      1. Build `pagination: Pagination = { page: query.page, pageSize: query.pageSize }`.
      2. Call `const notices = await this.noticeRepository.findAll(query.tenantId, pagination)`.
      3. Map: `const dtos = notices.map(toNoticeDto)`.
      4. Call `this.logger.info({ msg: "notices.listed", tenantId: query.tenantId, count: dtos.length })`.
      5. Return `dtos`.
      Do NOT add a try/catch — let errors propagate unmodified per the spec.

- [x] 2.4 Run tests green:
       `yarn vitest run app/domains/notices/application/use-cases/ListNotices.test.ts`
       All tests MUST pass before proceeding.

## 3. Refactor Phase

- [x] 3.1 Review JSDoc on `ListNoticesQuery`: confirm `locale` carries a WHY comment
      explaining it is forwarded to the logger for observability and future locale-aware
      filtering, and explicitly states it does NOT drive DTO transformation.

- [x] 3.2 Review JSDoc on `ListNoticesUseCase`: confirm the class-level comment names
      the port interface it depends on, the mapper it reuses (`toNoticeDto`), and
      the empty-array contract.

- [x] 3.3 Review `execute()`: confirm no `as any` casts are present anywhere in the file.
      TypeScript strict mode MUST pass cleanly.

- [x] 3.4 Run tests still green after refactor:
       `yarn vitest run app/domains/notices/application/use-cases/ListNotices.test.ts`

## 4. Quality Gates

- [x] 4.1 Gate 1 — Tests green:
       `yarn vitest run app/domains/notices/application/use-cases/ListNotices.test.ts`

- [x] 4.2 Gate 2 — Zero TypeScript errors:
       `yarn tsc`

- [x] 4.3 Gate 3 — Prettier clean:
       `yarn format:check`
       (Run `yarn format` to fix, then re-check.)

- [x] 4.4 Gate 4 — Anti-pattern review:
       Read `.github/skills/anti-pattern-check/SKILL.md` and confirm no listed anti-pattern
       appears in `ListNotices.ts` or `ListNotices.test.ts`.
       Specifically verify: no `as any`, no cross-tenant query, no missing `tenantId` argument,
       no `*_test.ts` naming.

- [x] 4.5 Gate 5 — SOLID review:
       Invoke the `solid-reviewer` agent on `ListNotices.ts`. Confirm SRP (use case does
       one thing: orchestrate port + mapper + logger) and DIP (depends on `INoticeRepository`
       and `ILogger` interfaces, not concrete classes) are satisfied.

- [x] 4.6 Gate 6 — Documentation review:
       Verify every JSDoc comment in `ListNotices.ts` explains WHY, not WHAT.
       The class comment, `ListNoticesQuery.locale`, and the `execute()` return-empty-array
       contract MUST each have a WHY rationale.

- [x] 4.7 Gate 7 — Project conventions review:
       Read `.github/copilot-instructions.md` and confirm:
       - File is under `app/domains/notices/application/use-cases/` (correct layer).
       - No server-only suffix needed (use case is framework-agnostic).
       - No i18n extractor run needed (no `ctx.t()` calls).
       - No env var changes.

- [x] 4.8 Gate 8 — Code review:
       Run the `code-review` skill in full on the diff of `ListNotices.ts` and
       `ListNotices.test.ts`. Resolve all findings before proceeding.

## 5. Regression and Archive

- [x] 5.1 Regression — Full PGlite suite:
       `yarn test:run2`
       MUST pass with no new failures. If failures appear, confirm they are pre-existing
       by running on the base branch (`dev`) first and comparing. Do NOT label a failure
       pre-existing without this baseline check.

- [x] 5.2 Archive — Run `opsx:archive` on branch `feature/ca-list-notices-use-case`
       before raising the PR. Confirm all tasks above are ticked before invoking archive.

- [x] 5.3 Raise PR targeting `dev` with prefix `Feature:` and link the OpenSpec change.
