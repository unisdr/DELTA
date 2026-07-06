## ADDED Requirements

### Requirement: PinoLogger implements ILogger by delegating to Pino
`PinoLogger` (`app/infrastructure/logging/PinoLogger.server.ts`) SHALL implement `ILogger`.
Each of `info`, `warn`, `error`, and `debug` MUST invoke the correspondingly named method on the
underlying Pino instance, passing through the caller-supplied `Record<string, unknown>` data.

#### Scenario: info delegates to the underlying Pino instance
- **WHEN** `PinoLogger.info({ msg: "Notice created", noticeId: "abc" })` is called
- **THEN** the underlying Pino instance's `info` method is invoked with data containing
  `msg: "Notice created"` and `noticeId: "abc"`

#### Scenario: warn delegates to the underlying Pino instance
- **WHEN** `PinoLogger.warn({ msg: "Rate limit hit" })` is called
- **THEN** the underlying Pino instance's `warn` method is invoked with data containing
  `msg: "Rate limit hit"`

#### Scenario: error delegates to the underlying Pino instance
- **WHEN** `PinoLogger.error({ msg: "DB connection failed" })` is called
- **THEN** the underlying Pino instance's `error` method is invoked with data containing
  `msg: "DB connection failed"`

#### Scenario: debug delegates to the underlying Pino instance
- **WHEN** `PinoLogger.debug({ msg: "Cache miss", key: "notice:1" })` is called
- **THEN** the underlying Pino instance's `debug` method is invoked with data containing
  `msg: "Cache miss"` and `key: "notice:1"`

### Requirement: PinoLogger configuration matches ADR-004
The Pino instance constructed by `PinoLogger`'s module SHALL be configured with: a
`pino-pretty` transport when `process.env.NODE_ENV !== "production"` and no transport
otherwise; `redact` set to exactly `['req.headers.authorization', 'req.headers.cookie',
'*.password', '*.token', '*.secret']`; a `timestamp` function producing a UTC ISO 8601
string in the form `,"time":"<ISO8601>"`; and `level` set to `"info"` when
`process.env.NODE_ENV === "production"` and `"debug"` otherwise.

#### Scenario: production level is info
- **WHEN** the Pino instance is constructed with `NODE_ENV=production`
- **THEN** its configured level MUST be `"info"`

#### Scenario: non-production level is debug
- **WHEN** the Pino instance is constructed with `NODE_ENV` unset or any value other than
  `"production"`
- **THEN** its configured level MUST be `"debug"`

### Requirement: PinoLogger enriches log lines with request context when a scope is active
Every `PinoLogger` method SHALL read `getRequestContext()`
(`app/utils/requestContext.server.ts`) at call time and, when it returns a defined
`RequestContextStore`, attach that store's `traceId`, `tenantId`, and `userId` to the emitted
log line in addition to the caller-supplied data.

#### Scenario: traceId, tenantId, and userId are attached inside an active scope
- **WHEN** `PinoLogger.info({ msg: "Notice created" })` is called from within a
  `withRequestContext(fn, { traceId: "abc-123" })` scope whose store has `tenantId: "tenant-1"`
  and `userId: "user-1"` set
- **THEN** the emitted log line MUST include `traceId: "abc-123"`, `tenantId: "tenant-1"`, and
  `userId: "user-1"`
- **AND** it MUST also include the caller-supplied `msg: "Notice created"`

### Requirement: PinoLogger does not throw and omits context fields when no scope is active
Every `PinoLogger` method SHALL still emit a log line using the caller-supplied data and MUST
NOT throw when `getRequestContext()` returns `undefined` (no active `withRequestContext` scope
— e.g. process startup or a background job). In that case the emitted line MUST NOT include
`traceId`, `tenantId`, or `userId` fields populated with placeholder values in place of the
missing context.

#### Scenario: logging outside any request scope succeeds
- **WHEN** `PinoLogger.info({ msg: "Server started" })` is called with no `withRequestContext`
  scope active
- **THEN** no exception is thrown
- **AND** the emitted log line includes `msg: "Server started"`
- **AND** the emitted log line does not contain a `traceId`, `tenantId`, or `userId` field
  populated from a stale or default request context

### Requirement: PinoLogger redacts configured sensitive fields from emitted output
Any `PinoLogger` method SHALL NOT emit, with its original value, log data passed under a path
matching the configured `redact` list (`req.headers.authorization`, `req.headers.cookie`,
`*.password`, `*.token`, `*.secret`) — the raw emitted log output must have that value
redacted.

#### Scenario: authorization header value is redacted from emitted output
- **WHEN** `PinoLogger.info({ req: { headers: { authorization: "Bearer secret-value" } } })` is
  called
- **THEN** the raw emitted log output MUST NOT contain the literal string `"secret-value"`

#### Scenario: password field is redacted from emitted output
- **WHEN** `PinoLogger.info({ user: { password: "hunter2" } })` is called
- **THEN** the raw emitted log output MUST NOT contain the literal string `"hunter2"`

### Requirement: getPinoLogger returns a memoized singleton
`getPinoLogger()` (exported from `app/infrastructure/logging/PinoLogger.server.ts`) SHALL
return an `ILogger` instance backed by a single underlying Pino instance constructed exactly
once per process, regardless of how many times `getPinoLogger()` is called.

#### Scenario: repeated calls return the same underlying instance
- **WHEN** `getPinoLogger()` is called twice
- **THEN** both calls return a logger backed by the same underlying Pino instance (no new Pino
  instance is constructed on the second call)

### Requirement: concurrent logger calls under different request scopes never cross-contaminate context
Because `getRequestContext()` reads from a process-wide `AsyncLocalStorage`, `PinoLogger` SHALL
attach only the `traceId`/`tenantId`/`userId` belonging to the async chain a given call executes
within, even when multiple `withRequestContext` scopes are active concurrently on overlapping
timelines.

#### Scenario: two concurrent request scopes each see only their own context
- **WHEN** two `withRequestContext` scopes are started concurrently — scope A seeded with
  `traceId: "trace-a"` whose store is later given `tenantId: "tenant-a"`, and scope B seeded
  with `traceId: "trace-b"` whose store is later given `tenantId: "tenant-b"` — and each scope
  calls `PinoLogger.info({ msg: "event" })` at an interleaved point before either scope
  completes
- **THEN** the log line emitted from within scope A MUST have `traceId: "trace-a"` and
  `tenantId: "tenant-a"` and MUST NOT contain `"trace-b"` or `"tenant-b"` anywhere in its fields
- **AND** the log line emitted from within scope B MUST have `traceId: "trace-b"` and
  `tenantId: "tenant-b"` and MUST NOT contain `"trace-a"` or `"tenant-a"` anywhere in its fields

### Requirement: getPinoLogger is usable without any NestJS DI container
`getPinoLogger()` SHALL be callable and return a fully functional `ILogger` from any module —
including code that executes before a NestJS DI container has been created for the current
request — without requiring `@Inject()`, a NestJS provider token, or an active NestJS
application context.

#### Scenario: logger obtained outside a NestJS application context
- **WHEN** `getPinoLogger()` is called from a module with no NestJS `TestingModule` or
  `INestApplicationContext` created or resolvable in the current process
- **THEN** it returns a defined `ILogger` instance whose `info`/`warn`/`error`/`debug` methods
  can be called successfully
