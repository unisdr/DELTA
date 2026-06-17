# notice-entity Specification

## Purpose
TBD - created by archiving change notice-entity-and-port. Update Purpose after archive.
## Requirements
### Requirement: Notice entity construction via validated factory

The `Notice` domain entity in `app/domains/notices/domain/Notice.ts` SHALL only be
instantiated through the static `Notice.create(props)` factory. The private constructor
MUST be inaccessible to callers outside the class. The factory MUST validate its input
before constructing the entity and MUST throw `ValidationError` (from
`app/shared/errors/`) on any invariant violation.

#### Scenario: Happy path — valid titleJson with one locale, isPublished false, publishedAt null

- **GIVEN** a props object where `titleJson` is `{ en: "My Notice" }`, `isPublished` is
  `false`, and `publishedAt` is `null`
- **WHEN** `Notice.create(props)` is called
- **THEN** it MUST return a `Notice` instance whose `titleJson`, `isPublished`, and
  `publishedAt` properties match the input exactly

#### Scenario: Happy path — valid titleJson with multiple locales

- **GIVEN** a props object where `titleJson` is `{ en: "My Notice", fr: "Mon Avis" }`,
  `isPublished` is `false`, and `publishedAt` is `null`
- **WHEN** `Notice.create(props)` is called
- **THEN** it MUST return a `Notice` instance without throwing

#### Scenario: Happy path — isPublished true with publishedAt set

- **GIVEN** a props object where `titleJson` is `{ en: "Published" }`, `isPublished` is
  `true`, and `publishedAt` is a valid `Date`
- **WHEN** `Notice.create(props)` is called
- **THEN** it MUST return a `Notice` instance without throwing

#### Scenario: Failure — empty titleJson object throws ValidationError

- **GIVEN** a props object where `titleJson` is `{}`
- **WHEN** `Notice.create(props)` is called
- **THEN** it MUST throw a `ValidationError`
- **AND** the error message MUST reference the `titleJson` field

#### Scenario: Failure — titleJson with only whitespace-only locale values throws ValidationError

- **GIVEN** a props object where `titleJson` is `{ en: "   ", fr: "" }`
- **WHEN** `Notice.create(props)` is called
- **THEN** it MUST throw a `ValidationError`

#### Scenario: Failure — publishedAt non-null when isPublished is false throws ValidationError

- **GIVEN** a props object where `titleJson` is `{ en: "Draft" }`, `isPublished` is
  `false`, and `publishedAt` is a valid `Date` (non-null)
- **WHEN** `Notice.create(props)` is called
- **THEN** it MUST throw a `ValidationError`
- **AND** the error message MUST reference the `publishedAt` / `isPublished` invariant

### Requirement: Notice entity exposes all domain properties read-only

The `Notice` instance returned by `Notice.create()` MUST expose every column in the
`noticesTable` schema as a read-only property: `id`, `tenantId`, `titleJson`, `bodyJson`,
`isPublished`, `audience`, `publishedAt`, `createdAt`, and `updatedAt`. No property
MUST be mutable after construction.

#### Scenario: Properties are accessible after construction

- **GIVEN** a `Notice` instance created by `Notice.create(props)`
- **WHEN** each property is read
- **THEN** it MUST return the value that was passed in `props`

### Requirement: Notice.create() is a pure function with no shared mutable state

`Notice.create()` MUST be a pure function. It MUST NOT read from or write to any
module-level variable, cache, counter, or singleton. Every invocation MUST be
independently deterministic.

#### Scenario: Two sequential calls with valid input return independent instances

- **GIVEN** two sequential calls to `Notice.create(props)` with identical valid input
- **WHEN** both calls complete
- **THEN** each MUST return its own independent `Notice` instance
- **AND** the two results MUST NOT be the same object reference
- **AND** both results MUST reflect the input props correctly

#### Scenario: Two sequential calls with invalid input each throw their own independent error

- **GIVEN** two sequential calls to `Notice.create(props)` with identical invalid input
  (empty `titleJson`)
- **WHEN** both calls complete
- **THEN** each MUST throw its own `ValidationError` independently
- **AND** one call's error MUST NOT suppress or alter the other's

