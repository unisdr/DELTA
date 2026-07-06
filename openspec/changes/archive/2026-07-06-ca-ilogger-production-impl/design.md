## Context

`ILogger` (`app/shared/logging/ILogger.ts`) and `NoOpLogger` (`app/shared/logging/NoOpLogger.ts`)
already exist and are merged. No production implementation exists. `NoticesModule.server.ts`
wires `new NoOpLogger()` into three `useFactory` providers, and a code comment there explicitly
defers this work: "When a production Pino adapter is introduced the factories can be replaced
with a shared LoggerModule provider." Separately, `app/middleware/requestContext.server.ts`
contains two raw `console.error(...)` calls because, at the point that middleware runs, no
NestJS DI container has resolved anything yet for the request — there is nothing to `@Inject()`.

ADR-004 specifies an illustrative `RequestContext` type and a `getContextualLogger()` helper
built directly on a module-private `AsyncLocalStorage<RequestContext>`. That illustrative type
does not exist in the codebase. The real implementation living at
`app/utils/requestContext.server.ts` is `RequestContextStore` — a superset that also carries
`sessionCache` and `sessionCachePromise` for session-lookup memoization — accessed via the real
`getRequestContext(): RequestContextStore | undefined` and `withRequestContext()` functions.
This design binds to the real store, not ADR-004's illustrative sketch.

`getRequestContext()` returns `undefined` whenever no `withRequestContext` scope is active:
process startup, background/cron jobs, or any code path that runs outside
`requestContextMiddleware`. `PinoLogger` must tolerate this without throwing.

## Goals / Non-Goals

**Goals:**
- Provide a real, ADR-004-compliant `ILogger` implementation backed by Pino.
- Automatically enrich every log line with `traceId`/`tenantId`/`userId` from the real
  `RequestContextStore` when a request scope is active.
- Provide a non-DI access path so `requestContextMiddleware` — which runs before any NestJS
  container resolves providers for the request — can log through the same adapter instead of
  raw `console.error`.
- Prove the adapter works by wiring it into `NoticesModule.server.ts`'s three existing
  `useFactory` providers, replacing `NoOpLogger`.

**Non-Goals:**
- Migrating `app/utils/logger.ts` / `app/utils/logger.server.ts` (legacy Winston) or deleting
  them — out of scope per the proposal.
- OpenTelemetry span integration — `crypto.randomUUID()` traceId remains sufficient (ADR-004
  Phase "Now").
- Sentry / frontend error tracking.
- A generic `LoggerModule` NestJS provider for arbitrary future consumers beyond
  `NoticesModule.server.ts` — this proposal wires one real consumer; broader DI-module
  packaging is left for when a second domain needs it, to avoid speculative abstraction.
- Sweeping other `console.*` call sites repo-wide.
- No Drizzle schema or migration changes of any kind.

## Decisions

### Decision 1: Adapter location and shape — `app/infrastructure/logging/PinoLogger.server.ts`

`PinoLogger implements ILogger` lives in `app/infrastructure/logging/`, mirroring the existing
`app/infrastructure/DrizzleProvider.server.ts` and `app/infrastructure/CoreModule.server.ts`
precedent: infrastructure-layer adapters that wrap a concrete technology behind a port live
under `app/infrastructure/`, suffixed `.server.ts` because Pino, like `pg`/Drizzle, is a
Node-only dependency that must never reach the client bundle.

The module exports:
- `class PinoLogger implements ILogger` — the adapter itself. The constructor accepts an
  optional `pino.Logger` instance (defaulting to a module-level base instance) so tests can
  inject a Pino instance pointed at an inspectable destination stream without needing to
  reconfigure global state.
- `getPinoLogger(): ILogger` — an exported singleton accessor. Calling it repeatedly returns
  the same `PinoLogger` instance; the underlying Pino instance is constructed exactly once at
  module load, not per call. This is the same "construct once, resolve to the singleton"
  pattern `DrizzleProvider.server.ts` already uses for `dr`.

**Alternatives considered:**
- *Instantiate Pino directly at each call site.* Rejected — defeats the purpose of the `ILogger`
  port and duplicates ADR-004's redact/timestamp config at every call site.
- *Put the adapter under `app/shared/logging/` next to `ILogger`/`NoOpLogger`.* Rejected —
  `app/shared/` is import-safe from both client and server per its existing contents (pure
  interfaces and a no-op class with no Node dependency); Pino is a Node-only dependency and
  must live under `app/infrastructure/` with the `.server.ts` suffix so the bundler excludes
  it from the client build, consistent with `DrizzleNoticeRepository.server.ts`.

### Decision 2: Context enrichment via a fresh `child()` logger per call

