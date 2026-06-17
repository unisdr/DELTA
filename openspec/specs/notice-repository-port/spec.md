# notice-repository-port Specification

## Purpose
TBD - created by archiving change notice-entity-and-port. Update Purpose after archive.
## Requirements
### Requirement: INoticeRepository interface compiles as a valid TypeScript port

The file `app/domains/notices/application/ports/INoticeRepository.ts` MUST export an
interface named `INoticeRepository`. It MUST declare exactly the four methods listed
below with the exact signatures shown. The file MUST NOT import from any framework,
Drizzle, or Remix module — only from `app/domains/notices/domain/Notice.ts` and
`app/shared/types/`. TypeScript compilation (`yarn tsc`) MUST succeed with zero errors
after this file is created.

#### Scenario: TypeScript compilation succeeds

- **GIVEN** `INoticeRepository.ts` is written with the correct method signatures
- **WHEN** `yarn tsc` is run
- **THEN** it MUST exit with code 0 and zero type errors referencing this file

### Requirement: INoticeRepository.findById is scoped by tenantId and MUST throw NotFoundError when no match exists

`INoticeRepository.findById(id: string, tenantId: string): Promise<Notice>` MUST be
declared on the interface. The `tenantId` parameter SHALL be the second argument and is
REQUIRED — the method signature MUST NOT make it optional. The implementation (Phase 4g)
MUST use `tenantId` to scope the lookup to a single tenant. When no notice exists for the
given `id` + `tenantId` pair, the implementation MUST throw `NotFoundError` (from
`app/shared/errors/`) — it MUST NOT return `null` or `undefined`. Callers catch
`NotFoundError` rather than checking for a null return value.

#### Scenario: Method signature is present with correct arity

- **GIVEN** the `INoticeRepository` interface
- **WHEN** a TypeScript class declares `implements INoticeRepository` and omits
  `tenantId` from `findById`
- **THEN** `yarn tsc` MUST report a type error

#### Scenario: No matching notice throws NotFoundError

- **GIVEN** an implementation of `INoticeRepository`
- **WHEN** `findById` is called with an `id` + `tenantId` pair that does not exist in
  the store
- **THEN** it MUST throw `NotFoundError`
- **AND** it MUST NOT return `null`, `undefined`, or resolve the `Promise` silently

### Requirement: INoticeRepository.findAll MUST be scoped by tenantId and MUST accept Pagination

`INoticeRepository.findAll(tenantId: string, pagination: Pagination): Promise<Notice[]>` MUST be declared on the interface. The `Pagination` type MUST be imported from
`app/shared/types/` — it MUST NOT be inline or duplicated. The `tenantId` parameter is
REQUIRED and MUST be the first argument.

#### Scenario: Method signature is present with Pagination parameter

- **GIVEN** the `INoticeRepository` interface
- **WHEN** a TypeScript class declares `implements INoticeRepository` and omits
  `pagination` from `findAll`
- **THEN** `yarn tsc` MUST report a type error

### Requirement: INoticeRepository.save accepts and returns a Notice

`INoticeRepository.save(notice: Notice): Promise<Notice>` MUST be declared on the
interface. The method MUST accept a `Notice` domain entity and MUST return a `Promise`
resolving to a `Notice`. The implementation (Phase 4g) MAY perform either an INSERT or
an UPDATE depending on whether the entity already exists.

#### Scenario: Method signature is present

- **GIVEN** the `INoticeRepository` interface
- **WHEN** a TypeScript class omits the `save` method
- **THEN** `yarn tsc` MUST report a type error for the missing implementation

### Requirement: INoticeRepository.delete is scoped by tenantId and returns void

`INoticeRepository.delete(id: string, tenantId: string): Promise<void>` MUST be declared
on the interface. The `tenantId` parameter is REQUIRED and is the second argument. The
return type MUST be `Promise<void>` — callers MUST NOT expect a return value.

#### Scenario: Method signature is present with correct return type

- **GIVEN** the `INoticeRepository` interface
- **WHEN** a TypeScript class declares the method but returns `Promise<Notice>` instead
  of `Promise<void>`
- **THEN** `yarn tsc` MUST report a type error

### Requirement: INoticeRepository methods MUST enforce single-tenant scoping — save is the sole explicit exception

`findById`, `findAll`, and `delete` MUST each accept `tenantId: string` as an explicit
parameter. No implementation of these three methods MUST assume a global or ambient
tenant context. `save` is the sole intentional exception: it receives tenant context
implicitly via `notice.tenantId` on the entity itself, because the entity already carries
its own tenant identity and adding a redundant parameter would create a mismatch risk if
the two values diverged. This enforces the project-wide multi-tenancy rule at the type
level for all four methods.

#### Scenario: Read and delete methods carry explicit tenantId

- **GIVEN** the `INoticeRepository` interface signature
- **WHEN** the method list is inspected
- **THEN** `findById`, `findAll`, and `delete` MUST each have `tenantId: string` as a
  required parameter

#### Scenario: save is explicitly exempted — tenancy is carried by the entity

- **GIVEN** the `INoticeRepository` interface signature
- **WHEN** `save(notice: Notice)` is inspected
- **THEN** it MUST NOT have a separate `tenantId` parameter
- **AND** the implementation MUST derive the tenant from `notice.tenantId`

