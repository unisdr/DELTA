## Context

The application layer (use cases) in DELTA's Clean Architecture migration needs to emit
structured log events. The existing logging utilities (`app/utils/logger.ts` and
`app/utils/logger.server.ts`) are infrastructure-level — they couple directly to Winston
and console wrappers, so they cannot be declared as use-case dependencies without violating
the Dependency Inversion Principle.

ADR-004 specifies an `ILogger` port interface living in `app/shared/` — shared
infrastructure available to both the domain and application layers. The Pino adapter (future
infrastructure concern) will implement this interface; use cases receive it via constructor
injection. Tests inject `NoOpLogger` so they remain silent and do not pull in any logging
framework.

Current state of `app/shared/logging/`: directory exists with only a `.gitkeep` placeholder
(created in Phase 2a scaffold). No `ILogger` or `NoOpLogger` files exist.

## Goals / Non-Goals

**Goals:**

- Define `ILogger` interface with exactly four methods matching ADR-004: `info`, `warn`,
  `error`, `debug` — each accepting `Record<string, unknown>`, returning `void`.
- Provide `NoOpLogger` as the canonical test double that silently satisfies `ILogger`.
- Export both from a barrel `app/shared/logging/index.ts` so callers import from
  `~/shared/logging`, not from deep paths.
- Remove the `.gitkeep` placeholder.
- Pass `yarn tsc` with zero TypeScript errors.

**Non-Goals:**

- Implementing the Pino adapter — that is a future infrastructure task.
- Wiring `ILogger` into any existing use case — that happens per-use-case as the pilot
  domain is built out.
- AsyncLocalStorage request context (`RequestContext`) — ADR-004 Phase 2; out of scope here.
- ESLint `no-console` enforcement — a CI configuration task, not a typing task.
- Any DB migration, route, handler, or model change.

## Decisions

### Decision 1: Interface shape exactly as specified in ADR-004

ADR-004 gives the exact TypeScript signature:

```typescript
export interface ILogger {
  info(data: Record<string, unknown>): void;
  warn(data: Record<string, unknown>): void;
  error(data: Record<string, unknown>): void;
  debug(data: Record<string, unknown>): void;
}
```

Alternatives considered:
- **Variadic overloads** (`info(msg: string, data?: Record<string, unknown>)`) — rejected.
  ADR-004 mandates log objects, never strings. A `msg` field belongs inside the data record.
  Offering a string-first overload would make the wrong pattern too easy to reach for.
- **Generic type parameter** (`info<T extends object>(data: T): void`) — rejected. Adds
  complexity with no benefit; `Record<string, unknown>` is already wide enough for any
  structured log object and is the type ADR-004 names explicitly.

### Decision 2: NoOpLogger as a class, not a plain object literal

`NoOpLogger` is a named class rather than a raw `satisfies ILogger` object literal so that:
- It can be instantiated with `new NoOpLogger()` in test setup, matching the pattern use
  cases will use for real injected loggers.
- `instanceof NoOpLogger` checks work if needed in future test assertions.
- The pattern is consistent with other concrete infrastructure types in the project.

### Decision 3: Barrel export at app/shared/logging/index.ts

Following the precedent of `app/shared/errors/index.ts` — named exports, no `export * from`.
This ensures tree-shaking friendliness and makes the exported surface explicit and greppable.

### Decision 4: Test approach — yarn tsc + Vitest unit tests

TypeScript structural typing validates that `NoOpLogger` satisfies `ILogger` at compile
time. No PGlite setup is needed (zero DB involvement). A lightweight Vitest test file at
`tests/unit/shared/logging/ILogger.test.ts` provides runtime confirmation that:
- All four `NoOpLogger` methods are callable without throwing.
- The barrel export resolves at runtime.
- `NoOpLogger` is assignable to `ILogger`.

This matches the pattern established by `tests/unit/shared/errors/DomainError.test.ts`.

### Decision 5: No .server.ts suffix on logging files

`ILogger.ts` and `NoOpLogger.ts` are pure TypeScript interfaces/classes with no Node.js
or server-only APIs (no `fs`, no `crypto`, no `process`). They do not need the `.server.ts`
suffix. The Pino adapter (future) will be `.server.ts` because Pino is a Node.js library.

## Risks / Trade-offs

- **Risk: ADR-004 signature drift** — If the Pino adapter is later built with a different
  signature (e.g. adding a `fatal` method), `ILogger` will need updating.
  Mitigation: `ILogger` is the contract; the Pino adapter must implement it. Adding methods
  to the interface is additive and non-breaking for existing implementations.

- **Risk: `NoOpLogger` used in production** — A no-op silently swallows all log calls.
  Mitigation: `NoOpLogger` lives only in `app/shared/logging/` — not in any server
  bootstrap. The Pino adapter will be injected at the infrastructure wiring point; the
  no-op is only reachable in tests. Code review gate ensures it never appears in a loader
  or action.

- **Trade-off: No `fatal` method** — ADR-004 does not specify `fatal`. Pino supports it.
  Accepted: `error` covers unrecoverable failures adequately for the pilot scope. `fatal`
  can be added to the interface in a future change without breaking existing callers.

## Open Questions

None. ADR-004 is the authoritative source; the interface shape and test approach are fully
determined by it.