Each `PinoLogger` method (`info`/`warn`/`error`/`debug`) reads `getRequestContext()` at call
time and, when a store is present, calls `this.pino.child({ traceId, tenantId, userId })`
before invoking the corresponding Pino method with the caller's `data`. The child logger is
created fresh per call, not cached on the `PinoLogger` instance or on the store, because:
- `PinoLogger` (via `getPinoLogger()`) is a process-wide singleton, but `RequestContextStore` is
  per-request (per async chain). Caching a child logger on the singleton would leak the first
  request's context into every subsequent call.
- Pino's `child()` call is cheap (no I/O, just merges bindings) — safe to call on every log
  invocation.

When `getRequestContext()` returns `undefined` (no active scope), the method calls the base
Pino instance directly with the caller's `data`, omitting `traceId`/`tenantId`/`userId` rather
than passing `null`/`undefined` placeholders that would clutter every startup/background-job
log line with fields that never apply outside a request.

**Alternatives considered:**
- *Cache one child logger per store, stashed as a field on `RequestContextStore` itself.*
  Rejected — this would couple `app/utils/requestContext.server.ts` (a general per-request
  memoization utility with no Pino dependency today) to the logging infrastructure layer,
  violating the same layering `ILogger` exists to protect. It would also need cache
  invalidation logic for no measurable benefit given `child()`'s low cost.
- *Use `pino-http`'s automatic request-bindings mechanism.* Rejected for this proposal — that
  targets an actual HTTP framework request/response cycle at the NestJS HTTP layer, which does
  not yet exist as the entry point for React Router loaders/actions (ADR-004 notes this itself:
  "When NestJS exposes an HTTP server, `pino-http` middleware provides the equivalent"). Not
  applicable until that surface exists.

### Decision 3: Non-DI access path — the same `getPinoLogger()` accessor, used directly

`requestContextMiddleware` (`app/middleware/requestContext.server.ts`) imports and calls
`getPinoLogger()` directly rather than going through NestJS `@Inject()`, because this
middleware runs at the React Router root-middleware layer — before any NestJS
`Test.createTestingModule` / `NestFactory` container exists for the request. There is nothing
to inject from.

