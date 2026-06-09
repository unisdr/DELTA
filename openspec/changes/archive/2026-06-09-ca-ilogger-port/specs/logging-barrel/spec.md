## ADDED Requirements

### Requirement: ILogger importable from barrel

`ILogger` SHALL be re-exported by name from `app/shared/logging/index.ts`. Any TypeScript
module that imports `ILogger` from `~/shared/logging` MUST receive the same interface
definition as if it had imported directly from `~/shared/logging/ILogger`.

#### Scenario: named import of ILogger from barrel resolves

- **WHEN** a consumer writes `import type { ILogger } from "~/shared/logging"`
- **THEN** the TypeScript compiler SHALL resolve the import without error and `ILogger`
  SHALL be usable as a type annotation

#### Scenario: barrel does not re-export unknown names

- **WHEN** a consumer attempts to import a name that does not exist in the barrel
  (e.g. `PinoLogger`) from `~/shared/logging`
- **THEN** the TypeScript compiler SHALL emit a "Module has no exported member" error

### Requirement: NoOpLogger importable from barrel

`NoOpLogger` SHALL be re-exported by name from `app/shared/logging/index.ts`. Any
TypeScript module that imports `NoOpLogger` from `~/shared/logging` MUST receive the same
concrete class as if it had imported directly from `~/shared/logging/NoOpLogger`.

#### Scenario: named import of NoOpLogger from barrel resolves

- **WHEN** a consumer writes `import { NoOpLogger } from "~/shared/logging"`
- **THEN** the TypeScript compiler SHALL resolve the import without error and
  `new NoOpLogger()` SHALL be constructible

#### Scenario: NoOpLogger imported from barrel satisfies ILogger

- **WHEN** both `ILogger` and `NoOpLogger` are imported from `~/shared/logging` and
  `new NoOpLogger()` is assigned to a variable typed as `ILogger`
- **THEN** the TypeScript compiler SHALL accept the assignment without error

### Requirement: barrel uses named exports only

The `app/shared/logging/index.ts` barrel MUST use named `export { ... } from "..."` syntax.
It MUST NOT use `export * from "..."` (wildcard re-exports). This matches the pattern
established by `app/shared/errors/index.ts`.

#### Scenario: barrel file uses explicit named exports

- **WHEN** the contents of `app/shared/logging/index.ts` are inspected
- **THEN** each exported name SHALL appear explicitly in an `export { ... }` statement
- **AND** no `export *` statement SHALL be present
