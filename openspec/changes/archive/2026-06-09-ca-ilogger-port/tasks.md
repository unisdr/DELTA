## 1. Write the failing test (Red)

- [x] 1.1 Create `tests/unit/shared/logging/ILogger.test.ts` with tests for all three
  capabilities: `ilogger-port` (structural type check via `NoOpLogger` assignment),
  `noop-logger` (all four methods callable, no throw, no output), and `logging-barrel`
  (named imports resolve at runtime). Tests MUST fail at this point because the
  implementation files do not exist yet.

  Run to confirm red: `yarn vitest run tests/unit/shared/logging/ILogger.test.ts`

## 2. Implement ILogger port (Green)

- [x] 2.1 Create `app/shared/logging/ILogger.ts` — export the `ILogger` interface with
  exactly four methods (`info`, `warn`, `error`, `debug`), each accepting
  `Record<string, unknown>` and returning `void`, as specified in ADR-004 and
  `specs/ilogger-port/spec.md`.

- [x] 2.2 Create `app/shared/logging/NoOpLogger.ts` — export the `NoOpLogger` class
  that `implements ILogger` with four empty method bodies, constructible with
  `new NoOpLogger()` and zero arguments, as specified in `specs/noop-logger/spec.md`.

- [x] 2.3 Create `app/shared/logging/index.ts` — barrel that uses explicit named exports
  (`export type { ILogger } from "./ILogger"` and `export { NoOpLogger } from "./NoOpLogger"`),
  following the pattern in `app/shared/errors/index.ts` and
  `specs/logging-barrel/spec.md`.

- [x] 2.4 Delete `app/shared/logging/.gitkeep` — the placeholder is no longer needed now
  that real files occupy the directory.

  Run to confirm green: `yarn vitest run tests/unit/shared/logging/ILogger.test.ts`

## 3. Quality gates (Refactor)

- [x] 3.1 **Gate 1 — Tests green**
  `yarn vitest run tests/unit/shared/logging/ILogger.test.ts`
  All tests must pass.

- [x] 3.2 **Gate 2 — TypeScript**
  `yarn tsc`
  Zero type errors. Confirm `NoOpLogger implements ILogger` is accepted and all barrel
  imports resolve.

- [x] 3.3 **Gate 3 — Prettier**
  `yarn format:check`
  If it reports formatting issues, run `yarn format` then re-check.

- [x] 3.4 **Gate 4 — Anti-pattern review**
  Read `.github/skills/anti-pattern-check/SKILL.md` and verify none of the listed
  anti-patterns are present in the three new files.

- [x] 3.5 **Gate 5 — SOLID review**
  Invoke the `solid-reviewer` agent on the three new files. Confirm Interface Segregation
  (ILogger is minimal and focused), Dependency Inversion (use cases will depend on the
  abstraction not the concrete logger), and Open/Closed (adding a `fatal` method later
  requires only an interface extension).

- [x] 3.6 **Gate 6 — Documentation review**
  Each file MUST have a JSDoc comment explaining WHY it exists (reference ADR-004), not
  just what it does. Method bodies need no inline comments — they are intentionally empty
  no-ops. Balance rule: do not over-document trivial code.

- [x] 3.7 **Gate 7 — Project conventions review**
  Read `.github/copilot-instructions.md` and confirm:
  - Files do not have `.server.ts` suffix (correct — no Node.js APIs used).
  - No `as any` casts anywhere.
  - No `console.log` in the implementation files.
  - Barrel uses named exports only, no `export *`.

- [x] 3.8 **Gate 8 — Code review**
  Run `.github/skills/code-review/SKILL.md` in full against the diff on this branch.
  Address every finding before proceeding.

## 4. Regression and archive

- [x] 4.1 **Full PGlite regression suite**
  `yarn test:run2`
  MUST pass with no new failures. If any test fails, verify it was already failing on
  `dev` before this change (run the suite on `dev` to establish the baseline). Do not
  label failures as pre-existing without this baseline confirmation.

- [x] 4.2 **Tick all checkboxes** — tick every item in this tasks.md (including this one)
  so the incomplete-task guard does not block the archive step.

- [x] 4.3 **Archive** — run `opsx:archive` on branch `feature/ca-ilogger-port` to finalise
  the OpenSpec change artifacts and mark the change complete.

- [x] 4.4 **Raise PR** — target `dev` with title:
  `Feature: ILogger port and NoOpLogger test double (ADR-004 Phase 2c)`