This is a deliberate, narrow exception to ADR-004 Rule 2 ("Inject the logger — do not
instantiate it"): the rule's intent is to prevent scattered `new PinoLogger()` calls that
bypass the singleton and duplicate configuration. `getPinoLogger()` satisfies that intent — it
is still exactly one construction, memoized at module load — while accommodating the one call
site that structurally sits outside the DI container's reach. No other file should call
`new PinoLogger(...)` directly with a fresh Pino instance; both the NestJS `useFactory`
providers and the middleware obtain their instance through `getPinoLogger()`.

**Alternatives considered:**
- *Give `requestContextMiddleware` its own NestJS application context just to resolve a
  logger.* Rejected — creating or reaching into a NestJS container solely to fetch a logger
  before the real request-handling container exists is significant complexity and startup cost
  for no behavioural benefit over calling an exported accessor.
- *Keep using `console.error` in the middleware and only fix `NoticesModule`.* Rejected — the
  proposal explicitly scopes both call sites; leaving `console.error` in place after building a
  working accessor would be an inconsistent half-fix and was called out as risk in Phase 0.

### Decision 4: Pino configuration — verbatim per ADR-004

```typescript
pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "*.password",
    "*.token",
    "*.secret",
  ],
});
```

No deviation from ADR-004's snippet. This keeps the adapter a faithful, minimal-surprise
implementation of an already-approved decision record rather than introducing a second,
slightly different config that would need its own justification.

### Decision 5: `NoticesModule.server.ts` wiring — swap the logger argument only

The three `useFactory` providers change from:
```typescript
useFactory: (repo: INoticeRepository) =>
  new CreateNoticeUseCase(new NoOpLogger(), repo),
```
to:
```typescript
useFactory: (repo: INoticeRepository) =>
  new CreateNoticeUseCase(getPinoLogger(), repo),
```
`inject: [NOTICE_REPOSITORY]` is unchanged — `getPinoLogger()` is a plain function call, not a
NestJS-resolved dependency, so it needs no injection token. This preserves Decision 4 from the
module's own design (`useFactory` because use cases stay framework-agnostic plain classes) and
only touches the logger construction expression, per the proposal's stated scope. The stale
comment block above the providers (which currently says "No NestJS-managed ILogger provider
exists yet... When a production Pino adapter is introduced...") is rewritten to state that
`PinoLogger` is now wired via `getPinoLogger()`, and to note that `NoOpLogger` is still the
correct choice in unit tests that construct use cases directly without going through the
module.

### Decision 6: Test destination — inspectable Pino stream, not stdout scraping

Unit tests construct `PinoLogger` with an explicit Pino instance pointed at a `stream.Writable`
that buffers written chunks in memory, per Pino's documented testing pattern
(`pino(dest)` where `dest` is any Node writable stream). Tests then `JSON.parse()` each
buffered line to assert on structured fields (presence/absence of `traceId`, absence of
redacted values) rather than asserting against the `redact` config array or mocking Pino's
internals. This is the only way to prove redaction actually happens in emitted output, not
just that the option was passed to the constructor.

## Risks / Trade-offs

- **[Risk]** A fresh `child()` call on every single log line has a small allocation cost
  compared to a cached child logger. → **Mitigation**: Pino's `child()` is designed to be cheap
  (documented as safe to call per-request); this proposal logs at use-case boundaries only
  (per ADR-004 "Log at Boundaries"), not in hot inner loops, so the cost is negligible relative
  to the DB calls already happening in the same use cases.
- **[Risk]** `getPinoLogger()` as a bypass of DI could be copy-pasted into new files as a general
  habit, eroding ADR-004 Rule 2 over time. → **Mitigation**: design.md and the code comment at
  the accessor's definition state explicitly that it exists only for call sites structurally
  outside the NestJS container (documented example: root middleware); NestJS-managed code must
  use `useFactory`/`@Inject()` as `NoticesModule.server.ts` does.
- **[Risk]** `pino-pretty` is a dev-only transport; if `NODE_ENV` is unset or misconfigured in a
  deployed environment, output could unexpectedly become pretty-printed (human-readable, not
  machine-parseable) in production. → **Mitigation**: this mirrors ADR-004's own snippet exactly
  (`process.env.NODE_ENV !== "production"`); no new risk is introduced beyond what ADR-004
  already accepted, and existing deployment configuration already sets `NODE_ENV=production`
  for the same reason other environment-gated behaviour in the app depends on it.
- **[Risk]** Redaction list is a fixed set of path patterns (`req.headers.authorization`, etc.);
  a future log call that nests sensitive data under an unlisted key path would not be redacted.
  → **Mitigation**: this is an accepted limitation of ADR-004's own decision, not new to this
  proposal; out of scope to expand the redact list here.
- **[Risk, verified — sharper than the above]** The wildcard entries (`*.password`, `*.token`,
  `*.secret`) only match exactly **one** path segment before the key name, because Pino's
  `redact` option is backed by `fast-redact`, which has no recursive/glob wildcard. Confirmed
  by executing real Pino: `{ user: { password: "x" } }` is redacted, but
  `{ a: { b: { password: "x" } } }` is **not** — the plaintext value is emitted. This is a
  sharper gap than "an unlisted key path" above: even a *listed* pattern (`*.password`) silently
  fails to redact once the sensitive field sits two or more levels deep in a logged object (e.g.
  a nested DTO or error payload passed to `logger.info(...)` unmodified).
  → **Mitigation**: covered by a regression test (`PinoLogger.test.ts`, "documents that wildcard
  redact paths only match one level of nesting") so this limitation is never silently assumed
  fixed by a future Pino/fast-redact version bump without deliberate re-verification. Still
  out of scope to fix in this proposal — enumerating exact deep paths per call site is not
  generically expandable without knowing every future log call's payload shape in advance; if
  this becomes a real incident, the fix belongs in ADR-004 (e.g. a `censor`/sanitize-before-log
  step), not in this adapter.

## Migration Plan

1. Add `pino` / `pino-pretty` to `package.json` (`yarn add pino`, `yarn add -D pino-pretty`).
2. Add `PinoLogger.server.ts` with the adapter, `getPinoLogger()` accessor, and Pino config.
   No consumer wired yet — this step is additive and cannot regress existing behaviour.
3. Wire `NoticesModule.server.ts`'s three factories to `getPinoLogger()`, update the stale
   comment. Existing `NoticesModule.test.ts` assertions must continue to pass unmodified since
   they assert on defined-ness/identity of use case instances, not on which logger they hold.
4. Migrate the two `console.error` calls in `requestContextMiddleware` to
   `getPinoLogger().error({...})`.
5. No feature flag or staged rollout needed — this is an additive infrastructure change with no
   API, schema, or route-visible behaviour change. Rollback is a plain revert of the four
   changed/added files if an issue surfaces.

No DB migration. No `yarn dbsync` step applies to this change.

## Open Questions

None outstanding — the accessor pattern, context-enrichment mechanism, and fallback behaviour
are fully decided above. Packaging `PinoLogger` behind a proper NestJS `LoggerModule` provider
for additional future domains beyond Notices is deferred until a second consumer exists (see
Non-Goals), to avoid building abstraction ahead of a second concrete need.
