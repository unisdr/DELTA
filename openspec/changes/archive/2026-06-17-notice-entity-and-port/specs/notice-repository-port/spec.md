## ADDED Requirements

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

### Requirement: INoticeRepository.findById is scoped by tenantId

`INoticeRepository.findById(id: string, tenantId: string): Promise<Notice>` MUST be
declared on the interface. The `tenantId` parameter SHALL be the second argument and is
REQUIRED — the method signature MUST NOT make it optional. The implementation (Phase 4g)
MUST use `tenantId` to scope the lookup to a single tenant.

#### Scenario: Method signature is present with correct arity

- **GIVEN** the `INoticeRepository` interface
- **WHEN** a TypeScript class declares `implements INoticeRepository` and omits
  `tenantId` from `findById`
- **THEN** `yarn tsc` MUST report a type error

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

### Requirement: All INoticeRepository methods are explicitly scoped to a single tenant

Every method on `INoticeRepository` that reads from or writes to persistence MUST accept
`tenantId: string` as an explicit parameter. No method MUST assume a global or ambient
tenant context. This enforces the project-wide multi-tenancy rule at the type level.

#### Scenario: All read and write methods carry tenantId

- **GIVEN** the `INoticeRepository` interface signature
- **WHEN** the method list is inspected
- **THEN** `findById`, `findAll`, and `delete` MUST each have `tenantId: string` as a
  parameter
- **AND** `save` receives tenancy implicitly via the `Notice` entity's `tenantId`
  property (the entity itself carries its tenant context)
