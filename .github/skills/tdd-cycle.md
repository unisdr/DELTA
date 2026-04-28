---
name: tdd-cycle
description: "TDD Red→Green→Refactor methodology for the DELTA project. Reference this when
  writing tests before implementation or reviewing whether TDD discipline was followed."
---

# TDD Cycle — DELTA Resilience

The TDD cycle has three phases. Each phase has a strict exit condition. Never skip or merge phases.

---

## Phase 1 — Red (Write failing tests)

**Goal:** Describe the expected behaviour as tests before any implementation exists.

**Two types of tests — different rules apply to each:**

### Behaviour tests (from a spec scenario)
One test per Given/When/Then scenario from the OpenSpec `specs/` artifacts.
Each test maps to exactly one observable outcome. Do not combine multiple scenarios into one test.

Examples:
- `"throws when record does not exist"`
- `"returns null when countryAccountsId does not match"`

### Unit tests (input/output contract of a function)
Write **as many cases as there are meaningful input variations** — do not limit to one.
Cover: typical valid inputs, boundary values (null, empty, zero, max), invalid inputs that
should be rejected, and domain-specific edge cases. More cases = more confidence.

Examples:
- `"returns empty string when input is null"`
- `"strips HTML tags from input"`
- `"preserves apostrophes in input"` (edge case)
- `"handles input with only whitespace"`

**Steps (both types):**
1. Read the spec or function signature to understand the contract.
2. Identify the public interface being tested.
3. Write tests that call that interface and assert expected outcomes.
4. Run: `yarn vitest run tests/path/to/file.test.ts`
5. Confirm each test **fails for the right reason** — the behaviour does not yet exist, not a
   setup error or import problem.

**Exit condition:** Tests exist, run, and fail specifically because the feature/fix is not yet implemented.

**DELTA tooling:**
```bash
yarn vitest run tests/path/to/file.test.ts   # run a single file
yarn vitest run -t "test name pattern"       # run by name
```

---

## Phase 2 — Green (Make the test pass)

**Goal:** Write the minimum code to make the failing test pass. Nothing more.

**Steps:**
1. Implement only what the test requires.
2. Do not add logic not covered by the current test.
3. Run the test again: must now pass.
4. Run the full suite to confirm nothing broke: `yarn test:run2`

**Exit condition:** The new test passes. The full PGlite suite passes. No TypeScript errors (`yarn tsc`).

**Common mistakes:**
- Writing more code than the test requires (premature generalisation)
- Making the test pass by special-casing the test input (test gaming)

---

## Phase 3 — Refactor (Improve the code without changing behaviour)

**Goal:** Make the code good without breaking the tests.

**Steps:**
1. Identify code smells: duplication, unclear names, large functions, mixed concerns.
2. Refactor one concern at a time.
3. After each refactor step, re-run tests to confirm still green.
4. Check against the quality gates:
   - `yarn tsc` — clean
   - `yarn format:check` — clean
   - Anti-pattern review (see `.github/skills/anti-pattern-check.md`)
   - SOLID principles (invoke `solid-reviewer` agent)
   - Project conventions (see `.github/copilot-instructions.md`)

**Exit condition:** All quality gates pass. Tests still green. Code reads clearly to a developer
unfamiliar with the change.

**Loop:** If refactoring reveals a new concern that needs a test, go back to Red. The cycle is
iterative, not linear.

---

## DELTA-specific notes

- **Test location:** `tests/unit/` or `tests/integration/` — never `app/` or node:test files
- **PGlite:** For tests needing a DB, use `tests/integration/db/setup.ts` — no external DB needed
- **Context:** Use `createTestBackendContext()` for constructing `BackendContext` in tests
- **Async errors:** Assert with `expect(fn()).rejects.toThrow(...)` — not try/catch
- **Multi-tenancy in tests:** Always provide a `countryAccountsId` in test fixtures — never omit it
- **Behaviour tests:** One `it(...)` per spec scenario — do not combine scenarios
- **Unit tests:** As many `it(...)` cases as there are meaningful input variations — cover edge cases
