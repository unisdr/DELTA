## Why

No production `ILogger` implementation exists. `NoticesModule.server.ts` wires `new NoOpLogger()`
into all three Notices use-case factories, so every `info`/`warn`/`error`/`debug` call from
`CreateNoticeUseCase`, `ListNoticesUseCase`, and `GetNoticeByIdUseCase` is silently discarded in
production — there is no structured logging, no request correlation (traceId/tenantId/userId),
and no redaction of sensitive fields, contrary to ADR-004. Separately,
`app/middleware/requestContext.server.ts` bypasses the `ILogger` port entirely with two raw
`console.error(...)` calls (lines 34 and 40) because no non-DI access path to a logger exists at
that point in the request lifecycle. This proposal closes both gaps with a single Pino-backed
adapter.

## What Changes

- Add `pino` as a runtime dependency and `pino-pretty` as a dev-only dependency.
- Introduce `PinoLogger implements ILogger` at `app/infrastructure/logging/PinoLogger.server.ts`,
  configured per ADR-004: `pino-pretty` transport when `NODE_ENV !== "production"`, `redact:
  ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token', '*.secret']`, a
  custom UTC ISO8601 `timestamp` function, and level `info` in production / `debug` otherwise.
- Every `PinoLogger` call automatically attaches `traceId`/`tenantId`/`userId` by reading
  `getRequestContext()` from the real `app/utils/requestContext.server.ts` store. When no
  `withRequestContext` scope is active (app startup, background jobs), the logger MUST NOT throw
  and MUST still emit a log line without those fields.
- Export a singleton accessor function from the `PinoLogger` module so code that runs before
  NestJS DI resolves (e.g. root middleware) can obtain a logger instance without `@Inject()`.
  The instance is constructed once at module load, not per call.
- Wire `PinoLogger` into `NoticesModule.server.ts`'s three existing `useFactory` providers,
  replacing `new NoOpLogger()`. The `useFactory` / `inject: [NOTICE_REPOSITORY]` pattern is
  unchanged — only the logger construction changes. The stale comment claiming "No
  NestJS-managed ILogger provider exists yet" is removed/updated.
- Migrate the two `console.error` calls in `app/middleware/requestContext.server.ts` (lines 34
  and 40, session-lookup rejection logging) to use the new singleton accessor instead of raw
  `console.error`.

**Not breaking**: `ILogger` and `NoOpLogger` are unchanged. Tests that construct use cases with
`NoOpLogger` directly continue to work unmodified.

## Out of Scope

- `app/utils/logger.ts` and `app/utils/logger.server.ts` (legacy Winston-based files) — not
  touched, migrated, referenced for removal, or deleted. ADR-004's Consequences section scopes
  their removal to "as each domain is migrated," which this cross-cutting proposal is not.
- OpenTelemetry integration — phased as future work in ADR-004. The existing
  `crypto.randomUUID()`-per-request traceId is sufficient here.
- Sentry / frontend error tracking.
- Any repo-wide sweep of other `console.log`/`console.error` call sites beyond the two named
  above in `app/middleware/requestContext.server.ts`.
- ESLint `no-console` rule enforcement (ADR-004 rule 1) — no ESLint config changes. This
  proposal simply avoids introducing new console usage in the files it touches.

## Capabilities

### New Capabilities
- `pino-logger`: Production `ILogger` adapter backed by Pino — structured JSON logging,
  ADR-004-compliant redaction and timestamp format, automatic request-context enrichment
  (traceId/tenantId/userId) via `getRequestContext()`, safe no-context fallback, and a
  non-DI singleton accessor for use outside the NestJS container.

### Modified Capabilities
- `notices-module-wiring`: The three `useFactory` providers (`CreateNoticeUseCase`,
  `ListNoticesUseCase`, `GetNoticeByIdUseCase`) now construct `PinoLogger` instead of
  `NoOpLogger`. Existing token-identity, singleton, and concurrent-compilation requirements are
  unchanged; this proposal adds a requirement that the resolved use case instances receive a
  logger constructed via `PinoLogger`'s accessor rather than `NoOpLogger` in the real
  application composition (not in unit tests, which may still inject `NoOpLogger` directly).
- `request-context-middleware`: The two session-lookup rejection log statements in
  `requestContextMiddleware` now go through the `PinoLogger` singleton accessor's `error`
  method instead of raw `console.error`, carrying the same rejection reason as structured data.
  The existing "session resolution failure does not fail the request" behavioural requirement
  is unchanged — only the log emission mechanism changes.

## Impact

**Files to change:**
- `package.json` — add `pino` (runtime), `pino-pretty` (devDependency). Reason: new logging
  dependency per ADR-004.
- `app/infrastructure/logging/PinoLogger.server.ts` (new) — production `ILogger` adapter,
  context enrichment, and singleton accessor. Reason: core deliverable of this proposal.
- `app/domains/notices/infrastructure/NoticesModule.server.ts` — replace `new NoOpLogger()`
  with `PinoLogger` accessor in three `useFactory` providers; update stale comment. Reason:
  proves the adapter is wired into a real consumer.
- `app/middleware/requestContext.server.ts` — replace two `console.error` calls (lines 34, 40)
  with the `PinoLogger` accessor's `error` method. Reason: removes the console.error stopgap
  now that a non-DI access path exists.
- `tests/unit/infrastructure/logging/PinoLogger.test.ts` (new) — unit tests for the adapter
  (see specs for required scenarios).
- `tests/integration/domains/notices/NoticesModule.test.ts` (existing, extended) — verify the
  module still compiles and all three use cases still resolve with the factory now
  constructing `PinoLogger`. No existing assertion is removed or weakened.

**No DB migration required.** This proposal is logging infrastructure only; no Drizzle schema,
table, or migration file is touched. `yarn dbsync` is not applicable to this change.

**Test approach:** Primarily Vitest unit tests for `PinoLogger` (no DB needed — pure
logging/context logic). The existing PGlite-backed `tests/integration/domains/notices/
NoticesModule.test.ts` (`yarn test:run2` tier) is extended, not replaced, to confirm the module
still compiles and resolves its providers with the new factory wiring. No E2E tier is needed;
this change has no user-facing route or UI surface.

**Security / multi-tenancy implications:** `tenantId` now flows into every log line emitted by
`PinoLogger`, sourced from the real `RequestContextStore` — this increases log observability
for tenant-scoped debugging but also means log output now carries tenant identifiers, which is
consistent with ADR-004's intent and MUST be paired with the specified redaction of
authorization headers, cookies, passwords, tokens, and secrets so sensitive request data is
never persisted to log sinks.
