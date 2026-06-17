## Context

The Notices domain was scaffolded in Phase 4a: the Drizzle schema
(`app/drizzle/schema/noticesTable.ts`) and a database migration exist, but every
subdirectory under `app/domains/notices/` contains only a `.gitkeep`. Clean
Architecture requires a domain entity that carries business rules and a repository
port interface that decouples the application layer from Drizzle.

The project already has a shared error vocabulary in `app/shared/errors/DomainError.ts`
with `ValidationError` (code `VALIDATION_ERROR`, statusHint 422). A shared logging port
(`ILogger`) lives in `app/shared/logging/`. No `Pagination` type exists in the domain or
shared layers — only a Remix-layer `PaginationParams` interface in
`app/frontend/pagination/api.server.ts`, which is unsuitable for domain use.

## Goals / Non-Goals

**Goals:**

- Define `Notice` as a domain entity with a private constructor and a static `create()`
  factory that enforces business invariants at construction time.
- Define `INoticeRepository` as a TypeScript interface (port) that declares the
  persistence contract without any Drizzle or framework import.
- Define a `Pagination` value-object type in `app/shared/types/` so that repository
  ports across the entire domain layer can reference it without duplicating the
  definition.
- Write unit tests for `Notice.create()` that run as part of `yarn test:run2` with no DB
  dependency.

**Non-Goals:**

- Implementing `DrizzleNoticeRepository` (Phase 4g).
- Writing any use-case (Phase 4d+).
- Modifying the Drizzle schema or running a DB migration.
- Integrating with the Form-CSV-API pipeline.
- Adding any route, handler, or auth wrapper.

## Decisions

### Decision 1 — Private constructor + static `create()` factory

**Choice:** `Notice` has a `private constructor` and a `static create(props)` method.

**Rationale:** A private constructor guarantees that every `Notice` instance has passed
the business-rule checks. It is impossible to construct an invalid entity by accident —
the type system enforces it. This is the canonical Clean Architecture / DDD pattern for
domain entities with invariants.

**Alternative considered:** A plain class with a public constructor and a separate
`validate()` function. Rejected because callers can skip `validate()`, making invalid
instances possible at runtime.

### Decision 2 — `Notice` mirrors `noticesTable` columns exactly

**TypeScript types defined in `Notice.ts`:**

```typescript
export type LocaleMap = Record<string, string>; // e.g. { en: "Title", fr: "Titre" }
export type Audience = "public" | "private" | "all";

export interface NoticeProps {
  id: string;
  tenantId: string;          // maps to countryAccountsId
  titleJson: LocaleMap;
  bodyJson: LocaleMap | null;
  isPublished: boolean;
  audience: Audience;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

The field `tenantId` is named after its semantic meaning inside the domain layer; the
Drizzle column is `country_accounts_id`. The adapter (Phase 4g) is responsible for the
mapping.

**Rationale:** Using a clean domain name (`tenantId`) avoids leaking the legacy column
name (`countryAccountsId`) into domain code. The `audience` enum is defined inline as a
string union — no Drizzle import needed.

### Decision 3 — Validation rules enforced by `Notice.create()`

Two invariants are enforced:

1. `titleJson` MUST have at least one key whose trimmed value is non-empty. An empty
   object `{}` or an object where all values are whitespace-only violates this.
2. `publishedAt` MUST be `null` when `isPublished` is `false`. A non-null `publishedAt`
   on an unpublished notice is a data-integrity violation.

Both violations throw `ValidationError` from `app/shared/errors/`.

**Rationale:** These are the two invariants visible in the schema comments and in the
roadmap spec. Additional invariants (e.g. audience validation) are deferred — the `create()`
factory is the single place to add them later without changing any call-site.

### Decision 4 — `Pagination` lives in `app/shared/types/`

**New file:** `app/shared/types/Pagination.ts`

```typescript
export interface Pagination {
  page: number;     // 1-based page number
  pageSize: number; // maximum items per page
}
```

**Rationale:** `INoticeRepository.findAll` needs a pagination parameter. No equivalent
type exists in the domain or shared layers today. Placing it in `app/shared/types/`
matches the existing pattern (`app/shared/errors/`, `app/shared/logging/`) and makes it
available to future domain ports without duplicating the definition.

**Alternative considered:** Inline the type in `INoticeRepository.ts`. Rejected because
other future repositories (users, organisations, events) will need the same shape.

### Decision 5 — `INoticeRepository` method signatures

```typescript
import type { Notice } from "../../domain/Notice";
import type { Pagination } from "~/shared/types";

export interface INoticeRepository {
  findById(id: string, tenantId: string): Promise<Notice>;
  findAll(tenantId: string, pagination: Pagination): Promise<Notice[]>;
  save(notice: Notice): Promise<Notice>;
  delete(id: string, tenantId: string): Promise<void>;
}
```

`findById` throws `NotFoundError` (from `app/shared/errors/`) when the notice does not
exist — this is the repository contract. Callers should not check for `null`; they catch
`NotFoundError` instead.

**Rationale:** This matches the ADR-003 pattern already in use (`NotFoundError`). The
Drizzle adapter (Phase 4g) implements this throw.

### Decision 6 — Test infrastructure

Tests for `Notice.create()` are pure unit tests: they import only
`app/domains/notices/domain/Notice.ts` and `app/shared/errors/`. No PGlite setup, no
`import "./setup"`, no `createTestBackendContext()`.

Test file location: `app/domains/notices/domain/Notice.test.ts` — co-located with the
entity, which is the standard for framework-free unit tests that have no DB dependency.
These are picked up by `yarn test:run2` via the Vitest config glob.

**Rationale:** Co-locating pure unit tests with their subject is consistent with other
unit tests in the codebase (e.g. utility tests). Integration tests (PGlite) are reserved
for code that touches the database.

## Risks / Trade-offs

- **[Non-risk] `Notice.create()` is called from the Drizzle adapter to hydrate entities
  from DB rows.** `titleJson` is `NOT NULL` in the database (enforced by migration
  `20260617160000_notices_title_json_not_null`), so the adapter will never receive a null
  `titleJson`. The `publishedAt`/`isPublished` invariant is enforced only at the
  application layer — a row with `publishedAt` set and `isPublished = false` could
  theoretically exist if data was written directly to the DB bypassing the domain layer.
  Mitigation: all writes go through `Notice.create()` and then the repository; direct DB
  writes are an operational concern, not a code concern.

- **[Risk] `LocaleMap` is typed as `Record<string, string>` rather than a branded type.**
  This means any `Record<string, string>` satisfies the type. Mitigation: the business
  rule (at least one non-empty entry) is enforced at construction time by `create()`, not
  by the TypeScript type. A branded type can be introduced in a later refactor if needed.

- **[Trade-off] `tenantId` vs `countryAccountsId` naming.** Using `tenantId` in the
  domain entity and mapping it in the adapter adds a thin translation layer. The benefit
  (clean domain language) outweighs the cost (one field mapping in Phase 4g).

## Migration Plan

No DB migration required. The `notices` table was created in Phase 4a.

Files created by this change are net-new with one exception: `vitest.config.ts` was
modified to add the `app/domains/**/*.test.{ts,tsx}` include glob so that co-located
domain unit tests are discovered by `yarn test:run2`. Deployment is safe to roll back
by reverting the branch.

## Open Questions

- Should `Notice.create()` also validate `audience` against the enum values? The schema
  uses a PostgreSQL `text` constraint, so the DB will reject invalid values anyway. For
  now, the invariant is deferred (TypeScript's string union provides compile-time safety).
  Revisit when use-cases are written in Phase 4d+.
