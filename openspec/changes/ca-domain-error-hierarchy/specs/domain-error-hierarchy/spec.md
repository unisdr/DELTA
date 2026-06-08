## ADDED Requirements

### Requirement: DomainError base class
`DomainError` SHALL be an abstract TypeScript class that extends the built-in `Error`. It SHALL
declare two abstract readonly properties — `code: string` and `statusHint: number` — that every
concrete subclass MUST implement. Its constructor SHALL accept a `message: string` and an
optional `context?: Record<string, unknown>`, store `context` as a public readonly property, and
set `this.name` to the runtime constructor name so that error logs identify the concrete type.

#### Scenario: Instantiate a concrete subclass — name field set correctly
- **WHEN** a concrete `DomainError` subclass is constructed
- **THEN** `err.name` SHALL equal the class name of the concrete subclass (not `"Error"`)

#### Scenario: Instantiate a concrete subclass — message field set correctly
- **WHEN** a concrete `DomainError` subclass is constructed with a given message string
- **THEN** `err.message` SHALL equal that message string

#### Scenario: Context is optional — absent by default
- **WHEN** a `DomainError` subclass constructor is called without passing a `context` argument
- **THEN** `err.context` SHALL be `undefined`

#### Scenario: Context is preserved when provided
- **WHEN** a `DomainError` subclass constructor is called with a `context` record
- **THEN** `err.context` SHALL deep-equal that record

#### Scenario: instanceof checks hold for base and subclass
- **WHEN** a concrete subclass instance is constructed
- **THEN** `err instanceof DomainError` SHALL be `true`
- **AND** `err instanceof Error` SHALL be `true`
- **AND** `err instanceof ConcreteSubclass` SHALL be `true`

---

### Requirement: NotFoundError
`NotFoundError` SHALL extend `DomainError` with `code = 'NOT_FOUND'` and `statusHint = 404`.
Its constructor SHALL accept `entity: string` and `id: string`, set
`message` to `"${entity} not found"`, and populate `context` with `{ entity, id }`.

#### Scenario: Correct code and statusHint
- **WHEN** `new NotFoundError('Notice', '123')` is constructed
- **THEN** `err.code` SHALL equal `'NOT_FOUND'`
- **AND** `err.statusHint` SHALL equal `404`

#### Scenario: Correct message derived from entity name
- **WHEN** `new NotFoundError('Notice', '123')` is constructed
- **THEN** `err.message` SHALL equal `'Notice not found'`

#### Scenario: Context carries entity and id
- **WHEN** `new NotFoundError('Notice', '123')` is constructed
- **THEN** `err.context` SHALL deep-equal `{ entity: 'Notice', id: '123' }`

#### Scenario: name matches class name
- **WHEN** `new NotFoundError('Notice', '123')` is constructed
- **THEN** `err.name` SHALL equal `'NotFoundError'`

---

### Requirement: ValidationError
`ValidationError` SHALL extend `DomainError` with `code = 'VALIDATION_ERROR'` and
`statusHint = 422`. Its constructor SHALL accept the standard `DomainError` base constructor
arguments (`message: string`, optional `context?: Record<string, unknown>`).

#### Scenario: Correct code and statusHint
- **WHEN** `new ValidationError('Name is required')` is constructed
- **THEN** `err.code` SHALL equal `'VALIDATION_ERROR'`
- **AND** `err.statusHint` SHALL equal `422`

#### Scenario: Message passed through
- **WHEN** `new ValidationError('Name is required')` is constructed
- **THEN** `err.message` SHALL equal `'Name is required'`

#### Scenario: Context passed through when provided
- **WHEN** `new ValidationError('Invalid', { field: 'name' })` is constructed
- **THEN** `err.context` SHALL deep-equal `{ field: 'name' }`

#### Scenario: name matches class name
- **WHEN** `new ValidationError('Name is required')` is constructed
- **THEN** `err.name` SHALL equal `'ValidationError'`

