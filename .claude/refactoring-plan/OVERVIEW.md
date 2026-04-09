# DELTA Refactoring Plan — Overview

> This document contains guiding principles, execution rationale, phase roadmap, coverage targets, and git/CI strategy.
> For individual item details, see the phase files. For status tracking, see [`INDEX.md`](INDEX.md).

---

## Phase Roadmap

| Phase | File | Items | Focus |
|---|---|---|---|
| 0 | [`phases/phase-0-critical.md`](phases/phase-0-critical.md) | 28 | Critical Fixes |
| 1 | [`phases/phase-1-structural.md`](phases/phase-1-structural.md) | 48 | Structural Improvements |
| 2 | [`phases/phase-2-quality.md`](phases/phase-2-quality.md) | 12 | Security & Quality Hardening |
| 3 | [`phases/phase-3-schema.md`](phases/phase-3-schema.md) | 15 | Schema Migrations & DB Integrity |
| 4 | [`phases/phase-4-infra.md`](phases/phase-4-infra.md) | 3 | Infrastructure & High Availability |
| 5 | [`phases/phase-5-architecture.md`](phases/phase-5-architecture.md) | 17 | Module Boundaries, AI/MCP & Interoperability |

**Total items:** 123

---

# DELTA Resilience — Refactoring Plan

**Created:** 2026-04-02
**Based on:** Architectural audit (15 issues) + Macro architecture assessment + UUID cascade audit + Interoperability audit
**Methodology:** Spec-First (OpenAPI 3.1) → TDD (Red → Green → Refactor) → Strangler Fig deployment
**Tracking:** Each issue links to its source file with line numbers. Update status as work progresses.

---

## Guiding Principles

1. **Spec before code** — For every API-facing change, write the OpenAPI 3.1 spec in `_docs/api-specs/` first. The spec is the contract. No implementation begins until the spec is reviewed.
2. **Red before green** — Every fix starts with a failing test committed under `test(red):` prefix. Implementation follows under `fix:` or `feat:`. Refactor under `refactor:`.
3. **Never a Big Bang** — Each phase must be independently deployable and rollbackable. Every schema change uses a Strangler Fig (additive column first, backfill, cut over, drop old).
4. **Batch same-table migrations** — Issues touching the same DB table (e.g., `api_key`) are grouped into one migration to avoid multiple ALTER TABLE passes.

---

## Execution Order Rationale

The phases are ordered by:
- **Dependency chain** — later phases often depend on earlier ones (e.g., Redis must exist before session writes move off the DB)
- **Risk reduction first** — zero-risk fixes ship immediately to reduce attack surface while heavier work is in progress
- **Batch related schema changes** — P2 groups all `api_key` table changes into one migration
- **Infrastructure before application code** — adding a read replica before routing analytics to it

---

## Phase 0 — Immediate Fixes (Zero Risk, Zero Breaking Change)

> Can be done in parallel by different developers. No OpenAPI spec needed. Each is a single commit.

---

## Phase 1 — Performance Quick Wins

> No schema changes. Targeted code changes. Each is independently deployable. TDD required.

---

## Phase 2 — Security Hardening

> P2-3 and P2-4 touch the same `api_key` table — execute as a single migration.

---

## Phase 3 — Schema Migrations

> Breaking or multi-step changes. Full OpenAPI spec required for any API-facing change.

---

## Phase 4 — Infrastructure & High Availability

---

## Phase 5 — Module Boundaries + AI/MCP Evolution

> Long-term structural work. Not urgent for correctness or security.

---

## Phase 3C — Schema Integrity (Layer 6 findings)

> Schema-level fixes identified during Layer 6 audit. All involve DB migrations. Group by table where possible to minimise ALTER TABLE passes.

---

## Phase 0 additions — Layer 7 (immediate, zero-risk)

---

## Phase 1 additions — Layer 7

---

## Phase 0 additions — Layer 8

