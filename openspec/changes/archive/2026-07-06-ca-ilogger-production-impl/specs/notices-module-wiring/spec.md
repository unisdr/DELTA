## ADDED Requirements

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
