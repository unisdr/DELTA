# ADR-004: Logging and Traceability

## Status
Proposed

## Date
2026-05-12

## Context

The existing codebase has two parallel logging systems: `app/utils/logger.ts` (150 lines, console wrappers) and `app/utils/logger.server.ts` (550 lines, Winston). Most production code uses neither — raw `console.log` is scattered throughout handlers, models, and services (flagged in P1-27). There is no request correlation, no tenant/user context in logs, and no consistent log level discipline.

Logging and tracing solve different problems and must be treated separately but wired together:
- **Logging** answers *what happened* — a record of events with context at a point in time.
- **Tracing** answers *how a request flowed* — the full journey of one request, correlating all related log lines into a single timeline.

The architecture must support multi-tenant log filtering (`tenantId`), request correlation (`traceId`), and eventual distributed tracing without requiring domain code changes.

## Decision

### Logger: Pino

**Pino** replaces both existing logging systems and all `console.log` usage. Zero `console.log` calls are permitted in any server-side file after a domain is migrated.

Pino is chosen over Winston because:
- Deferred serialisation — log objects are not stringified on the hot path; batching happens in a worker thread
- Native structured JSON output — directly consumable by Datadog, Grafana Loki, ELK without transformation
- `pino-pretty` for human-readable development output with zero config change in production

```typescript
// app/utils/logger.server.ts — replaces existing Winston implementation
import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
  timestamp: () => `,"time":"${new Date().toISOString()}"`,  // always UTC
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    '*.password',
    '*.token',
    '*.secret',
  ],
});
```

### ILogger Port in the Application Layer

The domain and application layers must not depend on Pino or any logging framework. A port interface is defined in shared infrastructure:

```typescript
// shared/logging/ILogger.ts
export interface ILogger {
  info(data: Record<string, unknown>): void;
  warn(data: Record<string, unknown>): void;
  error(data: Record<string, unknown>): void;
  debug(data: Record<string, unknown>): void;
}
```

Use cases declare `ILogger` as a dependency. The Pino implementation is injected via NestJS DI (infrastructure concern). In tests, a mock or no-op logger is injected — no Pino dependency in test setup.

The domain layer does not log. Logging belongs in the application layer (use cases) at boundaries: use case entry, use case exit, and caught infrastructure errors.

### Request Context via AsyncLocalStorage

Every log line during a request must carry `traceId`, `tenantId`, and `userId` without manually passing them through every function call. AsyncLocalStorage provides this transparently.

```typescript
// app/utils/requestContext.server.ts
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  traceId: string;
  tenantId: string | null;
  userId: string | null;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function withRequestContext<T>(
  ctx: RequestContext,
  fn: () => Promise<T>
): Promise<T> {
  return requestContext.run(ctx, fn);
}

// Logger reads context automatically on every call
export function getContextualLogger() {
  const ctx = requestContext.getStore();
  return logger.child({
    traceId: ctx?.traceId,
    tenantId: ctx?.tenantId,
    userId: ctx?.userId,
  });
}
```

Every React Router loader and action wraps its execution in `withRequestContext`:

```typescript
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const traceId = crypto.randomUUID();
  const { userId, tenantId } = await resolveFromSession(request);
  return withRequestContext({ traceId, tenantId, userId }, async () => {
    // all log calls here carry traceId, tenantId, userId automatically
    return listNoticesUseCase.execute({ locale });
  });
};
```

When NestJS exposes an HTTP server, `pino-http` middleware provides the equivalent for that surface, wiring into the same AsyncLocalStorage context.

### Log Level Discipline

| Level | Use when | Example |
|---|---|---|
| `error` | Something broke and requires human attention | DB connection failed, unhandled exception |
| `warn` | Unexpected but recovered; operational domain error | Rate limit hit, NotFoundError caught and returned |
| `info` | Meaningful business event — readable as an audit trail | Notice created, user authenticated, report exported |
| `debug` | Developer internals — off in production by default | Cache hit/miss, SQL parameters, intermediate values |

