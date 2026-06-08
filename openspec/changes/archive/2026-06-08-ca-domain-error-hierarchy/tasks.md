## 1. Red — Write the failing unit test

- [x] 1.1 Create directory `tests/unit/shared/errors/` (it does not exist yet)
- [x] 1.2 Create `tests/unit/shared/errors/DomainError.test.ts` with failing tests for all five
       classes: `DomainError` (via a local test subclass), `NotFoundError`, `ValidationError`,
       `AuthorizationError`, `ConflictError`. Cover each scenario in
       `specs/domain-error-hierarchy/spec.md`: `code`, `statusHint`, `message`, `name`,
       `context` (present and absent), and `instanceof` chains.
       No setup import is needed — these are pure unit tests with no DB context.
- [x] 1.3 Verify the tests fail as expected (files to implement do not exist yet):
       `yarn vitest run tests/unit/shared/errors/DomainError.test.ts`
       Expected: import error or "cannot find module" for `~/shared/errors`.

## 2. Green — Implement the source files

- [x] 2.1 Delete `app/shared/errors/.gitkeep` (the scaffold placeholder — no longer needed)
- [x] 2.2 Create `app/shared/errors/DomainError.ts` with the abstract `DomainError` base class
       and the four concrete subclasses (`NotFoundError`, `ValidationError`,
       `AuthorizationError`, `ConflictError`) exactly as specified in ADR-003 and
       `specs/domain-error-hierarchy/spec.md`. No imports from Drizzle, React Router, Express,
       or any framework. The only dependency is the built-in `Error` global.
- [x] 2.3 Create `app/shared/errors/index.ts` as a barrel that re-exports all five classes from
       `./DomainError`.
- [x] 2.4 Run the unit test suite and confirm all tests pass:
       `yarn vitest run tests/unit/shared/errors/DomainError.test.ts`

## 3. Refactor

- [x] 3.1 Review `DomainError.ts` for clarity: constructor order, readonly modifier placement.
       Add a single JSDoc block on the `DomainError` base class only — explaining the
       operational-vs-programmer-error distinction and referencing ADR-003. Concrete subclass
       names are self-explanatory; do not add per-class JSDoc (project convention: comments
       only when WHY is non-obvious).
- [x] 3.2 Confirm no implementation detail has leaked into the spec: re-read
       `specs/domain-error-hierarchy/spec.md` and verify all scenarios remain satisfied after
       any refactoring.
- [x] 3.3 Re-run the test to confirm green after refactor:
       `yarn vitest run tests/unit/shared/errors/DomainError.test.ts`

## 4. Quality Gates

- [x] 4.1 Gate 1 — Tests green:
       `yarn vitest run tests/unit/shared/errors/DomainError.test.ts` — all pass, zero skipped
- [x] 4.2 Gate 2 — TypeScript clean:
       `yarn tsc` — zero errors. In particular verify that a class extending `DomainError`
       without `code` or `statusHint` would produce a compile error (per spec requirement
       "Abstract members enforced by TypeScript").
- [x] 4.3 Gate 3 — Prettier clean:
       `yarn format:check` — no formatting violations. Run `yarn format` to fix if needed,
       then re-check.
- [x] 4.4 Gate 4 — Anti-pattern review:
       Read `.github/skills/anti-pattern-check/SKILL.md` and confirm none of the listed
       anti-patterns appear in the two new files. Key checks: no `as any`, no `handleTransaction`
       sentinel pattern, no `authLoaderApiDocs`, no raw `console.log`.
- [x] 4.5 Gate 5 — SOLID review:
       Invoke the `solid-reviewer` agent on `app/shared/errors/DomainError.ts`. Confirm
       Single Responsibility (each class represents one error type), Open/Closed (new error
       types extend without modifying the base), Liskov Substitution (every subclass can be
       used where `DomainError` is expected), Interface Segregation (no fat interface forcing
       unwanted members), Dependency Inversion (domain layer depends on no external framework).
- [x] 4.6 Gate 6 — Documentation review:
       JSDoc on `DomainError` MUST explain the two-category error model (operational vs
       programmer errors, per ADR-003). Comments on concrete types MUST explain the semantic
       meaning of each error (WHY it exists) rather than restating the code. Verify no
       over-commented trivial lines.
- [x] 4.7 Gate 7 — Project conventions review:
       Cross-check `app/shared/errors/DomainError.ts` against `.github/copilot-instructions.md`:
       confirm file has no `.server.ts` suffix (correct — these are framework-agnostic),
       Prettier formatting applied (tabs, 80-char width, trailing commas), TypeScript strict
       mode satisfied (no implicit `any`, all properties typed).
- [x] 4.8 Gate 8 — Code review:
       Run `.github/skills/code-review/SKILL.md` in full on the two new files and the new test
       file. Address all findings before proceeding.

## 5. Regression

- [x] 5.1 Run the full PGlite test suite to confirm no pre-existing tests are broken:
       `yarn test:run2`
       All tests that passed before this change MUST still pass. If any failures appear, verify
       they are pre-existing by checking out the base branch and running the same suite.
       Do not archive until the suite is green or all failures are confirmed pre-existing.

## 6. Archive and PR

- [x] 6.1 Tick all checkboxes in this tasks.md (including this one) so the incomplete-task
       guard does not block the archive step.
- [x] 6.2 Run `/opsx:archive` on branch `feature/ca-domain-error-hierarchy` to finalise the
       OpenSpec change artifacts and mark the change complete.
- [x] 6.3 Raise a PR from `feature/ca-domain-error-hierarchy` targeting `dev` with title:
       `Feature: add shared DomainError hierarchy (ADR-003 Layer 1)`
