## Why

Use cases in the Clean Architecture application layer need to log structured events (entry,
exit, errors) without coupling to Pino, Winston, or any concrete logging framework. ADR-004
mandates an `ILogger` port interface so domain and application code depends only on the
abstraction; the Pino implementation (a future infrastructure concern) is injected at the
boundary. Without `ILogger`, every test that exercises a use case would need to boot a real
logger or suppress noise — the `NoOpLogger` test double eliminates that coupling entirely.

This is Phase 2c of the Notices Pilot — the final prerequisite before use cases can log
at their entry/exit boundaries.

## What Changes

- **New file** `app/shared/logging/ILogger.ts` — defines the `ILogger` port interface with
  four methods (`info`, `warn`, `error`, `debug`), each accepting
  `Record<string, unknown>` as its data argument, returning `void`. Mirrors the exact
  signature specified in ADR-004.
- **New file** `app/shared/logging/NoOpLogger.ts` — implements `ILogger` as a silent no-op
  (all four methods are empty functions). Used as the test double when injecting a logger
  into use cases under test.
- **New file** `app/shared/logging/index.ts` — barrel export re-exporting `ILogger` and
  `NoOpLogger` from the two files above, following the same pattern as
  `app/shared/errors/index.ts`.
- **Remove** `app/shared/logging/.gitkeep` — the placeholder is no longer needed once real
  files occupy the directory.

No DB migration is required. No routes, models, or handlers are touched.

## Capabilities

### New Capabilities

- `ilogger-port`: The `ILogger` TypeScript interface — its shape, method signatures,
  and the constraint that all four methods accept `Record<string, unknown>`.
- `noop-logger`: The `NoOpLogger` concrete class — that it implements `ILogger`, that
  every method is silent, and that it is assignable wherever `ILogger` is expected.
- `logging-barrel`: The `app/shared/logging/index.ts` barrel export — that both
  `ILogger` and `NoOpLogger` are importable from `~/shared/logging`.

### Modified Capabilities

(none — no existing spec-level behaviour changes)

## Impact

- **`app/shared/logging/ILogger.ts`** — new file; defines the port.
- **`app/shared/logging/NoOpLogger.ts`** — new file; test double implementation.
- **`app/shared/logging/index.ts`** — new file; barrel export.
- **`app/shared/logging/.gitkeep`** — removed (directory no longer empty).
- No auth wrappers, multi-tenancy scoping, DB queries, or fieldsDef pipelines are
  involved; this change is pure TypeScript type infrastructure.
- **Test approach**: `yarn tsc` only — TypeScript structural type checking confirms
  `NoOpLogger` satisfies the `ILogger` interface and that all imports resolve correctly.
  Vitest behavioural tests are also written (they are trivially simple but ensure the
  barrel imports work at runtime and `NoOpLogger` methods are callable without throwing).
- **Security / multi-tenancy**: not applicable — no data access, no auth surface.
- **DB migration**: not required.
