## ADDED Requirements

### Requirement: NoOpLogger implements ILogger

`NoOpLogger` SHALL be a concrete class exported from `app/shared/logging/NoOpLogger.ts`
that `implements ILogger`. It MUST provide method bodies for all four methods (`info`,
`warn`, `error`, `debug`). Each method body MUST be empty — it MUST perform no I/O, no
side effects, and MUST not throw under any input.

#### Scenario: NoOpLogger is assignable to ILogger

- **WHEN** `new NoOpLogger()` is assigned to a variable declared as `ILogger`
- **THEN** the TypeScript compiler SHALL accept the assignment without error

#### Scenario: NoOpLogger.info does not throw

- **WHEN** `new NoOpLogger().info({ msg: "test", value: 42 })` is called
- **THEN** it SHALL return without throwing any exception

#### Scenario: NoOpLogger.warn does not throw

- **WHEN** `new NoOpLogger().warn({ msg: "test", code: "W001" })` is called
- **THEN** it SHALL return without throwing any exception

#### Scenario: NoOpLogger.error does not throw

- **WHEN** `new NoOpLogger().error({ msg: "test", err: "something failed" })` is called
- **THEN** it SHALL return without throwing any exception

#### Scenario: NoOpLogger.debug does not throw

- **WHEN** `new NoOpLogger().debug({ msg: "test", detail: true })` is called
- **THEN** it SHALL return without throwing any exception

#### Scenario: NoOpLogger.info with empty record does not throw

- **WHEN** `new NoOpLogger().info({})` is called with an empty record
- **THEN** it SHALL return without throwing any exception

### Requirement: NoOpLogger produces no output

The `NoOpLogger` MUST NOT write to `console`, to any file, to any stream, or to any
external service. It MUST be completely silent under all inputs.

#### Scenario: no console output on info call

- **WHEN** `new NoOpLogger().info({ msg: "test" })` is called in a test environment
- **THEN** no output SHALL appear on stdout or stderr

#### Scenario: no console output on error call

- **WHEN** `new NoOpLogger().error({ msg: "catastrophic", err: "oops" })` is called in a
  test environment
- **THEN** no output SHALL appear on stdout or stderr

### Requirement: NoOpLogger is constructible with no arguments

`NoOpLogger` MUST be constructible via `new NoOpLogger()` with no constructor arguments.
No dependency injection, no configuration object, and no environment variable reads are
permitted in its constructor.

#### Scenario: zero-argument construction succeeds

- **WHEN** `new NoOpLogger()` is called with no arguments
- **THEN** a valid `NoOpLogger` instance SHALL be returned without throwing
