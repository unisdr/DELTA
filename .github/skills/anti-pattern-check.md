---
name: anti-pattern-check
description: "Quality gate checklist of known anti-patterns and code standards for DELTA.
  Reference during code review, the Refactor phase of TDD, or when implementing any change.
  Covers project-specific known bugs, DELTA conventions, and general code quality rules."
---

# Anti-Pattern Check — DELTA Resilience

Run this checklist during the Refactor phase of TDD and before any PR is raised.
A finding means: stop, fix, re-run tests, re-check.

---

## P0 Known Anti-Patterns — Never Reproduce

These are confirmed bugs in the codebase. Do not copy these patterns, extend these functions,
or use them as implementation templates.

| ID | Anti-Pattern | Where it exists | Rule |
|----|---|---|---|
| AP-P0-2 | Missing `await` on Drizzle delete/insert/update | `common.ts deleteById` | Every Drizzle mutation MUST be awaited |
| AP-P0-7 | Swallowing errors from sub-calls | `human_effects.ts deleteAllData` | Errors from called functions MUST be propagated or rethrown |
| AP-P0-9 | Sentinel string for control flow | `common.ts handleTransaction` | Use typed `Error` subclasses, never magic strings |
| AP-P0-10 | Type export in wrong schema file | `hipHazardTable.ts` (fixed) | Export `$inferSelect`/`$inferInsert` only from the file that defines the table |
| AP-P0-12 | Logging env var values at startup | `env.ts` (fixed) | Never log env var values; log var names only if needed |
| AP-P0-14 | Stripping meaningful characters from input | `security.ts sanitizeInput` | Never remove apostrophes, diacritics, or other valid user text |

---

## Auth & Security Checks

- [ ] Every loader uses `authLoaderWithPerm` or `authLoaderApi` — **never `authLoaderApiDocs`**
      (P1-22: `authLoaderApiDocs` skips the tenant check on API key auth path)
- [ ] Every action uses `authActionWithPerm` or `authActionApi`
- [ ] No user input used in raw SQL strings (use Drizzle parameterised queries always)
- [ ] No secrets or env var values logged (names only if necessary)

---

## Multi-Tenancy Checks

- [ ] Every query that touches tenant data filters by `countryAccountsId`
- [ ] No cross-tenant data access — a user's `countryAccountsId` must match the record's
- [ ] `countryAccountsId` is always sourced from the authenticated session, never from user input

---

## Database Checks

- [ ] Every Drizzle mutation (`insert`, `update`, `delete`) is `await`ed
- [ ] No `drizzle-kit push` — migrations run via `yarn dbsync` (drizzle-kit migrate) only
- [ ] New columns also updated in `tests/integration/db/testSchema/` (until P1-42 resolved)
- [ ] Primary keys use `ourRandomUUID()`, foreign key references use `uuid` type
- [ ] `SelectX` and `InsertX` types exported from the file that defines the table, nowhere else

---

## Error Handling Checks

- [ ] No swallowed errors — every `catch` either rethrows, wraps in a domain error, or returns
      a typed error result; never silently discards
- [ ] No sentinel strings for control flow — use `class DomainError extends Error {}`
- [ ] Async functions that can fail return a typed result or throw; never return `undefined` on error

---

## Code Quality Checks

- [ ] No `any` types without an explicit justification comment
- [ ] No non-null assertions (`!`) without justification
- [ ] Functions do one thing (Single Responsibility) — if it needs a paragraph to describe, split it
- [ ] No magic numbers or magic strings — name constants
- [ ] `yarn tsc` passes with zero errors
- [ ] `yarn format:check` passes (Prettier: tabs, 80-char width, trailing commas)

---

## Test Quality Checks

- [ ] New tests are under `tests/` using Vitest — not `app/backend.server/*_test.ts` (orphaned)
- [ ] Tests cover both happy path and failure paths
- [ ] Each test describes one behaviour (`it("throws when row does not exist", ...)`)
- [ ] No tests that pass immediately without an implementation (not a real Red-phase test)
- [ ] PGlite used for DB tests where possible — no mocking the database unless unavoidable

---

## DELTA-Specific Convention Checks

- [ ] New server-only files use `.server.ts(x)` suffix
- [ ] Internal links use `LangLink`, not `<a href>`
- [ ] New user-facing strings use `ctx.t({ code, msg })` and `yarn i18n:extractor` has been run
- [ ] New env vars added to `example.env` with a descriptive comment
- [ ] Branch targets `dev`, not `main`
