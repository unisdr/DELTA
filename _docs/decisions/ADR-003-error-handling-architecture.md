# ADR-003: Error Handling Architecture

## Status
Proposed

## Date
2026-05-12

## Context

The existing codebase has no consistent error handling strategy. Errors surface inconsistently across route handlers — some return HTTP status codes directly, some throw, some return null, and some log raw errors to the console. There is no shared error response shape. The audit trail (P0-12) found secrets being logged in error paths. No correlation ID links a client-facing error to the server log that caused it.

As part of the Clean Architecture migration, a consistent, layered error handling strategy is required across all new domains from the first pilot onwards.

## Decision

### Two Categories of Errors

**Operational errors** — expected, known failure conditions. "Record not found", "insufficient permissions", "validation failed". These are the domain speaking. They must be caught, classified, and returned gracefully with a structured response.

**Programmer errors** — unexpected bugs. Null dereference, unhandled edge case, library throwing something undocumented. These must bubble up, be logged with full context, and return a generic 500 to the client. Internal details must never be exposed.

The entire architecture is built around this distinction.

### Layer 1 — Domain Layer: Error Hierarchy

Pure TypeScript. No framework dependencies. The domain defines its error vocabulary.

```typescript
// shared/errors/DomainError.ts
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly statusHint: number;   // HTTP status hint for presentation layer
  constructor(
    message: string,
    readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Concrete error types
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly statusHint = 404;
  constructor(entity: string, id: string) {
    super(`${entity} not found`, { entity, id });
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusHint = 422;
}

export class AuthorizationError extends DomainError {
  readonly code = 'FORBIDDEN';
  readonly statusHint = 403;
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
  readonly statusHint = 409;
}
```

Domain entities throw these errors. The domain knows nothing about HTTP, NestJS, or serialisation.

### Layer 2 — Application Layer: Use Cases

Use cases let domain errors propagate. They only catch errors they can meaningfully enrich or transform. They never swallow errors silently.

```typescript
// Use case propagates — does not suppress
async execute(query: GetNoticeQuery): Promise<NoticeDto> {
  const notice = await this.repository.findById(query.id);
  // NotFoundError thrown by repository propagates automatically
  return NoticeMapper.toDto(notice);
}
```

### Layer 3 — Infrastructure Layer: Error Mapping

Repository implementations catch Drizzle/PostgreSQL errors and map them to domain errors before they cross the boundary. No framework-specific errors (Drizzle errors, pg errors) ever reach the application or domain layer.

```typescript
async findById(id: string): Promise<Notice> {
  try {
    const row = await this.dr.query.noticesTable.findFirst(
      { where: eq(noticesTable.id, id) }
    );
    if (!row) throw new NotFoundError('Notice', id);
    return NoticeMapper.toDomain(row);
  } catch (err) {
    if (err instanceof DomainError) throw err;  // already mapped
    if (isDrizzleUniqueViolation(err)) throw new ConflictError('Notice already exists');
    throw err;  // unknown — programmer error, let it bubble
  }
}
```

### Error Response Envelope

Every error response from every surface uses exactly this shape. No deviations.

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;        // machine-readable: "NOT_FOUND", "VALIDATION_ERROR"
    message: string;     // human-readable, safe to display, localised
    details?: unknown;   // field-level validation details only
    traceId: string;     // correlates to server log
    timestamp: string;   // UTC ISO 8601
  };
}
```

### Layer 4 — Presentation Layer

**React Router loaders and actions** (internal SSR surface):

Each loader wraps its use case call and handles both error categories:

```typescript
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const traceId = crypto.randomUUID();
  try {
    const result = await listNoticesUseCase.execute({ locale });
    return Response.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof DomainError) {
      logger.warn({ traceId, code: err.code, msg: err.message, context: err.context });
      return Response.json(
        { success: false, error: { code: err.code, message: err.message, details: err.context, traceId, timestamp: new Date().toISOString() } },
        { status: err.statusHint }
      );
    }
    logger.error({ traceId, err, url: request.url, msg: 'Unhandled error in loader' });
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred. Please try again later.', traceId, timestamp: new Date().toISOString() } },
      { status: 500 }
    );
  }
};
```

**NestJS GlobalExceptionFilter** (external HTTP API surface — when NestJS exposes HTTP endpoints):

A single global filter handles all three cases: known domain error (warn + structured response), NestJS framework exception (warn + structured response), unhandled programmer error (error + generic 500). The filter is the only place that catches unknown errors on the HTTP surface.

### React Router Error Boundaries

Each domain's presentation layer exports its own `ErrorBoundary` using React Router v7's built-in mechanism. This is a per-zone boundary — one domain failing does not crash unrelated parts of the page.

```typescript
// domains/notices/presentation/ErrorBoundary.tsx
export function ErrorBoundary() {
  const error = useRouteError();
  const errorData = isRouteErrorResponse(error) ? error.data : null;
  // Render structured error UI; show traceId if available
}

// app/routes/$lang+/notices+/_index.tsx
export { ErrorBoundary } from '~/domains/notices/presentation/ErrorBoundary';
```

### Unhandled Promise Rejection Handler

Added to `init.server.tsx` (no `main.ts` exists in the current architecture):

```typescript
process.on('unhandledRejection', (reason) => {
  logger.error({ msg: 'Unhandled promise rejection', reason });
});
```

### TraceId

`crypto.randomUUID()` is generated at the loader/action entry point and flows through AsyncLocalStorage for the duration of the request (see ADR-004). The interface is designed so that swapping from `crypto.randomUUID()` to an OpenTelemetry span ID is a one-line change — no domain code changes.

The `traceId` appears in:
- Every log line during the request (via AsyncLocalStorage)
- The error response returned to the client
- The UI — users can report "Error ID: abc-123" to support

### Rules

1. Domain errors are thrown, not returned. Result/Either types are not used — thrown typed errors are simpler and equally effective in TypeScript.
2. Infrastructure maps external errors to domain errors. Drizzle, pg, and third-party SDK errors never cross into the application layer raw.
3. One error response shape — no route or controller defines its own format.
4. Never expose internal error details to the client. Log everything server-side, return little to the client.
5. The `traceId` bridges everything — log, trace, and error response share one key.
6. Operational errors are logged as `warn`. Programmer errors are logged as `error`.

## Consequences

- All error surfaces produce a consistent, parseable response shape — frontend can handle errors generically
- `traceId` enables instant log lookup from a user-reported error ID
- Domain layer has zero framework coupling — fully unit testable with no mocks for HTTP context
- Infrastructure error mapping means Drizzle version changes never affect domain or application code
- Each new domain must implement an `ErrorBoundary` export — minor overhead, significant resilience benefit

## References

- [ADR-004: Logging and Traceability](ADR-004-logging-and-traceability.md) — traceId and structured logging
- [P0-12: Remove secret logging](../refactoring-plan/phases/phase-1-structural.md)
- [P1-44: Add unit tests for auth.ts and session.ts](../refactoring-plan/phases/phase-1-structural.md)