---

### Requirement: AuthorizationError
`AuthorizationError` SHALL extend `DomainError` with `code = 'FORBIDDEN'` and
`statusHint = 403`. Its constructor SHALL accept the standard `DomainError` base constructor
arguments (`message: string`, optional `context?: Record<string, unknown>`).

#### Scenario: Correct code and statusHint
- **WHEN** `new AuthorizationError('Insufficient permissions')` is constructed
- **THEN** `err.code` SHALL equal `'FORBIDDEN'`
- **AND** `err.statusHint` SHALL equal `403`

#### Scenario: Message passed through
- **WHEN** `new AuthorizationError('Insufficient permissions')` is constructed
- **THEN** `err.message` SHALL equal `'Insufficient permissions'`

#### Scenario: name matches class name
- **WHEN** `new AuthorizationError('Insufficient permissions')` is constructed
- **THEN** `err.name` SHALL equal `'AuthorizationError'`

---

### Requirement: ConflictError
`ConflictError` SHALL extend `DomainError` with `code = 'CONFLICT'` and `statusHint = 409`.
Its constructor SHALL accept the standard `DomainError` base constructor arguments
(`message: string`, optional `context?: Record<string, unknown>`).

#### Scenario: Correct code and statusHint
- **WHEN** `new ConflictError('Notice already exists')` is constructed
- **THEN** `err.code` SHALL equal `'CONFLICT'`
- **AND** `err.statusHint` SHALL equal `409`

#### Scenario: Message passed through
- **WHEN** `new ConflictError('Notice already exists')` is constructed
- **THEN** `err.message` SHALL equal `'Notice already exists'`

#### Scenario: name matches class name
- **WHEN** `new ConflictError('Notice already exists')` is constructed
- **THEN** `err.name` SHALL equal `'ConflictError'`

---

### Requirement: Barrel export
The module `app/shared/errors/index.ts` SHALL re-export `DomainError`, `NotFoundError`,
`ValidationError`, `AuthorizationError`, and `ConflictError` so that consumers import from
`~/shared/errors` using a single import statement.

#### Scenario: All five names importable from the barrel
- **WHEN** a consumer imports `{ DomainError, NotFoundError, ValidationError, AuthorizationError, ConflictError }` from `~/shared/errors`
- **THEN** all five names SHALL resolve to the correct classes without TypeScript errors

#### Scenario: Barrel import preserves instanceof relationship
- **WHEN** an instance is created via a class imported from the barrel
- **THEN** `err instanceof DomainError` SHALL be `true` when tested with `DomainError` also
  imported from the same barrel

---

### Requirement: Domain layer has no framework dependencies
`DomainError.ts` and `index.ts` SHALL NOT import any module from Drizzle, React Router,
Express, Node.js built-ins beyond the `Error` global, or any other framework or third-party
library. The error classes MUST be usable in both server and client execution contexts.

#### Scenario: No framework import at the module level
- **WHEN** `app/shared/errors/DomainError.ts` is statically analysed for import statements
- **THEN** zero imports from `drizzle-orm`, `react-router`, `express`, or `~/backend.server`
  SHALL be present

---

### Requirement: Abstract members enforced by TypeScript
`DomainError` SHALL declare `code` and `statusHint` as `abstract readonly`. Any class that
extends `DomainError` but does not declare both properties SHALL produce a TypeScript
compile error.

#### Scenario: Missing code causes compile error
- **WHEN** a class extends `DomainError` and omits the `code` property
- **THEN** `yarn tsc` SHALL report a type error (non-abstract class does not implement
  inherited abstract member `code`)

#### Scenario: Missing statusHint causes compile error
- **WHEN** a class extends `DomainError` and omits the `statusHint` property
- **THEN** `yarn tsc` SHALL report a type error (non-abstract class does not implement
  inherited abstract member `statusHint`)
