## Context

The notices domain application layer follows Clean Architecture: use cases depend only on
port interfaces (`INoticeRepository`, `ILogger`) and never on concrete adapters. Two use
cases already exist (`CreateNoticeUseCase`, `ListNoticesUseCase`) and establish the
patterns this change must follow.

`INoticeRepository.findById(id: string, tenantId: string): Promise<Notice>` is already
declared. The repository contract states it throws `NotFoundError` (from
`app/shared/errors/DomainError.ts`) when no notice exists for the given `id + tenantId`
pair. This means tenant scoping is enforced at the repository level; the use case adds a
second defence-in-depth check on the returned entity's `tenantId` field.

`DomainError` hierarchy (confirmed by reading `app/shared/errors/DomainError.ts`):

```
DomainError (abstract)
  NotFoundError        code="NOT_FOUND",        statusHint=404
  ValidationError      code="VALIDATION_ERROR", statusHint=422
  AuthorizationError   code="FORBIDDEN",        statusHint=403
  ConflictError        code="CONFLICT",         statusHint=409
```

`NotFoundError` constructor: `constructor(entity: string, id: string)` — sets
`message = "${entity} not found"` and `context = { entity, id }`.

## Goals / Non-Goals

**Goals:**
- Add `GetNoticeByIdUseCase` that maps cleanly onto the existing two use cases.
- Define `GetNoticeByIdQuery { id: string; tenantId: string }` — no `locale` field.
- Define `NoticeNotFoundError` as a subclass of `NotFoundError`.
- Emit `logger.info({ msg: "notice.fetched", noticeId, tenantId })` on success only.
- Return `NoticeDto` (full `LocaleMap` preserved; locale resolution is the caller's job).

**Non-Goals:**
- Locale resolution — the presentation layer (Remix route, future REST controller) owns
  that. See Decision 1 below.
- DB migration — no schema changes.
- Modifying `INoticeRepository` — the `findById` signature is already correct.
- Modifying `NoticeDto` or `toNoticeDto` — these are reused unchanged.

## Decisions

### Decision 1 — No `locale` in `GetNoticeByIdQuery`

`locale` MUST NOT appear in `GetNoticeByIdQuery`. The use case returns the full
`LocaleMap` in `NoticeDto`; the presentation layer resolves a single locale string from
the map using the `$lang` URL segment it already holds.

Adding `locale` to the query would create a false contract implying the use case performs
locale resolution, which it does not. This was settled in Phase 4e
(`list-notices-use-case`, `design.md` Decision 1) and is not re-opened here.

### Decision 2 — `NoticeNotFoundError` subclasses `NotFoundError`, not `DomainError`

`NotFoundError` already carries the correct `code = "NOT_FOUND"` and
`statusHint = 404`. `NoticeNotFoundError` extends it with `entity = "Notice"` baked
in, so callers can do `instanceof NoticeNotFoundError` for notice-specific handling
while presentation-layer error boundaries that catch `NotFoundError` still work.

Constructor: `constructor(id: string)` — delegates to `super("Notice", id)`.

```typescript
export class NoticeNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("Notice", id);
  }
}
```

Alternative considered: subclass `DomainError` directly and re-declare `code` and
`statusHint`. Rejected — this duplicates constants already in `NotFoundError` and
breaks the `instanceof NotFoundError` check used by shared error boundaries.

### Decision 3 — Repository throws `NotFoundError`; use case re-throws as `NoticeNotFoundError`

`INoticeRepository.findById` is documented to throw `NotFoundError` (not null) when no
record exists. The use case MUST catch `NotFoundError` from the repository and re-throw
as `NoticeNotFoundError`. This preserves the use-case's responsibility to expose its own
domain error type rather than leaking the repository's error type to callers.

After a successful `findById` call, the use case performs a defence-in-depth tenant check:
if the returned notice's `tenantId` does not match `query.tenantId`, it throws
`NoticeNotFoundError` without logging. This guards against a misconfigured or future
repository adapter that fails to scope by tenant.

Alternative considered: propagate `NotFoundError` unmodified from the repository.
Rejected — callers should not need to know which `NotFoundError` subclass to import;
`NoticeNotFoundError` is the correct boundary type for this use case.

### Decision 4 — No try/catch for non-`NotFoundError` failures

If `findById` rejects with anything other than `NotFoundError` (e.g., a DB connection
error), the error propagates unmodified. The use case MUST NOT wrap unknown errors — the
composition root or framework-level handler is responsible for those.

### Decision 5 — Collocate `NoticeNotFoundError` in `GetNoticeById.ts`

`NoticeNotFoundError` is defined and exported from `GetNoticeById.ts` rather than from a
separate errors file. Rationale: it is a use-case-specific type introduced alongside
the use case. If a second use case later needs it, move it to a shared notices errors
file at that point (YAGNI). This matches the pattern used by `CreateNotice.ts` which
exports `CreateNoticeCommand` from the same file.

## Risks / Trade-offs

[Risk: Repository's `findById` signature already accepts `tenantId`; tenant check in use
case is defensive overhead] → Mitigation: The tenant check costs O(1) and prevents silent
data leaks if a repository adapter is ever incorrectly implemented. The defence-in-depth
cost is negligible.

[Risk: `NotFoundError` catch in the use case could accidentally swallow a `NotFoundError`
thrown by a sub-call inside a future composite use case] → Mitigation: `findById` is the
only call in this use case. The catch is tightly scoped immediately after the `findById`
await; there are no further awaitable calls before it.

[Risk: `NoticeNotFoundError` collocated in `GetNoticeById.ts` creates an awkward import
path for future use cases] → Mitigation: Document the export location clearly. If a
second use case needs `NoticeNotFoundError`, extract it to
`app/domains/notices/application/errors/NoticeErrors.ts` at that point.

## TypeScript Types Introduced

```typescript
// In app/domains/notices/application/use-cases/GetNoticeById.ts

export interface GetNoticeByIdQuery {
  id: string;
  tenantId: string;
}

export class NoticeNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("Notice", id);
  }
}

export class GetNoticeByIdUseCase {
  constructor(
    private readonly logger: ILogger,
    private readonly noticeRepository: INoticeRepository,
  ) {}

  async execute(query: GetNoticeByIdQuery): Promise<NoticeDto> { ... }
}
```

## Test Infrastructure

Unit tests only. The repository is mocked using a plain object that satisfies
`INoticeRepository`. No PGlite, no real DB, no `import "./setup"`.

Test file: `app/domains/notices/application/use-cases/GetNoticeById.test.ts`

Run with: `yarn vitest run app/domains/notices/application/use-cases/GetNoticeById.test.ts`

## Form-CSV-API Pipeline Impact

None. `GetNoticeByIdUseCase` is a read-only use case with no fieldsDef involvement.
