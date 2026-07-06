### Requirement: NoticesModule compiles without error
`NoticesModule` SHALL compile into a valid NestJS `TestingModule` when passed to
`Test.createTestingModule`. No error MUST be thrown during `compile()`.

#### Scenario: Module compiles successfully
- **WHEN** `Test.createTestingModule({ imports: [NoticesModule] }).compile()` is called
- **THEN** the returned module is defined and no exception is thrown

### Requirement: NOTICE_REPOSITORY resolves to DrizzleNoticeRepository
`NoticesModule` SHALL register `DrizzleNoticeRepository` under the `NOTICE_REPOSITORY`
injection token. Calling `module.get(NOTICE_REPOSITORY)` MUST return an instance of
`DrizzleNoticeRepository`.

#### Scenario: Token resolves to the correct adapter
- **WHEN** `module.get(NOTICE_REPOSITORY)` is called on a compiled `NoticesModule`
- **THEN** the returned value is an instance of `DrizzleNoticeRepository`

#### Scenario: Token resolves to the same singleton on repeated gets
- **WHEN** `module.get(NOTICE_REPOSITORY)` is called twice on the same compiled module
- **THEN** both calls return the exact same object reference (NestJS singleton scope)

### Requirement: CreateNoticeUseCase is resolvable from NoticesModule
`NoticesModule` SHALL export `CreateNoticeUseCase` such that
`module.get(CreateNoticeUseCase)` resolves to a defined instance.

#### Scenario: CreateNoticeUseCase resolves to a defined instance
- **WHEN** `module.get(CreateNoticeUseCase)` is called on a compiled `NoticesModule`
- **THEN** the returned value is defined and not null

### Requirement: ListNoticesUseCase is resolvable from NoticesModule
`NoticesModule` SHALL export `ListNoticesUseCase` such that
`module.get(ListNoticesUseCase)` resolves to a defined instance.

#### Scenario: ListNoticesUseCase resolves to a defined instance
- **WHEN** `module.get(ListNoticesUseCase)` is called on a compiled `NoticesModule`
- **THEN** the returned value is defined and not null

### Requirement: GetNoticeByIdUseCase is resolvable from NoticesModule
`NoticesModule` SHALL export `GetNoticeByIdUseCase` such that
`module.get(GetNoticeByIdUseCase)` resolves to a defined instance.

#### Scenario: GetNoticeByIdUseCase resolves to a defined instance
- **WHEN** `module.get(GetNoticeByIdUseCase)` is called on a compiled `NoticesModule`
- **THEN** the returned value is defined and not null

### Requirement: NOTICE_REPOSITORY token is a typed Symbol
The `NOTICE_REPOSITORY` token SHALL be a `Symbol`-based `InjectionToken<INoticeRepository>`.
Using the plain string `"NOTICE_REPOSITORY"` at an injection site MUST NOT resolve the
same provider (consistent with the `DRIZZLE_CLIENT` pattern).

#### Scenario: Token identity — symbol not string
- **WHEN** the `NOTICE_REPOSITORY` constant is inspected
- **THEN** `typeof NOTICE_REPOSITORY` is `"symbol"`

### Requirement: Concurrent NoticesModule compilation does not error
Two concurrent `Test.createTestingModule({ imports: [NoticesModule] }).compile()` calls
SHALL each succeed and each independently resolve all three use cases and
`NOTICE_REPOSITORY` without interfering with each other.

#### Scenario: Concurrent compilation produces independent containers
- **WHEN** two `Test.createTestingModule({ imports: [NoticesModule] }).compile()` calls
  are awaited concurrently via `Promise.all`
- **THEN** both compiled modules are defined, and each independently resolves
  `CreateNoticeUseCase`, `ListNoticesUseCase`, `GetNoticeByIdUseCase`, and
  `NOTICE_REPOSITORY` to defined values

### Requirement: NoticesModule use-case factories construct loggers via getPinoLogger
`NoticesModule` (`app/domains/notices/infrastructure/NoticesModule.server.ts`) SHALL construct
each of `CreateNoticeUseCase`, `ListNoticesUseCase`, and `GetNoticeByIdUseCase`'s `ILogger`
dependency via `getPinoLogger()` (`app/infrastructure/logging/PinoLogger.server.ts`) in its
`useFactory` providers, rather than `new NoOpLogger()`. The `inject: [NOTICE_REPOSITORY]`
dependency array MUST remain unchanged — `getPinoLogger()` is a plain function call and
requires no injection token.

#### Scenario: CreateNoticeUseCase resolves with a PinoLogger-backed logger
- **WHEN** `Test.createTestingModule({ imports: [NoticesModule] }).compile()` resolves
  `CreateNoticeUseCase`
- **THEN** the resolved instance is defined
- **AND** the module's `useFactory` for `CreateNoticeUseCase` MUST have constructed it using
  `getPinoLogger()`, not `new NoOpLogger()`

#### Scenario: ListNoticesUseCase resolves with a PinoLogger-backed logger
- **WHEN** `Test.createTestingModule({ imports: [NoticesModule] }).compile()` resolves
  `ListNoticesUseCase`
- **THEN** the resolved instance is defined
- **AND** the module's `useFactory` for `ListNoticesUseCase` MUST have constructed it using
  `getPinoLogger()`, not `new NoOpLogger()`

#### Scenario: GetNoticeByIdUseCase resolves with a PinoLogger-backed logger
- **WHEN** `Test.createTestingModule({ imports: [NoticesModule] }).compile()` resolves
  `GetNoticeByIdUseCase`
- **THEN** the resolved instance is defined
- **AND** the module's `useFactory` for `GetNoticeByIdUseCase` MUST have constructed it using
  `getPinoLogger()`, not `new NoOpLogger()`

#### Scenario: existing module-wiring behaviour is unchanged by the logger swap
- **WHEN** `NoticesModule` is compiled via `Test.createTestingModule` after this change
- **THEN** `NOTICE_REPOSITORY` still resolves to a `DrizzleNoticeRepository` instance, still
  resolves to the same singleton on repeated `get` calls, and remains a symbol-based token,
  exactly as before this change
- **AND** two concurrent `Test.createTestingModule({ imports: [NoticesModule] }).compile()`
  calls still each independently resolve all three use cases and `NOTICE_REPOSITORY` without
  interfering with each other
