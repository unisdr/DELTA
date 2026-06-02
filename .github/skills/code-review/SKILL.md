---
name: code-review
description: "Pre-PR code review checklist for DELTA. Covers correctness, async/concurrency
  hazards, test scenario completeness, type safety, spec alignment, and documentation accuracy.
  Run as Gate 8 after all other quality gates pass. On Claude Code the built-in /code-review
  skill at high effort provides AI-powered diff analysis on top of this checklist."
---

# Code Review Checklist — DELTA Resilience

Run this checklist as the final gate before stopping and handing off to the user.
A finding means: classify it (see sdd-implementer Review comment resolution table),
fix or escalate, then re-check from this gate.

On Claude Code you may also invoke the built-in `code-review` platform skill at `high`
effort for AI-powered diff analysis. This checklist defines the minimum bar that applies
regardless of which AI tool is in use.

---

## Correctness

- [ ] All conditional branches are reachable and produce the correct result
- [ ] Null / `undefined` handling is explicit — no implicit coercions that mask bugs
- [ ] Return values match the declared return type at every `return` site
- [ ] Early returns do not accidentally skip cache writes, cleanup, or context updates
- [ ] Boolean conditions are not accidentally inverted (`!ctx` vs `ctx === undefined`)

---

## Async & Concurrency

- [ ] No race condition where two concurrent callers both observe "not yet initialised"
      state and both proceed to the expensive operation (DB query, network call, etc.)
- [ ] Shared mutable state is initialised before it can be observed by concurrent callers
- [ ] Any `async` function that populates shared state stores the in-flight `Promise`
      before `await`ing it, so concurrent callers await the same `Promise` instead of
      issuing duplicate operations
- [ ] No `await` inside a loop that could be parallelised with `Promise.all`
- [ ] `AsyncLocalStorage`: `als.run()` used, never `als.enterWith()`; store initialised
      with all required fields (not an empty object `{}`)

---

## Test Scenario Completeness

- [ ] Happy path, null/unauthenticated path, and no-context fallback are each tested
- [ ] **Concurrent callers scenario present** for any cache or shared async state —
      a `Promise.all([fn(), fn()])` assertion that the expensive operation runs exactly once
- [ ] Error / rejection paths are tested (what happens when the DB call throws?)
- [ ] Sequential-only tests are not the sole coverage for state observable by parallel callers

---

## Type Safety

- [ ] No `as any` or `as unknown as X` casts without a justification comment
- [ ] Non-null assertions (`!`) only where the value is provably non-null; comment explains why
- [ ] New exported types accurately reflect the full value space (no missing union members)
- [ ] Type-only imports (`import type`) used for types that must not appear in runtime bundles

---

## Spec & Design Alignment

- [ ] Every spec scenario has a corresponding test (happy path, null path, concurrent path)
- [ ] Implementation matches every decision named in `design.md` — no silent deviations
- [ ] No spec scenario left untested because it seemed obvious
- [ ] If implementation diverged from the spec, the spec has been updated to reflect reality

---

## Documentation Accuracy

- [ ] No "TBD" or placeholder text remains in any artifact (specs, design, proposal)
- [ ] `design.md` migration plan accurately reflects the actual test run state — does not
      claim `yarn test:run2` is fully green when pre-existing failures exist
- [ ] Code examples in proposal / design use the final type shapes, not draft shapes
- [ ] Inline comments explain WHY; none merely restate what the code already expresses

---

## Code Simplification

- [ ] No duplicate logic that could be extracted into a shared helper
- [ ] No unnecessary intermediate variables that add noise without adding clarity
- [ ] Functions do one thing — if a function has two distinct phases, consider splitting
- [ ] No dead code introduced (unreachable branches, unused parameters or variables)
