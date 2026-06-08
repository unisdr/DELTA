## Context

The existing codebase uses ad-hoc error handling — some routes return HTTP status codes directly,
some throw raw `Error`, some return `null`. There is no shared error vocabulary. ADR-003 mandates
a typed domain error hierarchy as Layer 1 of the Clean Architecture error strategy, so that
all future domain implementations speak the same error language and the presentation layer can
map errors generically.

The `app/shared/errors/` directory was created during Phase 2a scaffolding and contains only a
`.gitkeep` placeholder. This change populates it with two source files.

## Goals / Non-Goals

**Goals:**

- Implement the `DomainError` abstract base class and four concrete types exactly as specified
  in ADR-003 (same class names, same `code` values, same `statusHint` values, same constructor
  signatures).
- Provide a barrel `index.ts` so all consumers import from `~/shared/errors`.
- Cover every class with unit tests asserting `code`, `statusHint`, `message`, `name`, and
  `context` fields.

**Non-Goals:**

- No presentation-layer error mapping (that is ADR-003 Layer 4 — future work).
- No `ErrorBoundary` components (per-domain, future work).
- No NestJS `GlobalExceptionFilter` (not yet adopted in DELTA's architecture).
- No `traceId` / AsyncLocalStorage wiring (ADR-004 — separate change).
- No `isDrizzleUniqueViolation` helper (infrastructure layer — separate change).
- No changes to existing `app/backend.server/` or `app/routes/` files.

## Decisions

### Decision 1 — Implement verbatim from ADR-003

**Choice**: Copy the class signatures exactly as they appear in ADR-003, with no deviation.

**Rationale**: The ADR was written as the design; deviating creates drift between the decision
record and the implementation. Future agents and humans will verify the implementation against
the ADR — exact match eliminates ambiguity.

**Alternative considered**: Add a `toResponse()` method on the base class to serialise to the
`ErrorResponse` envelope. Rejected — that introduces a presentation concern into the domain
layer, violating ADR-003's explicit separation. Serialisation belongs at Layer 4.

### Decision 2 — `code` and `statusHint` as `readonly` class fields, not interface

**Choice**: Declare `code` and `statusHint` as `abstract readonly` on `DomainError` and as
concrete `readonly` field initialisers on each subclass.

**Rationale**: TypeScript enforces that every subclass must declare both fields. Using an
interface would be optional; using `abstract readonly` makes omission a compile error.
This matches the ADR-003 code snippet exactly.

**Alternative considered**: A `DomainErrorCodes` enum mapping codes to status hints. Rejected —
adds coupling between types that have independent lifecycles; the ADR does not require it.

### Decision 3 — `context?: Record<string, unknown>` on the base class, not per subclass

**Choice**: The `context` parameter is on `DomainError`'s constructor, not overridden per type.

**Rationale**: Every error type MAY carry structured context (entity name, field names, IDs).
Centralising it on the base class avoids repetitive constructor signatures in subclasses while
still allowing each subclass to populate it meaningfully (e.g. `NotFoundError` populates
`{ entity, id }`).

### Decision 4 — `this.name = this.constructor.name` in the base constructor

**Choice**: Set `this.name` in `DomainError`'s constructor to the runtime class name.

**Rationale**: Node.js `Error` sets `name` to `"Error"` by default. Without this fix,
`err.name` would be `"Error"` for all subclasses, making `instanceof`-free duck-typing
unreliable and error logging confusing. This is the standard TypeScript pattern for
custom `Error` subclasses.

### Decision 5 — No `.server.ts` suffix

**Choice**: Files are named `DomainError.ts` and `index.ts`, not `DomainError.server.ts`.

**Rationale**: Domain error classes carry no server-only imports (no Drizzle, no Node.js
built-ins beyond `Error`). They are safe to import in both server and client contexts. Forcing
a `.server.ts` suffix would break any future client-side code that needs to `instanceof`-check
a domain error (e.g. in an error boundary receiving a serialised error object).

### Decision 6 — Unit tests live in `tests/unit/shared/errors/`

**Choice**: Test file at `tests/unit/shared/errors/DomainError.test.ts`.

**Rationale**: No DB, no PGlite, no network. These are pure TypeScript value types. Unit tier
is correct; using PGlite integration infrastructure would add unnecessary setup overhead.

## Risks / Trade-offs

- [Risk] A future engineer adds serialisation or HTTP logic to `DomainError` directly.
  → Mitigation: The ADR explicitly forbids it; the design doc and spec both call this out.
  The domain layer has no `Response` or `Request` import — any such import would be caught
  by code review.

- [Risk] `ValidationError` has no structured `fields` array for per-field validation details.
  → Mitigation: ADR-003 passes `context?: Record<string, unknown>` which is sufficient for
  field-level details. A typed `fields` property can be added to `ValidationError` in a
  future change without breaking the interface.

- [Risk] `instanceof` checks across ESM module boundaries can fail if the module is loaded
  twice (e.g. in certain bundler configurations).
  → Mitigation: DELTA uses a single server bundle via Vite/React Router. Cross-boundary
  `instanceof` issues are not present in this architecture. If this becomes a concern, a
  `isDomainError(err): err is DomainError` type guard can be added later.

## TypeScript types introduced

| Name | Kind | Location | Description |
|---|---|---|---|
| `DomainError` | `abstract class` | `app/shared/errors/DomainError.ts` | Base for all operational domain errors |
| `NotFoundError` | `class extends DomainError` | same file | Entity not found; `code = 'NOT_FOUND'`, `statusHint = 404` |
| `ValidationError` | `class extends DomainError` | same file | Input validation failure; `code = 'VALIDATION_ERROR'`, `statusHint = 422` |
| `AuthorizationError` | `class extends DomainError` | same file | Insufficient permission; `code = 'FORBIDDEN'`, `statusHint = 403` |
| `ConflictError` | `class extends DomainError` | same file | State conflict (e.g. duplicate); `code = 'CONFLICT'`, `statusHint = 409` |

All five are re-exported from `app/shared/errors/index.ts`.

## Test infrastructure

Unit tests only. No PGlite, no real DB. Test file:
`tests/unit/shared/errors/DomainError.test.ts`

No setup import is needed (no DB context). Run with:
```
yarn vitest run tests/unit/shared/errors/DomainError.test.ts
```

## Form-CSV-API pipeline impact

None. This change introduces pure TypeScript classes with no Drizzle schema, no `fieldsDef`,
and no model layer involvement.
