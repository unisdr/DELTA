## ADDED Requirements

### Requirement: CoreModule declares and exports DrizzleProvider

`CoreModule` SHALL be a class decorated with `@Module({ providers: [DrizzleProvider], exports: [DrizzleProvider] })` exported from `app/infrastructure/CoreModule.server.ts`. The
`providers` array MUST contain `DrizzleProvider` so the token is resolvable within the
module. The `exports` array MUST also contain `DrizzleProvider` so any module that imports
`CoreModule` can inject `DRIZZLE_CLIENT` without re-declaring the provider.

#### Scenario: CoreModule compiles without error

- **WHEN** `NestFactory.createApplicationContext(CoreModule)` is called with a valid `Dr`
  singleton in scope
- **THEN** the returned promise SHALL resolve to a live `INestApplicationContext` without
  throwing

#### Scenario: DRIZZLE_CLIENT is resolvable from the compiled CoreModule

- **WHEN** a test calls `Test.createTestingModule({ imports: [CoreModule] }).compile()` and
  then calls `module.get(DRIZZLE_CLIENT)`
- **THEN** the returned value SHALL equal the `dr` singleton (or the test double provided
  in the test environment)

#### Scenario: Importing module can inject DRIZZLE_CLIENT

- **GIVEN** a second NestJS module `FeatureModule` declares `imports: [CoreModule]`
- **WHEN** a provider inside `FeatureModule` declares `@Inject(DRIZZLE_CLIENT) private dr: Dr`
- **THEN** NestJS SHALL inject the Drizzle instance without a "No provider for DRIZZLE_CLIENT"
  error

### Requirement: CoreModule does not start an HTTP server

`CoreModule` MUST be bootstrapped exclusively via
`NestFactory.createApplicationContext(CoreModule)`. Calling `NestFactory.create(CoreModule)`
(which starts an HTTP server) SHALL NOT occur anywhere in the server bootstrap sequence.

#### Scenario: No HTTP port is opened during bootstrap

- **WHEN** `initServer()` completes
- **THEN** no TCP listener on any port is created by NestJS — only the application context
  DI container is initialised
