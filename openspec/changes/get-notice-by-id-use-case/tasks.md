## 1. Red — Write failing tests

- [x] 1.1 Create `app/domains/notices/application/use-cases/GetNoticeById.test.ts` with
  a mock `INoticeRepository` and `ILogger`. Do NOT import `GetNoticeById.ts` yet —
  the file does not exist; the import will fail, giving the required Red state.
  Verify: `yarn vitest run app/domains/notices/application/use-cases/GetNoticeById.test.ts`
  exits non-zero (compilation error is an acceptable Red state before the source exists).

- [x] 1.2 Write test: **happy path** — `findById` resolves with a notice whose `tenantId`
  matches `query.tenantId`; assert the returned DTO equals `toNoticeDto(notice)` and
  `logger.info` was called with `{ msg: "notice.fetched", noticeId: notice.id, tenantId: notice.tenantId }`.

- [x] 1.3 Write test: **not found** — `findById` throws `NotFoundError`; assert the use
  case throws `NoticeNotFoundError` (which is `instanceof NotFoundError`) and `logger.info`
  is not called.

- [x] 1.4 Write test: **tenant isolation** — `findById` resolves with a notice whose
  `tenantId` is `"t2"` but `query.tenantId` is `"t1"`; assert the use case throws
  `NoticeNotFoundError` and `logger.info` is not called.

- [x] 1.5 Write test: **error propagation** — `findById` rejects with a plain
  `Error("DB unavailable")`; assert the same error instance propagates and `logger.info`
  is not called.

- [x] 1.6 Write test: **concurrent calls** — call `execute` twice concurrently with
  different IDs; assert each resolves with the correct DTO and `findById` is called
  exactly twice and `logger.info` is called exactly twice.

## 2. Green — Implement the use case

- [x] 2.1 Create `app/domains/notices/application/use-cases/GetNoticeById.ts`.
  Export `GetNoticeByIdQuery`, `NoticeNotFoundError`, and `GetNoticeByIdUseCase`.
  `NoticeNotFoundError` extends `NotFoundError` with `constructor(id: string)` that
  delegates to `super("Notice", id)`.

- [x] 2.2 Implement `GetNoticeByIdUseCase.execute`:
  - Call `this.noticeRepository.findById(query.id, query.tenantId)`.
  - Catch `NotFoundError` (exact class, not a generic catch) and re-throw
    `new NoticeNotFoundError(query.id)`.
  - After a successful resolve, if `notice.tenantId !== query.tenantId`, throw
    `new NoticeNotFoundError(query.id)` (defence-in-depth tenant check).
  - Call `this.logger.info({ msg: "notice.fetched", noticeId: notice.id, tenantId: notice.tenantId })`.
  - Return `toNoticeDto(notice)`.

- [x] 2.3 Run `yarn vitest run app/domains/notices/application/use-cases/GetNoticeById.test.ts`
  and confirm all tests pass (Green).

## 3. Refactor — Quality gates

- [x] 3.1 **Gate 1 — Tests green**: `yarn vitest run app/domains/notices/application/use-cases/GetNoticeById.test.ts`
  MUST exit zero with all tests passing.

- [x] 3.2 **Gate 2 — TypeScript**: `yarn tsc` MUST exit zero with no errors.

- [x] 3.3 **Gate 3 — Prettier**: `yarn format:check` MUST exit clean. Run `yarn format`
  to fix any formatting issues, then re-run `yarn format:check`.

- [x] 3.4 **Gate 4 — Anti-pattern review**: Check `.github/skills/anti-pattern-check/SKILL.md`
  and confirm the implementation does not reproduce any listed anti-pattern. Key items to
  verify: no `as any` casts, no bare `catch (e)` that swallows unknowns, no ambient
  tenant context, WHY comments on non-obvious decisions.

- [x] 3.5 **Gate 5 — SOLID review**: Invoke `solid-reviewer` agent on the two new files
  (`GetNoticeById.ts`, `GetNoticeById.test.ts`). Address any SRP or DIP violations
  before proceeding.

- [x] 3.6 **Gate 6 — Documentation review**: Confirm all comments explain WHY, not WHAT.
  Specifically verify: (a) the JSDoc on `GetNoticeByIdQuery` explains why `locale` is
  absent; (b) the JSDoc on `GetNoticeByIdUseCase` references the tenant defence-in-depth
  check; (c) the catch block explains why `NotFoundError` is re-thrown as
  `NoticeNotFoundError` rather than propagated.

- [x] 3.7 **Gate 7 — Project conventions**: Check `.github/copilot-instructions.md`
  and confirm the implementation follows all applicable conventions (import order,
  interface-based injection, no concrete adapter imports in the use case, etc.).

- [x] 3.8 **Gate 8 — Code review**: Run `.github/skills/code-review/SKILL.md` in full
  over the two new files. Address any findings before proceeding.

## 4. Regression and archive

- [x] 4.1 **Regression**: Run `yarn test:run2` (full PGlite suite). MUST pass with no
  new failures. If any test fails, confirm it was failing on `dev` before this change
  (run the suite on `dev` to establish a baseline) — do not label it pre-existing
  without verification.

- [ ] 4.2 **Archive**: On the same branch, run `/opsx:archive` to archive this change
  before raising the PR.

- [ ] 4.3 **PR**: Raise a PR targeting `dev` with prefix `Feature:`. Include a brief
  summary of the two new files and the spec scenarios covered.
