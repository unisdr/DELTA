# DELTA Resilience — Refactoring Proposal

## Pragmatic DDD · Clean Architecture · Strangler Fig · AI-Assisted SDLC

**Version:** 2.0 — Updated after full audit cross-analysis
**Date:** April 2026
**Status:** Pending Team Review for sprint planning
**Timeline:** 7–9 months (6 phases)
**Team:** 1–2 developers + AI agent layer
**Production:** Live country instances — zero-downtime required throughout

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Audit Cross-Analysis — What Was Found](#2-audit-cross-analysis--what-was-found)
3. [Anti-Pattern & Bug Catalogue](#3-anti-pattern--bug-catalogue)
4. [AI-Assisted SDLC — The Full Methodology](#4-ai-assisted-sdlc--the-full-methodology)
5. [Target Architecture — Pragmatic DDD](#5-target-architecture--pragmatic-ddd)
6. [The Strangler Fig in Practice](#6-the-strangler-fig-in-practice)
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [Risk Register](#8-risk-register)
9. [Definition of Done](#9-definition-of-done)
10. [Appendix — OpenSpec Template](#10-appendix--openspec-template)

---

## 1. Executive Summary

DELTA Resilience is a multi-tenant disaster tracking platform underpinning nationally-owned disaster loss systems for governments worldwide. It is open-source, DPG-targeted, and currently at v0.2.0 with live production country instances. Refactoring it must respect one non-negotiable constraint: no working feature breaks on any live instance at any point in the process.

The combined findings from independent analysis and the internal 13-layer audit reveal three categories of problem that must be addressed in strict order:

**Category A — Live bugs and security issues** that cause data corruption, credential leaks, and cross-tenant data exposure today. These are not architectural debt — they are bugs in production. They take precedence over everything.

**Category B — Structural rot** that makes the system fragile, expensive to change, and hostile to open-source contribution. Four parallel data access layers, broken transaction boundaries, an 1,805-line god file, scattered business logic, no CI/CD, and tests that don't run in the pipeline. These are the cost-of-change problems.

**Category C — Architectural gaps** that limit scalability, tenant isolation at the database layer, and long-term maintainability. Correct domain module boundaries, RLS-enforced tenant isolation, schema normalisation, and a clean service architecture.

The refactoring strategy is:

- **Strangler Fig** — never a big-bang rewrite; each step is independently deployable
- **Pragmatic DDD** — bounded context folders, service layer, TenantContext, and cohesive domain logic; skip ceremony that doesn't deliver value at this team size
- **AI-Assisted SDLC** — agents handle specification generation, test writing, mechanical migration, and code review; humans define domain rules, approve specs, and gate every merge

**Realistic timeline: 7–9 months.** A 3–6 month window covers through Phase 2 (security hardening). The full DDD module restructuring is Phase 5 work, which is the correct sequencing — not a compromise.

---

## 2. Audit Cross-Analysis — What Was Found

The internal audit identified 123 items across 13 system layers. The following is a synthesis of the most consequential findings and how they affect the refactoring plan.

### 2.1 Security Issues in Production

These are live vulnerabilities, not design debt:

| Finding                                          | Severity | File                                      | Impact                                 |
| ------------------------------------------------ | -------- | ----------------------------------------- | -------------------------------------- |
| `env.ts` logs all secrets to stdout on startup   | Critical | `app/utils/env.ts`                        | Credentials in every application log   |
| `rejectUnauthorized: false` in SMTP              | Critical | `app/utils/email.ts`                      | TLS cert verification disabled in prod |
| `sanitizeInput` strips apostrophes               | High     | `app/utils/security.ts`                   | Corrupts names like O'Neill, D'Angelo  |
| `revokeUserApiAccess` sets `emailVerified=false` | High     | `app/backend.server/models/api_key.ts`    | Locks users out of their account       |
| Cross-tenant leak in spatial endpoints           | High     | `routes/.../spatial-footprint-geojson.ts` | GeoJSON served without tenant filter   |
| `mcp.ts` GET/SSE path unprotected                | High     | `app/routes/.../mcp.ts`                   | Public endpoint with no auth           |
| Session cookie parsed 8+ times per request       | Medium   | Multiple                                  | Session fixation amplification surface |

### 2.2 Data Integrity Issues

| Finding                                                                                                  | Impact                                                  |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `deleteById` missing `await` — is a no-op                                                                | Records appear deleted in UI but remain in DB           |
| `deleteAllData` silently swallows errors                                                                 | Cascade deletes fail silently                           |
| Broken FK CASCADE chain throughout event hierarchy                                                       | Orphaned records accumulate in production               |
| `damages`, `losses`, `disruption` have no `country_accounts_id`                                          | Tenant isolation gap at DB level for all financial data |
| `humanDsgConfigTable` has no primary key                                                                 | Duplicate rows possible, no stable reference            |
| Transaction boundary violation: `deleteAllDataByDisasterRecordId` calls `dr` directly inside transaction | Partial deletes under concurrent load                   |

### 2.3 Performance Issues

| Finding                                                               | Severity |
| --------------------------------------------------------------------- | -------- |
| N+1 in cost calculator: 30+ DB queries per disaster event list render | High     |
| Root loader: 8 sequential `await` calls (not parallelised)            | High     |
| Geographic filter uses full table scan, not recursive CTE             | High     |
| 133KB full translation dictionary injected on every page              | Medium   |
| Session `lastActiveAt` written on every single request                | Medium   |
| N+1 in email validator notification loop                              | Medium   |

### 2.4 Structural Issues

The audit confirms the structural findings as below:

- **Four parallel data access layers** with no enforcement rule: fat models, thin db/queries repositories, handler-embedded Drizzle, and partial utils. Any DDD restructuring today creates a fifth layer.
- **No CI/CD pipeline** — no `.github/` directory exists. Every merge is on the honour system.
- **Two migration systems** coexisting: Drizzle ORM and raw SQL scripts. They are not coordinated.
- **Test framework split**: model tests use `node:test`, not discovered by Vitest — silently excluded from CI.
- **UI mid-migration**: 35–40% migrated to PrimeReact; `ViewContext` class calls React hooks in a constructor (Rules of Hooks violation).
- **DPG compliance at 72%**: documentation gaps (missing `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `NOTICE`, `LICENSE` placeholder) block registry inclusion.

### 2.5 What This Means for the DDD Sequencing

Full DDD module restructuring requires a stable foundation. Right now:

- The data access layer has four competing patterns — introducing a fifth (repository interfaces) makes it worse
- The schema has broken CASCADE chains and missing tenant columns — aggregate boundaries are phantom integrity
- There is no CI/CD — every refactoring step is unguarded
- Security bugs are live — building architecture on top of live vulnerabilities doesn't fix them

**Conclusion: Phase 0 + 1 + 2 fix the foundation. Phase 3 fixes the schema. Phase 5 is where DDD module restructuring correctly lives.** Three DDD-adjacent wins (TenantContext, ApprovalWorkflowService extraction, domain concept relocation) are pulled into Phase 1 to deliver early architectural signal without requiring a stable foundation.

---

## 3. Anti-Pattern & Bug Catalogue

Combined catalogue of all significant findings. Items marked 🔴 are live bugs. Items marked 🟡 are design debt. Items marked 🏗️ are architectural issues.

| ID       | Finding                                                           | Phase                               |
| -------- | ----------------------------------------------------------------- | ----------------------------------- |
| 🔴 AP-01 | `env.ts` logs secrets on startup                                  | P0                                  |
| 🔴 AP-02 | TLS verification disabled in SMTP                                 | P0                                  |
| 🔴 AP-03 | `sanitizeInput` corrupts apostrophe data                          | P0                                  |
| 🔴 AP-04 | `revokeUserApiAccess` triggers emailVerified=false                | P0                                  |
| 🔴 AP-05 | `deleteById` missing `await` — no-op bug                          | P0                                  |
| 🔴 AP-06 | `deleteAllData` silently swallows errors                          | P0                                  |
| 🔴 AP-07 | Cross-tenant leak in spatial endpoints                            | P0/P1                               |
| 🔴 AP-08 | `mcp.ts` unprotected GET/SSE path                                 | P0/P1                               |
| 🔴 AP-09 | Transaction boundary violation in cascade delete                  | P0 (hotfix) / P3 (structural)       |
| 🟡 AP-10 | `event.ts` god file — 1,805 lines, two aggregate roots            | P5                                  |
| 🟡 AP-11 | HIP validation duplicated across four functions                   | P1/P5                               |
| 🟡 AP-12 | `BackendContext` missing `countryAccountsId`                      | P1 (TenantContext)                  |
| 🟡 AP-13 | Four parallel data access layers, no enforcement                  | P1 (consolidate) / P5 (restructure) |
| 🟡 AP-14 | `formSave` contains domain-level approval role logic              | P1 (ApprovalWorkflowService)        |
| 🟡 AP-15 | N+1 in cost calculator (30+ queries per list render)              | P1                                  |
| 🟡 AP-16 | Root loader 8 sequential awaits, not parallelised                 | P1                                  |
| 🟡 AP-17 | Geographic filter: full table scan, no recursive CTE              | P1                                  |
| 🟡 AP-18 | No CI/CD pipeline                                                 | P0 (pull forward)                   |
| 🟡 AP-19 | Two migration systems coexisting                                  | P1                                  |
| 🟡 AP-20 | Model tests use `node:test`, invisible to Vitest/CI               | P0                                  |
| 🟡 AP-21 | `ViewContext` calls hooks in constructor                          | P1                                  |
| 🟡 AP-22 | 133KB translation dictionary injected every page                  | P1/P3D                              |
| 🟡 AP-23 | DPG compliance gap: missing legal/community docs                  | P0                                  |
| 🏗️ AP-24 | `damages`/`losses`/`disruption` lack `country_accounts_id`        | P3B                                 |
| 🏗️ AP-25 | Broken FK CASCADE chain throughout event hierarchy                | P3C                                 |
| 🏗️ AP-26 | `disasterEventTable` wide-table antipattern (5× repeated columns) | P5                                  |
| 🏗️ AP-27 | Dates stored as `text` — no type safety or DB validation          | P3                                  |
| 🏗️ AP-28 | Tenant isolation only at app layer — not DB layer (no RLS)        | P3                                  |
| 🏗️ AP-29 | Scattered approval workflow — no single state machine             | P1 (service extraction)             |
| 🏗️ AP-30 | Domain concepts in `frontend/` — `roles.ts`, `approval.ts`        | P1                                  |

---

## 4. AI-Assisted SDLC — The Full Methodology

The AI-assisted SDLC has one goal: make the human developer's time go entirely to decisions that require human judgement (domain rules, security approvals, architectural choices), while agents handle everything that is mechanical and verifiable.

### 4.1 Agent Roster

Six agents operate across the SDLC. They work in sequence within each task, and some can operate in parallel across different tasks.

```
┌────────────────────────────────────────────────────────────────────────┐
│                     AI-Assisted SDLC Pipeline                          │
│                                                                        │
│  1. Bug Triage Agent      2. Spec Generator       3. Test Generator    │
│  (runs once pre-P0)        (per use case)        (from approved spec)  │
│                                                                        │
│  4. Implementation Agent  5. Reviewer Agent     6. Migration Validator │
│    (Claude Code loop)      (GitHub Actions)      (Phase 3 only)        │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 4.2 Agent 1 — Bug Triage Agent (Pre-Phase 0)

**Purpose:** Before any code is changed, run a structured automated analysis of the entire codebase. Produce a prioritised, machine-readable bug report with root cause identification for every P0 item. This gives the team a clear, verified picture of the exact files, line numbers, and root causes before the first PR is opened — and feeds the Spec Generator for fix specs.

**What it does:**

The agent runs in three passes:

_Pass 1 — Static analysis._ Runs the TypeScript compiler in `--noEmit` mode, ESLint, and a set of custom patterns targeting the known anti-patterns (missing `await` on DB calls, `dr` called inside a `tx` scope, `countryAccountsId` absent from queries on tenant-scoped tables). Output is a structured list of compiler errors, lint violations, and pattern matches.

_Pass 2 — Root cause analysis._ For each finding from Pass 1, the agent reads the surrounding code and constructs a root cause explanation: what the code does, what it should do, what the failure mode is, and what a minimal fix looks like. This is where the LLM reasoning runs — not to generate a fix, but to explain the cause clearly enough that the fix is unambiguous.

_Pass 3 — Fix complexity scoring._ Each finding is rated: Trivial (one-line fix, no tests needed), Simple (< 20 lines, one new test), Complex (multiple files, schema or transaction implications, full TDD cycle required). This drives sprint planning.

**Output:** A `gap-analysis/bug-triage/TRIAGE.md` file with every P0 item cross-referenced to: affected file + line, root cause summary, fix complexity, and whether a spec + test is required before fixing.

**Tooling:** Claude Code reading the full source tree, running shell commands (`tsc --noEmit`, `yarn lint`), and generating the triage file. Runs once before Phase 0 sprint planning. Human reviews the output at Gate 1 before work begins.

**Example triage entry:**

```yaml
id: P0-05
title: "deleteById missing await — no-op bug"
file: app/backend.server/models/common.ts
line: 47
root_cause: >
  The existence check `tx.select().from(tbl).where(eq(tbl.id, id))` is called
  without `await`. The expression evaluates to a Promise<never> which is always
  truthy, so the guard never fires. The record is "checked" and "deleted" but
  the DB operation for the check never executes.
fix_complexity: Simple
requires_spec: false
requires_test: true
fix_summary: "Add `await` before the select; add a test asserting deleteById
  returns an error when the ID does not exist."
```

---

### 4.3 Agent 2 — Spec Generator

**Purpose:** Before any non-trivial implementation, generate an OpenSpec YAML describing what the use case does, its invariants, preconditions, and named failure modes. This is the contract that agents 3 and 5 work against.

**When it runs:** For every P1+ item that involves business logic, a new use case, or any change to auth/security flow. Not required for trivial P0 bug fixes identified as "Simple" by the Bug Triage Agent.

**Inputs:** Existing code for the use case, the OpenSpec template from `specs/_template.spec.yaml`, and a description of what the code should do.

**Output:** Draft `specs/[phase]/[item-id]-[use-case-name].spec.yaml`

**Human gate (Gate 1):** The developer reviews the spec. The LLM will capture ~80% of preconditions correctly by reading the code; the developer corrects the remaining 20% — particularly invariants that are implied by domain knowledge but not visible in the code. The corrected spec is committed before any implementation begins.

**Confidence flag:** The spec generator is instructed to mark any precondition or invariant it inferred (vs. read explicitly) with `confidence: inferred`. These are the exact lines the developer must verify.

---

### 4.4 Agent 3 — Test Generator

**Purpose:** From an approved spec, generate comprehensive Vitest test cases covering every precondition, postcondition, named failure mode, and boundary condition.

**Critical validation step:** After generating tests, the agent runs them against the _existing_ code. Tests must _fail_ — a test that passes against unchanged code is not testing the right thing. If all tests pass against the old code, the spec was not capturing anything new and must be revisited.

**Output:** `[UseCase].test.ts` in the appropriate test directory.

**Human gate (Gate 2):** Developer reviews the test file. Checks that: every named failure mode has a test, the happy path test is meaningful, and there are no tests that can only pass because of implementation details rather than behaviour.

---

### 4.5 Agent 4 — Implementation Agent (LLM Code Loop)

**Purpose:** Implement the use case to pass the failing tests. Operates autonomously in a loop: write code → run tests → read failures → revise → repeat.

**Scope discipline:** The agent is given a task that is explicitly bounded — a single use case, a single file move, a specific function extraction. The failure mode of implementation agents is scope creep. Tasks larger than ~150 lines of net-new code or touching more than ~5 files are split before the agent starts.

**Verification chain:**

1. `tsc --noEmit` must pass — zero TypeScript errors
2. `yarn test [affected files]` must pass — all new tests green, no regressions
3. `yarn lint` must pass — no new lint violations

**The TypeScript compiler and test suite are the ground truth. The agent iterates until all three pass.** No human is in this loop — the deterministic verifiers replace the need for human attention during iteration.

---

### 4.6 Agent 5 — Reviewer Agent

**Purpose:** On every pull request, run a structured review of the diff against the spec and the known anti-pattern catalogue. Produce a structured JSON verdict that drives the PR merge gate.

**Implementation:** GitHub Action triggered on PR open/update. Calls the Claud/Co-Pilot API with:

- The PR diff
- The spec YAML the PR addresses (if it exists)
- The `CLAUDE.md` or equivalent `init file` with project context (anti-patterns, conventions, TenantContext contract)

**Structured output:**

```json
{
	"verdict": "BLOCK | WARN | APPROVE",
	"blocking": {
		"spec_divergence": [{ "file": "", "line": 0, "issue": "" }],
		"tenant_isolation": [{ "file": "", "line": 0, "issue": "" }],
		"security": [{ "file": "", "line": 0, "issue": "" }],
		"transaction_bounds": [{ "file": "", "line": 0, "issue": "" }]
	},
	"advisory": {
		"code_quality": [{ "file": "", "line": 0, "note": "" }],
		"convention": [{ "file": "", "line": 0, "note": "" }],
		"missing_tests": [{ "file": "", "line": 0, "note": "" }]
	}
}
```

Any item in `blocking` fails the PR check. Advisory items post as a comment but do not block. This gives the developer the benefit of a thorough review without requiring them to read every line — they read the flagged issues, not the full diff.

**What the Reviewer Agent is reliably good at for this codebase specifically:**

- Catching a DB query on a tenant-scoped table without `countryAccountsId` in the WHERE clause
- Catching a call to the global `dr` inside a function that received a `tx` parameter
- Catching a status transition not validated against the approval state machine
- Catching raw SQL string interpolation
- Flagging a function that changed behaviour relative to its spec

**What it does not replace:** Periodic manual security review by someone who understands the full threat model. Recommended: one full manual review at the end of Phase 2 (after auth hardening) and one after Phase 3 (after RLS is in place).

---

### 4.7 Agent 6 — Migration Validator (Phase 3 only)

**Purpose:** For every schema migration in Phase 3, validate that the migration script is safe to run against live data. This is the most risk-concentrated phase in the plan.

**What it checks:**

- Migration is additive in the first PR (no drops, no NOT NULL on existing columns without defaults)
- Backfill query handles NULL and edge cases correctly
- Rollback script is present and reverses the migration cleanly
- Application code handles both old and new column shape (transition period)
- No table-level locks that would block production traffic

**Human gate (Gate 3 — mandatory):** No schema migration runs on a production instance without human review and explicit approval. The Migration Validator's job is to compress the time required for human review by surfacing only the specific questions that require human judgement.

---

### 4.8 The Full Task Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│  For each task (Phase 1 and above, non-trivial items):              │
│                                                                     │
│  1. HUMAN: define task scope, point to affected files               │
│                                                                     │
│  2. Agent 2: generate draft spec YAML                               │
│                                                                     │
│  3. HUMAN reviews spec ──── GATE 1 ──── correct + commit spec       │
│                                                                     │
│  4. Agent 3: generate failing tests from spec                       │
│     → run against old code → confirm they FAIL                      │
│                                                                     │
│  5. HUMAN spot-checks tests ──── GATE 2                             │
│                                                                     │
│  6. Agent 4: implement → tsc → tests → lint → iterate until green   │
│     (autonomous loop, no human in this step)                        │
│                                                                     │
│  7. PR opened → Agent 5: reviewer generates structured verdict      │
│                                                                     │
│  8. HUMAN reads review, resolves any BLOCK items                    │
│                                                                     │
│  9. HUMAN approves merge ──── GATE 3                                │
│     (schema migrations require additional Gate 3 review)            │
└─────────────────────────────────────────────────────────────────────┘
```

**For trivial P0 fixes** (Bug Triage Agent rated "Simple" or "Trivial"): skip Agents 2 and 3. Human writes the one-liner fix, Agent 5 reviews on PR, human approves.

---

### 4.9 CLAUDE.md or Project's Init File — The Agent Briefing Document

A `init-file` e.g. `CLAUDE.md` at the repo root is the single source of context for every agent session. It is updated at the end of each phase to reflect current architecture. Contents:

```markdown
# DELTA Resilience — Agent Context

## Current Phase: [N]

## Architecture state: [description of what has been completed]

## Bounded Contexts (target)

BC1: Event Lifecycle → core/event-lifecycle/
BC2: Disaster Record → core/disaster-record/
BC3: Identity & Tenancy → core/identity/
BC4: Analytics → core/analytics/
BC5: Reference Data → core/reference-data/
BC6: Import / Export → core/import-export/

## TenantContext Contract

interface TenantContext {
countryAccountsId: string; // NON-NULLABLE — required in all auth'd flows
userId: string;
userRole: RoleId;
lang: string;
t: Translator;
}

## Active Anti-Patterns to Flag (Reviewer Agent)

- Any DB query on disaster_records/disaster_event/hazardous_event WITHOUT
  countryAccountsId in the WHERE clause
- Any call to global `dr` inside a function that received `tx` parameter
- Any approval status set without a role check
- Raw SQL string interpolation (use Drizzle sql`` tag)
- Direct Drizzle imports inside app/routes/ files

## Spec location: specs/

## Test runner: Vitest (NEVER node:test)

## Migration pattern: three-PR (additive → backfill → cutover)
```

---

### 4.10 Agent Readiness Schedule

The six agents do not all need to exist on day one. Building them incrementally reduces risk and lets the team validate each agent on low-stakes work before it matters. The table below shows the **latest point** by which each agent must be operational — and the **recommended build window**.

| Agent                    | Must be ready by          | Recommended build window                          | Notes                                                                                                                                                                                                                            |
| ------------------------ | ------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 - Bug Triage           | Before Pre-Phase 0 starts | 2–3 days before Pre-Phase 0                       | Runs once; its output IS the Pre-Phase 0 deliverable. Build and validate it first, before anything else.                                                                                                                         |
| 5 - Reviewer Agent       | Phase 0 Week 2            | Phase 0 Week 1 (parallel to first security fixes) | Should be reviewing every PR from Phase 0 onwards. Earliest possible value.                                                                                                                                                      |
| 2 - Spec Generator       | Phase 1 Week 1            | Phase 0 Week 3                                    | Phase 1 has non-trivial items that require specs before implementation starts.                                                                                                                                                   |
| 3 - Test Generator       | Phase 1 Week 2            | After 2 is validated on one real spec             | Depends on 2 — build sequentially.                                                                                                                                                                                               |
| 4 - Implementation Agent | Phase 1 Week 3            | Phase 1 Week 1 (test on one small task)           | This is Claude Code operating in the repo with CLAUDE.md loaded (or similar). No special build required, but validate the CLAUDE.md context drives correct output on one small Phase 1 task before relying on it for large ones. |
| 6 - Migration Validator  | Phase 3 Week 1            | Phase 2 final weeks                               | Phase 3 is the only phase that uses it. Build and stress-test it against anonymised production data at the end of Phase 2.                                                                                                       |

**Recommended build sequence:**

```
Pre-Phase 0 prep:  Build 1  (Bug Triage Agent) → validate on known P0 items
Phase 0 Week 1:    Build 5  (Reviewer Agent) → validate with a deliberate "bad" PR
Phase 0 Week 3:    Build 2  (Spec Generator) → validate on ApprovalWorkflowService draft
Phase 1 Week 1:    Build 3  (Test Generator) → validate against approved spec from ②
Phase 1 Week 1:    Validate 4 (Implementation Agent / CLAUDE.md) on one small Phase 1 fix
Phase 2 final:     Build 6  (Migration Validator) → validate against a test migration script
```

> **A note on validating agents before relying on them:** Before using any agent on real work, test it on a task where you already know the correct answer. For Agent 1, the `deleteById` missing `await` bug (AP-05) is a known, documented item — verify the agent finds it with the correct root cause. For Agent 5, create a PR with a deliberate tenant isolation miss (a DB query without `countryAccountsId`) and confirm the agent produces a BLOCK verdict. This investment of 30–60 minutes per agent prevents costly surprises during the actual sprints.

---

### 4.11 OpenSpec in the DELTA Workflow

OpenSpec is the specification-first methodology (SDD — Specification-Driven Development) that underpins the AI-assisted SDLC in this plan. It is not a single tool — it is a convention: **before implementing any non-trivial feature or fix, write a YAML spec file describing the contract**. Agent 2 drafts these; the developer approves and corrects them; Agent 3 consumes them to generate tests.

#### Where specs live

```
specs/
├── _template.spec.yaml              # Canonical template (see Section 10)
├── agents/
│   ├── bug-triage-prompt.md         # Prompt driving Agent 1
│   ├── spec-generator-prompt.md     # Prompt driving Agent 2
│   ├── test-generator-prompt.md     # Prompt driving Agent 3
│   ├── reviewer-agent-prompt.md     # Prompt driving Agent 5
│   └── migration-validator-prompt.md
├── phase-1/
│   ├── P1-TenantContext.spec.yaml
│   ├── P1-ApprovalWorkflowService.spec.yaml
│   ├── P1-CostCalculatorOptimisation.spec.yaml
│   └── ...
├── phase-2/
│   ├── P2-ApiKeyHashing.spec.yaml
│   └── ...
└── phase-3/
    ├── P3-DateColumnMigration.spec.yaml
    ├── P3-RLS-PERMISSIVE.spec.yaml
    └── ...
```

The `specs/agents/` subfolder is critical — agent prompts are versioned alongside the code they help write. A regression in agent output quality is almost always traced to an untracked prompt change.

#### When to write a spec

| Item type                                                     | Spec required?                                             |
| ------------------------------------------------------------- | ---------------------------------------------------------- |
| P0 bug fix rated "Trivial" or "Simple" by Bug Triage Agent    | No — human writes the one-liner fix directly               |
| P0 bug fix rated "Complex"                                    | Yes — spec clarifies the correct behaviour before fixing   |
| Any new service, function, or significant refactor (Phase 1+) | Yes                                                        |
| Schema migration (Phase 3)                                    | Yes — `migration_notes` section is mandatory               |
| Infrastructure change (Phase 4)                               | Optional but recommended for any change with rollback risk |
| DDD module restructuring (Phase 5)                            | Yes — one spec per bounded context                         |

**The first spec to write (recommended):** `P1-ApprovalWorkflowService.spec.yaml`. The domain is already partially specified in `formSave` and the audit, the current behaviour is well-understood, and the extraction is a behaviour-preserving refactor — making it the ideal spec to validate the Agent 2 → 3 workflow end-to-end before applying it to more complex items.

#### OpenSpec tooling options

| Option                                                         | Maturity                  | Recommendation                                                                                                                                                                                                |
| -------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Manual YAML** (template from Section 10, drafted by Agent 2) | Stable                    | **Start here.** No tooling overhead. The spec habit is more valuable than the tooling.                                                                                                                        |
| **OpenSpec CLI**                                               | Experimental (early 2026) | Introduces spec generation and validation commands. Consider adopting after the team has written 10+ specs manually and understands the format. Reference: [github.com/openspec](https://github.com/openspec) |
| **CI spec validation**                                         | Simple to add             | A GitHub Actions step that checks every Phase 1+ PR has a corresponding `specs/phase-*/` file. File-existence check only — no schema validation needed to start.                                              |

#### Learning resources for SDD / OpenSpec

- [Anthropic SDD introduction](https://docs.anthropic.com/en/docs/claude-code/sdd) — the methodology this workflow is based on
- [Prompt engineering guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview) — essential for writing reliable Spec Generator prompts
- The `specs/_template.spec.yaml` in this repo (Section 10) — the canonical local reference

---

### 4.12 Agent Best Practices and Sample Implementation

The team will be building and using AI agents for the first time in this project. The following principles are based on what makes agents reliable in a real production codebase — not what sounds compelling in theory.

#### Core principles

**Keep task scope minimal.** The single biggest failure mode of implementation agents is scope creep. A task touching one file produces reliable output; a task touching ten files produces unreliable output. The rule of thumb throughout this plan is < 150 lines of net-new code and < 5 files per agent task. Larger refactors are decomposed into a sequence of small tasks _before_ the agent starts.

**Use deterministic verifiers, not LLM verifiers.** Agents make mistakes. The way to catch those mistakes reliably is not to have another LLM check the output — it is to have the TypeScript compiler and test suite check it. These are deterministic and catch the bugs that matter. Agent 5 (Reviewer Agent) is an LLM reviewer, but it runs on the diff _after_ `tsc`, `vitest`, and `eslint` have already passed. This layering is intentional and important.

**Keep CLAUDE.md current.** Agents have no memory between sessions. Every agent session starts fresh. `CLAUDE.md` at the repo root is the single source of project context loaded at the start of every session. When the architecture changes at the end of a phase, update `CLAUDE.md` on the same PR that makes the change.

**Version-control your prompts.** Store all agent prompts in `specs/agents/[agent-name]-prompt.md`. Treat prompt changes exactly like code changes — commit them, review them, record why they changed in the commit message. A regression in agent output quality is almost always caused by an untracked prompt edit.

**Test agents on known inputs before relying on them.** Before each agent handles real sprint work, run it against a case with a known correct answer. Only when the output matches the expected result should the agent be trusted in the live workflow.

**Expect one human review cycle per agent output.** Gates 1–3 in the workflow already account for this. The developer corrects the spec draft (Gate 1), spot-checks the test suite (Gate 2), and reviews the final PR (Gate 3). This is not inefficiency — it is the correct division of labour between agent speed and human judgement.

#### Skills and tool access each agent requires

| Agent                  | Required capabilities                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1 Bug Triage           | Full codebase read, shell execution (`tsc --noEmit`, `yarn lint`, custom grep patterns), file write (`TRIAGE.md`)   |
| 2 Spec Generator       | File read (use case code + neighbouring files), YAML write to `specs/`, `_template.spec.yaml` loaded in context     |
| 3 Test Generator       | Spec YAML read, TypeScript file write, shell execution (`vitest run [file]` to confirm tests fail against old code) |
| 4 Implementation Agent | Full file system read/write, shell execution (tsc, vitest, eslint), git diff read (not write — human commits)       |
| 5 Reviewer Agent       | GitHub PR API (diff read), Claude API with structured JSON output mode, repo file read (CLAUDE.md + spec files)     |
| 6 Migration Validator  | SQL migration file read, Drizzle schema read, shell execution (migration dry-run against test DB)                   |

All shell-executing agents must run in a sandboxed environment (separate branch or ephemeral container) — they should never be able to push to `main` or modify production configuration directly.

#### Sample: Reviewer Agent (GitHub Actions)

This is the most immediately useful agent and the one to build first alongside Phase 0. The following is a production-ready implementation.

```yaml
# .github/workflows/reviewer-agent.yml
name: AI Code Reviewer
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get PR diff
        run: git diff origin/${{ github.base_ref }}...HEAD > /tmp/pr.diff

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Anthropic SDK
        run: npm install @anthropic-ai/sdk

      - name: Run AI review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: node .github/scripts/reviewer-agent.mjs

      - name: Post review comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const verdict = JSON.parse(fs.readFileSync('/tmp/review-verdict.json', 'utf8'));
            let body = `## AI Code Review — \`${verdict.verdict}\`\n\n`;
            const blocking = Object.entries(verdict.blocking)
              .filter(([, items]) => items.length > 0);
            if (blocking.length > 0) {
              body += `### 🚫 Blocking Issues\n`;
              for (const [category, items] of blocking) {
                body += `\n**${category}**\n`;
                for (const item of items) {
                  body += `- \`${item.file}:${item.line}\` — ${item.issue}\n`;
                }
              }
            }
            const advisory = Object.entries(verdict.advisory)
              .filter(([, items]) => items.length > 0);
            if (advisory.length > 0) {
              body += `\n### ⚠️ Advisory\n`;
              for (const [category, items] of advisory) {
                body += `\n**${category}**\n`;
                for (const item of items) {
                  body += `- \`${item.file}:${item.line}\` — ${item.note}\n`;
                }
              }
            }
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body
            });

      - name: Fail on blocking verdict
        run: |
          VERDICT=$(node -e "const v=require('/tmp/review-verdict.json');console.log(v.verdict)")
          [ "$VERDICT" != "BLOCK" ] || exit 1
```

```javascript
// .github/scripts/reviewer-agent.mjs
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const client = new Anthropic();
const diff = fs.readFileSync("/tmp/pr.diff", "utf8");
const claudeMd = fs.readFileSync("CLAUDE.md", "utf8");

// Detect if there is a corresponding spec for this PR (convention: spec path
// in PR description as "Spec: specs/phase-N/item-name.spec.yaml")
// Falls back gracefully if no spec is referenced.

const systemPrompt = `You are a senior code reviewer for the DELTA Resilience project.
Your job is to review the PR diff for the specific issues this project is prone to.
Return ONLY valid JSON — no prose, no markdown, no explanation outside the JSON.
 
Project context:
${claudeMd}
 
Blocking checks (any finding here = verdict BLOCK):
1. tenant_isolation: Any DB query on a tenant-scoped table (disaster_records, disaster_event,
   hazardous_event, damages, losses, disruption) WITHOUT countryAccountsId in the WHERE clause.
2. transaction_bounds: Any call to the global \`dr\` database client inside a function that
   received a \`tx\` transaction parameter.
3. security: Raw SQL string interpolation (not using Drizzle sql\`\` tag), credentials in
   logs or error messages, missing auth check on a route handler.
4. spec_divergence: If a spec file is referenced, any behaviour that contradicts a
   postcondition or invariant in the spec.
 
Advisory checks (findings here = verdict WARN, not BLOCK):
- code_quality: Functions > 40 lines, magic strings, missing error typing.
- convention: Incorrect import paths, node:test usage instead of vitest, direct Drizzle
  import in a routes/ file.
- missing_tests: New business logic with no corresponding test file or test case.
 
Return this exact JSON schema:
{
  "verdict": "BLOCK | WARN | APPROVE",
  "blocking": {
    "spec_divergence":    [{"file": "", "line": 0, "issue": ""}],
    "tenant_isolation":   [{"file": "", "line": 0, "issue": ""}],
    "security":           [{"file": "", "line": 0, "issue": ""}],
    "transaction_bounds": [{"file": "", "line": 0, "issue": ""}]
  },
  "advisory": {
    "code_quality":  [{"file": "", "line": 0, "note": ""}],
    "convention":    [{"file": "", "line": 0, "note": ""}],
    "missing_tests": [{"file": "", "line": 0, "note": ""}]
  }
}
verdict is BLOCK if any blocking array is non-empty, WARN if only advisory items exist,
APPROVE if all arrays are empty.`;

const response = await client.messages.create({
	model: "claude-opus-4-6",
	max_tokens: 2048,
	system: systemPrompt,
	messages: [
		{
			role: "user",
			content: `Review this pull request diff:\n\`\`\`diff\n${diff.slice(0, 80000)}\n\`\`\``,
		},
	],
});

const verdict = JSON.parse(response.content[0].text);
fs.writeFileSync("/tmp/review-verdict.json", JSON.stringify(verdict, null, 2));
console.log(`Reviewer verdict: ${verdict.verdict}`);
```

> **Cost note:** Each Reviewer Agent run costs roughly $0.02–0.08 USD using `claude-opus-4-6` on a typical diff. For a team merging 3–5 PRs per day, this is under $3/day — well within the value it provides by catching tenant isolation misses before they reach production.

#### Learning resources

| Resource                    | URL                                                                              | Why relevant                                           |
| --------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Claude Code docs            | https://docs.anthropic.com/en/docs/claude-code/overview                          | Agents 1,2,3,4 — Claude Code is Agent 4                |
| Claude API reference        | https://docs.anthropic.com/en/api/getting-started                                | Agents 2,3,5,6 — built on the API                      |
| Tool use / function calling | https://docs.anthropic.com/en/docs/build-with-claude/tool-use                    | Giving agents shell and file access                    |
| Prompt engineering guide    | https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview | Writing reliable, consistent agent prompts             |
| SDD methodology             | https://docs.anthropic.com/en/docs/claude-code/sdd                               | The specification-first workflow this plan is built on |
| Anthropic SDK (Node.js)     | https://github.com/anthropic-sdk/sdk-node                                        | For implementing Agents 5 and 6 in GitHub Actions      |
| Strangler Fig pattern       | https://martinfowler.com/bliki/StranglerFigApplication.html                      | Martin Fowler's original write-up                      |
| Domain-Driven Design        | Eric Evans, _Domain-Driven Design_ (Addison-Wesley, 2003)                        | Core DDD theory                                        |
| Implementing DDD            | Vaughn Vernon, _Implementing Domain-Driven Design_ (Addison-Wesley, 2013)        | Practical DDD for working codebases                    |

---

## 5. Target Architecture — Pragmatic DDD

### 5.1 What "Pragmatic DDD" Means Here

Full DDD has layers of ceremony that don't deliver proportionate value for a team of this size. The following table is explicit about what is kept and what is dropped:

| Pattern                                          | Decision             | Reason                                                                                           |
| ------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------ |
| Bounded context folder structure                 | **Keep**             | Highest-leverage structural change. One ESLint rule enforces it.                                 |
| Service layer per BC owning transactions         | **Keep**             | Eliminates scattered logic. Achievable without full framework.                                   |
| TenantContext (non-nullable `countryAccountsId`) | **Keep**             | Compile-time tenant isolation. Eliminates an entire class of bugs.                               |
| `HipClassification` value object                 | **Keep**             | Eliminates four-location duplication. Concrete, bounded.                                         |
| `ApprovalWorkflowService` state machine          | **Keep**             | Eliminates scattered approval logic across routes/handlers/models.                               |
| Repository interfaces                            | **Defer to Phase 5** | Until the four data access layers are consolidated into one, interfaces add a fifth layer.       |
| Domain events (formal async pattern)             | **Skip**             | No async consumers exist. Direct service calls are correct at this scale.                        |
| Strict aggregate consistency rules               | **Skip**             | PostgreSQL transaction is the consistency boundary. App-layer enforcement is redundant overhead. |
| Anti-corruption layer for imports                | **Simplify**         | Validate-then-delegate pattern in Phase 5 import work, without formal ACL ceremony.              |

### 5.2 Target Folder Structure (end state after Phase 5)

```
app/
├── core/                              # DDD-structured domain code
│   ├── event-lifecycle/               # BC1: HazardousEvent, DisasterEvent
│   │   ├── domain/                    # Entities, value objects, interfaces
│   │   ├── application/               # HazardousEventService, DisasterEventService
│   │   └── infrastructure/            # DB implementations
│   ├── disaster-record/               # BC2
│   ├── identity/                      # BC3: Auth, tenancy, permissions
│   ├── analytics/                     # BC4: Read-only query services
│   ├── reference-data/                # BC5: HIP, geography, sectors
│   └── import-export/                 # BC6: CSV/API ingestion
│
├── shared/                            # Cross-cutting shared kernel
│   ├── context/                       # TenantContext interface + factory
│   ├── domain/                        # Money, DateRange, ApprovalStatus
│   └── errors/                        # Typed DomainError classes
│
├── drizzle/schema/                    # Unchanged: DB schema
├── routes/                            # Thin: loaders + actions only, no DB imports
├── frontend/                          # UI components (domain concepts removed)
└── utils/                             # Reduced: non-domain cross-cutting only
```

### 5.3 Key Structural Constraints (enforced by ESLint)

Two rules, automated in CI, enforce the architecture permanently:

```
Rule 1: No import from app/drizzle/schema/* inside app/routes/*
        (routes must go through services, not query DB directly)

Rule 2: No import from core/[bc-a]/* inside core/[bc-b]/*
        (cross-BC communication via shared/ interfaces only)
```

These two lint rules are written in Phase 0 and run from day one. They are the architectural fitness functions that prevent drift over time — more durable than documentation.

### 5.4 TenantContext — The Single Most Important Change

```typescript
// Phase 1 introduces this. Every subsequent phase uses it.

interface TenantContext {
	readonly countryAccountsId: string; // non-nullable — compiler enforces isolation
	readonly userId: string;
	readonly userRole: RoleId;
	readonly lang: string;
	readonly t: Translator;
}

// Public-facing routes (view-only, published records) use:
interface PublicContext {
	readonly lang: string;
	readonly t: Translator;
	// countryAccountsId absent by design — signals public access
}
```

Once this type is in place, any function missing `countryAccountsId` is a TypeScript error, not a runtime surprise. The Reviewer Agent checks for it on every PR. The migration is mechanical — the Implementation Agent can do it file-by-file once the type is defined.

---

## 6. The Strangler Fig in Practice

### 6.1 What Strangler Fig Means for This System

Strangler Fig on a Remix SSR monolith works differently from microservices migration. There is no "routing layer" to redirect traffic. The strangling happens at the module boundary level:

1. **Create the new structure** alongside the old code (don't delete anything yet)
2. **Route new code** to the new module only
3. **Migrate callers** one by one from old to new
4. **Delete the old code** only when no callers remain

At no point does both the old and new code run simultaneously for the same request — the caller either uses the old function or the new one.

### 6.2 Module-Level Strangler Fig (Phase 5)

```
Step 1: Create core/event-lifecycle/ with new HazardousEventService
        event.ts still exists, unchanged

Step 2: New routes call HazardousEventService
        Old routes still call event.ts directly

Step 3: Migrate CSV import and API routes to use HazardousEventService

Step 4: Confirm zero remaining imports of event.ts
        Delete event.ts

At every step: all tests pass, all routes work.
```

### 6.3 Three-PR Schema Migration Pattern (Phase 3)

Every schema change in Phase 3 follows this pattern without exception. This is the Strangler Fig applied to the database:

```
PR 1 — ADDITIVE (safe to deploy, zero downtime)
  - Add new column(s) with nullable or default
  - Application reads from OLD column
  - New column exists but is ignored

PR 2 — BACKFILL + DUAL-READ (safe to deploy, zero downtime)
  - Backfill script populates new column from old
  - Application reads from NEW column with fallback to OLD
  - Both columns live in sync

PR 3 — CUTOVER + DROP (coordinate with instances)
  - Application reads only from NEW column
  - Old column dropped
  - Requires notification to country instance admins
  - Requires backup before deploy
```

**Example: Date columns (P3-1)**

```
PR 1: Add start_date_v2 (date) + start_date_resolution ('year'|'month'|'day')
      Nullable. App ignores them.

PR 2: Backfill: parse existing text start_date → populate start_date_v2 + resolution
      App reads start_date_v2, falls back to parsed start_date on null
      Both in sync. Safe to run on any instance.

PR 3: Remove all start_date text parsing logic.
      Drop start_date column.
      Rename start_date_v2 → start_date.
```

### 6.4 RLS — The Special Case (P3-2)

Row Level Security is the most consequential change in the entire plan and gets its own sub-protocol. It is NOT run as a standard three-PR migration.

```
Step 1 (P3-2a — PERMISSIVE mode, monitoring sprint):
  - Add SET LOCAL app.current_tenant to all query paths
  - Enable RLS in PERMISSIVE mode (non-blocking: falls through if context missing)
  - Add logging when tenant context is missing from a query
  - Run for one full sprint in production, monitoring logs
  - No data is blocked in PERMISSIVE mode

Step 2 (P3-2b — RESTRICTIVE mode, after validation):
  - Only after zero missing-context log entries for 2 consecutive weeks
  - Switch to RESTRICTIVE (queries without context return empty results)
  - This is the step that makes isolation truly enforced at DB level
  - Requires a dedicated PR review by the tech lead + backup before deploy
```

This step must not be rushed. PERMISSIVE → RESTRICTIVE transition is a one-way door in terms of its effect: once in RESTRICTIVE mode, any code path that doesn't set the tenant context returns zero results, not an error. Silent failures are harder to detect than exceptions.

---

## 7. Implementation Roadmap

### Phase Pre-0 — Bug Triage (1 week, before sprint planning)

**This is not a development sprint. It is an intelligence-gathering run.**

Agent 1 (Bug Triage Agent) runs across the full codebase and produces `gap-analysis/bug-triage/TRIAGE.md`. Human reviews the output, verifies root causes for all P0 security items, and assigns complexity scores. The output of this phase is the sprint plan for Phase 0 — not an estimate, a verified item list.

**Deliverable:** `TRIAGE.md` reviewed and signed off. Every P0 item has a confirmed root cause and fix complexity score.

---

### Phase 0 — Critical Fixes + CI Foundation (3 weeks)

**Goal:** Eliminate every live bug and security issue. Establish the automated gate infrastructure that makes all subsequent phases safe. Ship as a patch batch to main.

**Why CI/CD is here and not Phase 1:** You cannot safely refactor 120+ items without automated gates. Moving CI/CD to Phase 0 means every subsequent phase has a safety net from day one.

**Security fixes (ship in Week 1 — these are live vulnerabilities):**

- P0-12: Remove secret logging from `env.ts`
- P0-13: Remove `rejectUnauthorized: false` from SMTP
- P0-14: Fix `sanitizeInput` to not strip apostrophes
- P0-08: Fix `revokeUserApiAccess` side-effect on `emailVerified`
- P0-07: Fix `deleteAllData` silent error swallow
- P1-22: Fix `authLoaderApiDocs` missing tenant check (pull forward from P1 — security)
- P1-29/30: Fix cross-tenant leaks in spatial endpoints (pull forward — security)
- P1-31: Add auth to `subsectors.tsx` endpoint
- P1-33: Fix `mcp.ts` unprotected GET/SSE path

**Data integrity fixes (Week 1–2):**

- P0-02: Fix `deleteById` missing `await`
- P0-09: Fix `handleTransaction` sentinel string — use Error subclass
- Transaction boundary fix in `deleteAllDataByDisasterRecordId` (calls `dr` inside `tx` scope)

**Infrastructure + gates (Week 2–3):**

- P1-37: CI/CD pipeline — GitHub Actions for TypeScript check, lint, Vitest, coverage threshold
- P0-20: Add CSP header to `entry.server.tsx`
- P0-18: Add `.dockerignore`
- P0-01: Fix `NODE_ENV=development` in Dockerfile
- P0-04: Add coverage thresholds baseline to `vitest.config.ts`
- P0-03: Remove debug `console.log` calls + add `no-console` lint rule
- Add the two ESLint architectural rules (no routes→drizzle, no cross-BC imports)
- AP-20: Migrate `node:test` model tests to Vitest — make them visible to CI

**Documentation / DPG compliance (Week 3, can be parallel):**

- P0-23 through P0-27: `LICENSE` placeholder, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `NOTICE`
- P0-22: Fix `readme.md` factual errors
- P0-05/06: Fix placeholder support email and hardcoded `/en/` in email notifications

**Remaining P0 items:** P0-10, P0-11, P0-15, P0-16, P0-17, P0-19, P0-21

**Deliverable:** Zero live security bugs. CI/CD pipeline green. All P0 items resolved. Every subsequent merge has automated gates.

**Risk:** Low — no domain logic changed. Security fixes are surgical. Can ship incrementally as each fix is ready.

---

### Phase 1 — Structural Foundation + DDD-Adjacent Wins (8–10 weeks)

**Goal:** Address the 48 structural items. Establish the architectural patterns that Phase 5 will build on. Pull forward three DDD-adjacent wins that deliver immediate value without requiring a clean foundation.

**Performance fixes (Weeks 1–3):**

- P1-03: Rewrite cost calculator — single SQL replaces N+1 loop (30+ queries → 1)
- P1-13: Parallelise root loader — `Promise.all()` on independent awaits
- P1-14: Request-scoped session memoisation — parse cookie once per request
- P1-18: Fix `getDescendantDivisionIds` — recursive CTE replaces full table scan
- P1-19: Remove dev/prod behavioral split in geographic filter
- P1-02: Introduce session write threshold (don't write `lastActiveAt` on every request)
- P1-16: Fix N+1 in email validator loop
- P1-26: Fix email transporter — create singleton, not per-send instance

**Data access consolidation (Weeks 2–4):**

- P1-38: Retire raw SQL migration scripts — Drizzle-only going forward
- P1-20: Enforce `tx` on all `logAudit` calls inside transactions
- P1-21: Move model integration tests to `tests/integration-realdb/`
- P5-12 (pulled forward): Designate `app/db/queries/` as single repository tier; add lint rule blocking direct Drizzle imports from routes

**DDD-adjacent wins (Weeks 3–6):**

- **TenantContext** (AP-12): Define `TenantContext` interface and factory. Begin using in new code. Migrate `authLoaderWithPerm` and `authActionWithPerm` to construct and inject `TenantContext`. This is the single highest-leverage structural change in the plan.
- **ApprovalWorkflowService** (AP-29 / P5-6 pulled forward): Extract the scattered approval status logic from `formSave`, routes, and multiple model files into a single `ApprovalWorkflowService` with an explicit state machine. This is a behaviour-preserving refactor with full test coverage.
- **Domain concept relocation** (AP-30 / P5-7 pulled forward): Move `roles.ts` and `approval.ts` from `frontend/` to `shared/domain/`. Update all imports. These are domain concepts, not UI concerns.

**Auth + session hardening (Weeks 4–5):**

- P1-23: Remove `hasPermission` dead code branch
- P1-24: Fix SSO `editProfile`/`passwordReset` empty functions
- P1-25: Add startup validation for required environment variables
- P1-28: Make session timeout configurable via `SESSION_TIMEOUT_MINUTES`
- P2-01 (pull forward): Rate limiting on auth endpoints
- P2-02: Fix super admin mock UUID

**UI + translation (Weeks 5–8):**

- P1-10: Replace `ViewContext` class with `useViewContext()` hook
- P1-11: Design tokens in `tailwind.config.ts` (replace hardcoded colours)
- P1-06: Parallelise translation startup queries
- P1-27: Consolidate dual logging systems
- P1-34/35/36: Align language availability, remove duplicate translation loading, fail on duplicate keys

**Remaining P1 items:** P1-01, P1-04, P1-05, P1-07, P1-08, P1-09, P1-12, P1-15, P1-17, P1-32, P1-40, P1-41, P1-42, P1-43, P1-44, P1-45, P1-46, P1-47, P1-48

**Deliverable:** No more N+1 in the core list render. Single data access pattern enforced by lint. TenantContext in use. ApprovalWorkflowService extractable. CI gates green. The codebase is now stable enough to build on.

---

### Phase 2 — Security Hardening + Quality Gates (3–4 weeks)

**Goal:** Complete the security hardening started in Phase 0. Establish the quality gates (mutation testing, E2E against production build) that give confidence before the database work in Phase 3.

- P2-03/04: API key table — hash secrets, add `assigned_to_user_id` (three-PR Strangler Fig)
- P2-05: Move file uploads to object storage (S3-compatible interface) — prerequisite for horizontal scaling
- P2-06: Fix translation import startup race with PostgreSQL advisory lock
- P2-07: Add Zod input validation to all API write endpoints
- P2-08: Run E2E tests against production build (not dev server)
- P2-09: Extract GeoJSON fixture from `geoValidation.test.ts` (875KB file)
- P2-10: Remove hardcoded country UUID from E2E fixtures
- P2-11/12/13: Documentation — versioned docs site, API reference, onboarding tutorial
- Manual security review — full threat model review now that auth hardening is complete

**Deliverable:** All API endpoints validated. E2E tests run against production build. File storage abstracted. Security review signed off.

---

### Phase 3 — Schema Migrations + DB Integrity (6–8 weeks)

**Goal:** Fix the foundational schema issues that currently undermine aggregate boundaries, cascade integrity, and tenant isolation at the database layer. Every change uses the three-PR Strangler Fig pattern.

This is the most technically complex phase. Each migration runs against live data. The Migration Validator agent (Agent ⑥) reviews every migration script before it touches production.

**Tenant isolation at DB level (highest priority in this phase):**

- P3B-2: Add `country_accounts_id` to `damages`, `losses`, `disruption`, `human_dsg_*` tables (three-PR)
- P3-2a: Enable RLS in PERMISSIVE mode — monitor for missing tenant context in queries
- _(After two weeks of clean PERMISSIVE logs)_
- P3-2b: Switch RLS to RESTRICTIVE — tenant isolation now enforced at database layer

**Cascade chain repair (critical for data integrity):**

- P3C-1: Fix CASCADE chain — `disaster_records ← disaster_event ← hazardous_event ← country_accounts`
- P3B-1: Add DB-level CASCADE on human effects FK chain
- P3C-5: Fix polymorphic FK integrity on validation tables
- P3C-6: Add FK constraints for approval workflow actor UUIDs

**Schema normalisation:**

- P3-1: Date columns — `text` → `date` + `resolution` enum (three-PR)
- P3C-3: Replace `asset.sector_ids` text with proper join table
- P3C-4: Add primary key to `human_dsg_config`
- P3C-7: Add unique constraint to `event_relationship`

**Translation (P3D-1):** Namespace-based translation splitting — replace 133KB full-dictionary injection with namespace files loaded on demand.

**P3B-3 (deferred to Phase 5 or later):** UUIDv7 migration — time-ordered UUIDs. Lower urgency than schema integrity items; don't block Phase 3 completion.

**Deliverable:** Tenant isolation enforced at DB layer (RLS RESTRICTIVE). CASCADE chains correct. Financial impact tables have `country_accounts_id`. Date columns properly typed. Schema is now a correct foundation for aggregate boundaries.

---

### Phase 4 — Infrastructure & High Availability (3–4 weeks)

**Goal:** Enable horizontal deployment. Prerequisite: Phase 2 (object storage) and P1-40 (migrations as pre-deploy step, not startup).

- P1-40: Isolate migrations as pre-deploy step (unblock multi-node deployment)
- P4-1: Health endpoint + Kubernetes readiness/liveness probes
- P4-2: Redis for sessions + rate limiting (multi-node safe)
- P4-3: Read replica for analytics queries
- P1-41: Docker Swarm / Kubernetes 3-node deployment config

**Deliverable:** System can run on multiple nodes without session conflicts or concurrent migration runs.

---

### Phase 5 — DDD Module Restructuring (6–8 weeks)

**Goal:** The foundation is now clean: single data access layer, correct schema, tenant isolation at DB and app layers, CI/CD enforced, no live bugs. This is where the full DDD module boundaries are built using the Strangler Fig at the module level.

**Prerequisites that are now met:**

- Single repository tier designated (`db/queries/`) — P5-12 done in Phase 1
- Schema integrity fixed (Phase 3)
- TenantContext in use (Phase 1)
- CI/CD running (Phase 0)
- ApprovalWorkflowService exists (Phase 1)

**Module restructuring (Strangler Fig, one BC at a time):**

- P5-5: Create `core/` directory structure with `domain/`, `application/`, `infrastructure/` layers
- BC1 — Event Lifecycle: extract `HazardousEventService`, `DisasterEventService` from `event.ts` (1,805 lines → two focused modules). `HipClassification` value object (eliminates four-location duplication). `event.ts` kept as re-export shim, deleted when zero direct callers remain.
- BC2 — Disaster Record: extract from `disaster_record.ts`, `losses.ts`, `damages.ts`, `disruption.ts`
- BC3 — Identity: `auth.ts`, `session.ts`, user models → `core/identity/`
- BC4 — Analytics: all 17 analytics files → `core/analytics/` with typed Drizzle queries replacing any remaining raw SQL
- BC5 — Reference Data: HIP taxonomy, geography, sectors → `core/reference-data/`
- BC6 — Import/Export: validate-then-delegate pattern; CSV/API imports call domain services

- P5-8: Introduce repository interfaces now that a single DB tier exists (optional — only if the team wants the in-memory test pattern)
- P5-11: Normalise `disaster_event` repeated column groups → child tables (five groups of 5 → five junction tables)
- P5B-1: Stable API URLs — `/api/v1/` aliases that don't carry the language prefix
- P5-2/P5-3: MCP endpoint evolution + AI classification worker (if the roadmap calls for it)

**Deliverable:** All business logic lives in `core/`. Routes are thin. Domain concepts are not in `frontend/`. Architecture is enforceable by the two ESLint rules from Phase 0.

---

### Summary Timeline

```
                Week  1    5   10   15   20   25   30   35
                     ├────┼────┼────┼────┼────┼────┼────┤
Pre-0 Triage    ████
Phase 0 (3w)        ████████
Phase 1 (10w)           ████████████████████████
Phase 2 (4w)                            ████████
Phase 3 (8w)                                ████████████████
Phase 4 (4w)                                              ████████
Phase 5 (8w)                                              ────────────────
                                                         (starts after P4)
                Total: 37 weeks ≈ 9 months (best case: 29 weeks ≈ 7 months)
```

| Phase | Weeks | Items | Key Deliverable                                                     |
| ----- | ----- | ----- | ------------------------------------------------------------------- |
| Pre-0 | 1     | —     | TRIAGE.md: every P0 item has root cause + fix complexity            |
| 0     | 3     | ~35   | Zero live security bugs. CI/CD gate running. DPG compliant.         |
| 1     | 8–10  | ~50   | No N+1. Single data access pattern. TenantContext. ApprovalService. |
| 2     | 3–4   | 12    | Security hardened. E2E vs production build. Storage abstracted.     |
| 3     | 6–8   | 22    | RLS enforced. CASCADE chains correct. Dates properly typed.         |
| 4     | 3–4   | 4     | Multi-node capable. Redis sessions. Read replica.                   |
| 5     | 6–8   | ~22   | Clean module boundaries. DDD structure. `event.ts` gone.            |

---

## 8. Risk Register

| Risk                                                                  | Severity | Phase | Mitigation                                                                                                                                                                                   |
| --------------------------------------------------------------------- | -------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RLS RESTRICTIVE mode silently returns empty results on missed context | Critical | P3    | PERMISSIVE-first with 2-week monitoring window; Reviewer Agent checks every query path for tenant context; never skip the monitoring sprint                                                  |
| Schema migration corrupts live data                                   | Critical | P3    | Three-PR pattern mandatory; Migration Validator Agent on every script; test on anonymised prod copy; backup before every Phase 3 deploy                                                      |
| Dev branch divergence expands scope                                   | High     | Pre-0 | Bug Triage Agent runs against actual dev branch before Phase 0 sprint planning; treat all estimates as subject to revision after triage                                                      |
| Phase 3 takes longer than 8 weeks (schema migrations always do)       | High     | P3    | Phase 4 and 5 can start in parallel once the non-migration items of Phase 3 are done; keep schedule dependency explicit                                                                      |
| Architectural drift in Phase 5 — new PRs bypass new structure         | Medium   | P5    | The two ESLint rules from Phase 0 make bypassing the structure a CI failure; architectural fitness is automated not aspirational                                                             |
| 1–2 dev bandwidth bottleneck                                          | High     | All   | Agent 4 handles mechanical implementation. Human time goes to Gates 1–3 only. Task scope discipline (< 150 lines, < 5 files) keeps agent loops tight and predictable.                        |
| AI agent introduces subtle regressions                                | Medium   | All   | TypeScript compiler + test suite are ground truth. Agent 5 catches pattern violations. Agent 4 cannot merge — human approves every PR.                                                       |
| File upload migration (P2-05) disrupts active uploads                 | Medium   | P2    | StorageProvider interface abstracts backend; deploy with LocalStorage provider first, migrate files in background, switch to S3 provider — same three-PR principle applied to infrastructure |

---

## 9. Definition of Done

### Phase-Level Gate (before declaring a phase complete)

1. All CI checks pass: TypeScript, lint (including architectural rules), Vitest, coverage thresholds
2. All E2E tests pass against production build (from Phase 2 onward)
3. Reviewer Agent verdict is APPROVE or WARN (no BLOCK items outstanding)
4. Every new use case has an OpenSpec YAML committed to `specs/`
5. `CLAUDE.md` updated to reflect current architectural state
6. `CHANGELOG.md` updated with all changes in the phase
7. For Phase 3 items only: Migration Validator Agent sign-off + backup confirmed before production deploy

### Coverage Ratchet (targets increase each phase)

| Module                     | After P0 | After P1 | After P2 | After P3+ |
| -------------------------- | -------- | -------- | -------- | --------- |
| `session.ts`               | 40%      | 70%      | 100%     | 100%      |
| `auth.ts`                  | 40%      | 70%      | 100%     | 100%      |
| `disaster_record.ts`       | 30%      | 60%      | 80%      | 95%       |
| `event.ts` (or successors) | 30%      | 60%      | 80%      | 90%       |
| Analytics models           | 0%       | 30%      | 50%      | 75%       |
| New code in `core/`        | —        | —        | —        | 85%+      |

Coverage is a ratchet — thresholds only move up, enforced in `vitest.config.ts`. A PR that reduces coverage below the current threshold fails CI.

### Mutation Testing (security-critical modules only)

Stryker JS runs on `session.ts`, `auth.ts`, and the `TenantContext` factory after Phase 2. Target: > 80% mutation score. This ensures the tests actually catch the bugs they claim to test, not just execute the code.

---

## 10. Appendix — OpenSpec Template

```yaml
# specs/[phase]/[item-id]-[use-case-name].spec.yaml
name: "" # PascalCase use case name
context: "" # Bounded context and phase
version: "1.0"
phase: "" # Phase where this is implemented
author: ""
date: ""

description: |
  One or two sentences describing what this use case does.

inputs:
  - name: ""
    type: "" # TypeScript type
    required: true | false
    confidence: stated | inferred # inferred = human must verify
    constraints: []

preconditions:
  - text: ""
    confidence: stated | inferred

postconditions:
  - text: ""
    confidence: stated | inferred

invariants:
  - text: "" # Must always remain true

failure_modes:
  - code: "" # ERR_* style error code
    condition: ""
    http_status: 400 | 403 | 404 | 409 | 422 | 500

domain_events:
  - "" # Events emitted on success (if any)

security_notes: |
  Tenant isolation: [how countryAccountsId is enforced]
  Auth required: [yes/no + which permission]
  Role restrictions: [if any]

migration_notes: |
  If schema changes: which tables, three-PR steps, data migration needed.

test_coverage_target: "" # e.g., "85% line coverage, all failure modes tested"
```

---

_DELTA Resilience Refactoring Proposal — Cross-analysis of independent review + 13-layer internal audit_
_Next update: after Bug Triage Agent run on dev branch confirms or revises P0 scope_