`info` logs must be understandable by someone with no code knowledge. `debug` logs are for developers only. Never construct large objects eagerly for a `debug` call — even when the level is disabled, eager construction has a cost.

### Mandatory Fields in Every Log Line

Every log line emitted during a request must include:
- `traceId` — from AsyncLocalStorage context
- `tenantId` — from AsyncLocalStorage context
- `userId` — from AsyncLocalStorage context
- `time` — UTC ISO 8601 (handled by Pino timestamp config)
- `msg` — the message key (always a string, never string concatenation)

Log objects, never strings:
```typescript
// Correct
logger.info({ msg: 'Notice created', noticeId: result.id });

// Wrong — unqueryable, not structured
logger.info('Notice created: ' + result.id);
```

### Log at Boundaries

Log at the entry and exit of use cases, at external API calls, and at DB operations. Not inside every private method. Not inside domain entity methods.

### OpenTelemetry — Phased Adoption

| Phase | TraceId mechanism | Capability |
|---|---|---|
| Now (pilot) | `crypto.randomUUID()` per request | All logs for a request share one ID — filterable in log aggregator |
| Phase 2 | OTel SDK + `@opentelemetry/instrumentation-pino` bridge | TraceId in logs links to spans in a trace backend |
| Phase 3 | OTel Collector + Grafana Tempo or Jaeger | Full waterfall trace UI, distributed tracing across services |

The `traceId: string` field in `RequestContext` is source-agnostic. Switching from `crypto.randomUUID()` to an OTel span ID is a one-line change in the loader wrapper — no domain or application code changes.

OpenTelemetry SDK initialisation **must** happen before any other server bootstrap:

```typescript
// app/init.server.tsx
export async function initServer() {
  await startTelemetry();   // OTel FIRST — before DB, before everything
  initDB();
  initCookieStorage();
  // ...
}
```

### Frontend Error Tracking — Sentry

Frontend errors disappear into the browser. Sentry provides:
- Automatic error grouping across users
- Breadcrumb trail (console, network, UI interactions) leading up to an error
- React component stack on rendering errors
- Backend trace correlation

```typescript
// app/entry.client.tsx
Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.2,
});
```

**Frontend ↔ backend correlation**: the server includes `x-trace-id` in every response header. The frontend attaches it to Sentry events, linking a Sentry frontend error directly to the backend log that caused it.

### Rules Enforced as Team Conventions

1. `console.log` is banned in all server-side code. ESLint `no-console` rule enforced in CI.
2. Inject the logger — do not instantiate it. Logger comes from DI so request context flows automatically.
3. Log objects, not strings. Every log call uses `{ msg: '...', ...fields }` — queryable, structured.
4. Log at boundaries — use case entry/exit, external calls, DB operations. Not inside every method.
5. Never log sensitive data — passwords, tokens, session cookies, PII. Pino `redact` is a safety net, not the primary control.
6. OTel initialises before NestJS and before React Router serves requests.

## Consequences

- Every log line is filterable by `tenantId` — support can isolate all activity for a tenant instantly
- `traceId` in the error response UI means users can self-report a correlation key — support can find the exact log without guessing
- The `ILogger` port means use cases are testable with a no-op logger — no Pino in unit tests
- Winston and the console-wrapper `logger.ts` are deleted as each domain is migrated — scoped to domain rewrites, not a global change
- Sentry adds an external dependency and DSN secret to manage — scoped to production deployments

## References

- [P1-27: Consolidate two logging systems](../refactoring-plan/phases/phase-1-structural.md)
- [ADR-003: Error Handling Architecture](ADR-003-error-handling-architecture.md) — traceId flows from error handling into logging
- [ADR-002: Timezone Handling](ADR-002-timezone-handling.md) — log timestamps always UTC
- [OpenTelemetry Node.js SDK](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/)
- [pino-http](https://github.com/pinojs/pino-http)
