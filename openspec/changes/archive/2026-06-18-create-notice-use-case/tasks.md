## 1. Red Phase — Write failing tests

- [x] 1.1 Create `app/domains/notices/application/use-cases/CreateNotice.test.ts` with
  all test cases from `specs/create-notice/spec.md`. Tests MUST fail at this point
  because neither `CreateNotice.ts` nor `NoticeDto.ts` exist yet.
  Covers: happy path (unpublished), happy path (published), logger info event,
  `ValidationError` propagation (empty titleJson, whitespace-only titleJson),
  repository error propagation, concurrent executions produce distinct IDs,
  `toNoticeDto` field mapping (published + unpublished).
  Mock strategy: typed inline object satisfying `INoticeRepository` with `vi.fn()` stubs;
  `NoOpLogger` from `app/shared/logging/NoOpLogger.ts`. Never use `as any`.
  Use `vi.useFakeTimers()` / `vi.setSystemTime()` where timestamp assertions are made.
  **Concurrent test note:** stub `save` with `vi.fn().mockResolvedValue(notice)` — a
  `Promise`-returning mock is required so both `execute()` calls are genuinely in-flight
  simultaneously. A synchronous stub would resolve before the second call starts and
  would not exercise shared-state isolation.
  Run: `yarn vitest run app/domains/notices/application/use-cases/CreateNotice.test.ts`
  — expect all tests to fail (Red).

## 2. Green Phase — Implement NoticeDto

- [x] 2.1 Create `app/domains/notices/application/dto/NoticeDto.ts`.
  Export `NoticeDto` interface (fields: `id`, `tenantId`, `titleJson`, `bodyJson`,
  `isPublished`, `publishedAt: string | null`, `audience`, `createdAt: string`,
  `updatedAt: string`).
  Export `toNoticeDto(notice: Notice): NoticeDto` pure mapper function.
  Import `LocaleMap` and `Audience` from `~/domains/notices/domain/Notice`.
  Import `Notice` from the same module.
  No `as any` casts.

## 3. Green Phase — Implement CreateNoticeUseCase

- [x] 3.1 Create `app/domains/notices/application/use-cases/CreateNotice.ts`.
  Export `CreateNoticeCommand` interface: `{ tenantId: string; titleJson: LocaleMap;
  bodyJson: LocaleMap | null; isPublished: boolean }`.
  Export `CreateNoticeUseCase` class with constructor accepting `(logger: ILogger,
  noticeRepository: INoticeRepository)`.
  Implement `async execute(command: CreateNoticeCommand): Promise<NoticeDto>`:
    - Generate `id` via `crypto.randomUUID()`.
    - Set `now = new Date()`. Set `createdAt = now`, `updatedAt = now`.
    - Set `publishedAt = command.isPublished ? now : null`.
    - Set `audience = "private"` (matches the DB column default; configurable audience is deferred).
    - Call `Notice.create({ id, tenantId: command.tenantId, titleJson: command.titleJson,
      bodyJson: command.bodyJson, isPublished: command.isPublished, audience,
      publishedAt, createdAt, updatedAt })` — let `ValidationError` propagate.
    - Call `const saved = await this.noticeRepository.save(notice)` — let errors propagate.
      Always use `saved` (the repository's return value) for all subsequent operations —
      never the pre-save `notice`. The repository may enrich the entity on write.
    - Call `this.logger.info({ msg: "notice.created", noticeId: saved.id })`.
    - Return `toNoticeDto(saved)`.
  No `as any` casts.
- [x] 3.2 Run `yarn vitest run app/domains/notices/application/use-cases/CreateNotice.test.ts`
  — all tests MUST pass (Green).

## 4. Refactor Phase

- [x] 4.1 Review `CreateNotice.ts` and `NoticeDto.ts` for clarity:
  - Comments explain WHY not WHAT (e.g. why `audience` defaults to `"all"`, why
    `publishedAt` is derived from `isPublished` rather than accepted from the command).
  - No duplication. No over-abstraction.
  - Imports use `~/` path alias consistently.
- [x] 4.2 Run `yarn vitest run app/domains/notices/application/use-cases/CreateNotice.test.ts`
  — tests remain Green after refactor.

## 5. Quality Gates

- [x] 5.1 Gate 1 — Tests green:
  `yarn vitest run app/domains/notices/application/use-cases/CreateNotice.test.ts`
- [x] 5.2 Gate 2 — TypeScript clean:
  `yarn tsc` — zero errors. Fix any type issues without using `as any`.
- [x] 5.3 Gate 3 — Prettier clean:
  `yarn format:check` — if it fails, run `yarn format` then re-check.
- [x] 5.4 Gate 4 — Anti-pattern review:
  Read `.github/skills/anti-pattern-check/SKILL.md` and verify no listed anti-patterns
  are present in `CreateNotice.ts`, `NoticeDto.ts`, or `CreateNotice.test.ts`.
- [x] 5.5 Gate 5 — SOLID review:
  Invoke the `solid-reviewer` agent on the three new files. Confirm SRP and DIP are
  respected. Address any violations before proceeding.
- [x] 5.6 Gate 6 — Documentation review:
  Verify all non-trivial decisions in `CreateNotice.ts` and `NoticeDto.ts` are explained
  with WHY comments. The `audience` default, `publishedAt` derivation, and
  `crypto.randomUUID()` usage each warrant a brief inline rationale.
- [x] 5.7 Gate 7 — Project conventions review:
  Read `.github/copilot-instructions.md`. Confirm: `~/` path aliases used, no `.server.ts`
  suffix needed (application layer, not server-only), no `as any`, Prettier tab width
  respected, no node:test imports.
- [x] 5.8 Gate 8 — Code review:
  Run `.github/skills/code-review/SKILL.md` in full on the three new files. Address
  all findings before archiving.

## 6. Regression

- [x] 6.1 Run the full PGlite suite:
  `yarn test:run2`
  Confirm no new failures were introduced. If any tests fail that were not failing
  before this change, investigate and fix before proceeding. Pre-existing failures
  must be confirmed as pre-existing by running the suite on the base branch first.

## 7. Archive and PR

- [X] 7.1 Run `/opsx:archive` on branch `feature/ca-create-notice-use-case` to mark
  this change complete and move artifacts to the archive.
- [X] 7.2 Raise a PR from `feature/ca-create-notice-use-case` targeting `dev`.
  PR title prefix: `Feature:`. Include a summary of the three new files and confirm
  all 8 quality gates passed.