---

## Phase 1 additions — Layer 8

---

## Phase 2 additions — Layer 8

---

## Phase 0 additions — Layer 9

---

## Phase 1 additions — Layer 9

---

## Phase 3 additions — Layer 9

---

## Phase 0 additions — Layer 10

---

## Phase 1 additions — Layer 10

---

## Phase 1 additions — Layer 11

---

## Phase 2 additions — Layer 10

---

## Phase 2 additions — Layer 11

---

## Phase 0 additions — Layer 12

---

## Phase 1 additions — Layer 12

---

## What does this PR do?

## Checklist
- [ ] `yarn tsc` passes
- [ ] `yarn test:run2` passes (or explain why tests are not applicable)
- [ ] I have updated `_docs/` or confirmed no documentation change is needed
- [ ] This PR does not introduce new environment variables without updating `example.env`
- [ ] Security-sensitive changes have been reviewed against OWASP Top 10
```

`CODEOWNERS` — assign UNDRR team reviewers to: `app/utils/auth.ts`, `app/utils/session.ts`, `app/drizzle/schema/`, `_docs/License/`.

**Measure:** New issues use templates. New PRs show the checklist. PRs touching auth or schema files auto-request review from designated owners.

---

## Phase 2 additions — Layer 12

---

## Coverage Targets (Ratchet per Phase)

| Module | P0 baseline | P2 target | P4 target | Final target |
|--------|-------------|-----------|-----------|-------------|
| `app/utils/session.ts` | measure | 70% | 90% | **100%** |
| `app/utils/auth.ts` | measure | 70% | 90% | **100%** |
| `app/backend.server/models/disaster_record.ts` | measure | 60% | 80% | **95%** |
| `app/backend.server/models/human_effects.ts` | measure | 60% | 80% | **90%** |
| `app/backend.server/models/common.ts` | measure | 80% | 90% | **90%** |
| All other `app/backend.server/models/**` | measure | 50% | 70% | **85%** |
| All other `app/**` | measure | 40% | 60% | **80%** |

---

## Mutation Testing Targets (after coverage thresholds are met)

Run Stryker JS on security-critical modules:
- `app/utils/session.ts` — mutation score target: **> 80%**
- `app/utils/auth.ts` — mutation score target: **> 80%**

Command (add to `package.json`):
```bash
yarn stryker run --files app/utils/session.ts app/utils/auth.ts
```

---

## OpenAPI Spec Registry

All specs live in `_docs/api-specs/`. Linted by Spectral in CI.

| Spec file | Covers | Phase |
|-----------|--------|-------|
| `api-keys-v2.yaml` | API key CRUD (hashed secrets, assignedToUserId) | P2-3/P2-4 |
| `geography-import-v2.yaml` | Async geography import + job status | P3-3 |
| `disaster-records-v2.yaml` | Date field schema change | P3-1 |
| `system.yaml` | `/health` endpoint | P4-1 |
| `mcp-v2.yaml` | MCP prompts + resources | P5-2 |
| `ai-workflows.yaml` | AI classification worker contracts | P5-3 |

Spectral ruleset (`_docs/api-specs/.spectral.yaml`) must enforce:
- Every write endpoint documents `countryAccountsId` as required
- Every list endpoint documents pagination params
- All 4xx responses are documented

---

---

## Git Strategy

### Branch Model — GitHub Flow on `dev`, release via `dev → main`

```
main          ← production-ready, protected, release-only merges
  └── dev     ← integration branch, all PRs target here
        ├── fix/p0-2-delete-by-id-await
        ├── feat/p1-1-db-connection-pool
        ├── migration/p2-3a-api-key-secret-hash-additive
        ├── migration/p2-3b-api-key-secret-hash-cutover
        └── migration/p2-3c-api-key-secret-drop-legacy
```

**Why GitHub Flow and not GitFlow:** The team is small, releases are continuous, and the Strangler Fig pattern already manages safe incremental delivery. GitFlow's `release` and `hotfix` branches add coordination overhead without benefit at this team size.

### Branch Naming Convention

```
<type>/p<phase>-<id>-<short-description>
```

| Type | When to use |
|------|-------------|
| `fix/` | Bug fixes (e.g., missing await, wrong env var) |
| `feat/` | New behaviour (pool config, rate limiting, health endpoint) |
| `migration/` | DB schema changes — always split into `a` (additive), `b` (cutover), `c` (drop) |
| `test/` | Test-only commits — used for the `test(red):` TDD step |
| `chore/` | Config, deps, infra, CI (no app logic change) |
| `refactor/` | Internal restructure with no behaviour change |
| `docs/` | OpenAPI specs, `_docs/` updates |

Examples:
```
chore/p0-1-dockerfile-node-env
fix/p0-2-delete-by-id-await
feat/p1-1-db-connection-pool
migration/p2-3a-api-key-hash-additive-columns
migration/p2-3b-api-key-hash-cutover
migration/p2-3c-api-key-hash-drop-secret
feat/p3-2a-rls-permissive-mode
feat/p3-2b-rls-restrictive-mode
feat/p4-3-uuid-v7-primary-keys
feat/p5-1-outbound-webhook-engine
```

### Commit Message Convention — Conventional Commits

```
<type>(<scope>): <subject>

[optional body]

Refs: #<plan-id>
```

**Type vocabulary:**

| Type | Use for |
|------|---------|
| `fix` | Bug fix |
| `feat` | New feature or behaviour |
| `perf` | Performance improvement (no behaviour change) |
| `refactor` | Internal restructure |
| `test` | Test additions or changes |
| `chore` | Config, deps, CI, tooling |
| `docs` | Documentation, OpenAPI specs |
| `migration` | Database migration scripts |

**TDD commit sequence** (mandatory for all Phase 1+ work):
```
test(scope): [red] <description of failing test>    ← committed first, CI expected to fail
fix(scope): [green] <description of implementation> ← makes the test pass
refactor(scope): <description of cleanup>           ← optional, only if needed
```

Examples:
```
chore(docker): set NODE_ENV=production in Dockerfile.app
Refs: #P0-1

test(models): [red] assert deleteByIdForNumberId throws for missing record
Refs: #P0-2

fix(models): [green] add await to deleteById existence checks in common.ts
Refs: #P0-2

perf(session): skip lastActiveAt DB write within activity threshold window
Refs: #P1-2

migration(api-key): [a] add secret_hash and assigned_to_user_id columns
Refs: #P2-3
```

### PR Rules

1. **One PR per plan item.** Never bundle unrelated issues.
2. **Schema migrations are always 3 PRs** — `[a]` additive, `[b]` cutover, `[c]` drop. The `[a]` PR must be deployed and validated before `[b]` is merged.
3. **The `test(red):` commit must be in the PR** — a fix without its failing test precursor will not be reviewed.
4. **OpenAPI spec PR must be merged before the implementation PR** for any API-facing change.
5. **Auth, session, and tenant-isolation changes require a second reviewer** regardless of team size.

### CI Gates (required before merge to `dev`)

```
yarn tsc              ← zero TypeScript errors
yarn format:check     ← Prettier compliance
yarn lint             ← zero no-console violations
yarn test:run2        ← unit + integration tests pass
yarn test:run3        ← real-DB integration tests pass (for migration PRs)
yarn coverage         ← coverage must not drop below established thresholds
```

Spectral lint on any modified `_docs/api-specs/*.yaml` file.

---

## Phase 3B — UUID Cascade Architecture Upgrades

> New issues identified by the UUID cascade audit. Inserted between Phase 3 and Phase 4.

---

## Phase 5B — Interoperability

> New phase added based on interoperability audit. Runs in parallel with Phase 5.

---

