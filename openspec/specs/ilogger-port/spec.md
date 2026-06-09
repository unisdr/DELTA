## ADDED Requirements

### Requirement: ILogger interface shape

`ILogger` SHALL be a TypeScript `interface` exported from `app/shared/logging/ILogger.ts`.
It MUST declare exactly four methods: `info`, `warn`, `error`, and `debug`. Each method
MUST accept a single parameter typed as `Record<string, unknown>` and MUST return `void`.
No additional methods, properties, or type parameters are permitted on the interface
definition.

#### Scenario: info method signature is correct

- **WHEN** a TypeScript consumer declares a variable of type `ILogger` and calls `.info`
  with a `Record<string, unknown>` argument
- **THEN** the TypeScript compiler SHALL accept the call without error

#### Scenario: warn method signature is correct

- **WHEN** a TypeScript consumer calls `.warn` with a `Record<string, unknown>` argument
  on an `ILogger`-typed variable
- **THEN** the TypeScript compiler SHALL accept the call without error

#### Scenario: error method signature is correct

- **WHEN** a TypeScript consumer calls `.error` with a `Record<string, unknown>` argument
  on an `ILogger`-typed variable
- **THEN** the TypeScript compiler SHALL accept the call without error

#### Scenario: debug method signature is correct

- **WHEN** a TypeScript consumer calls `.debug` with a `Record<string, unknown>` argument
  on an `ILogger`-typed variable
- **THEN** the TypeScript compiler SHALL accept the call without error

#### Scenario: string argument is rejected

- **WHEN** a TypeScript consumer calls any `ILogger` method with a plain `string` argument
  instead of `Record<string, unknown>`
- **THEN** the TypeScript compiler SHALL reject the call with a type error

#### Scenario: extra unknown method does not exist on the interface

- **WHEN** a TypeScript consumer attempts to call a method named `fatal` on an
  `ILogger`-typed variable
- **THEN** the TypeScript compiler SHALL reject the call with a type error (property does
  not exist)

### Requirement: ILogger return type is void

All four `ILogger` methods (`info`, `warn`, `error`, `debug`) MUST have a declared return
type of `void`. Consumers MUST NOT rely on any return value from a logging call.

#### Scenario: return value is not used

- **WHEN** a use case calls `logger.info({ msg: "Notice created", noticeId: "1" })` without
  capturing the return value
- **THEN** the TypeScript compiler SHALL accept this usage without error

#### Scenario: return value cannot be assigned

- **WHEN** a TypeScript consumer attempts to assign the result of a logger method call to
  a non-void typed variable
- **THEN** the TypeScript compiler SHALL emit a type error
