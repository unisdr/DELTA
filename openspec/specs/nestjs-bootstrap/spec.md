## ADDED Requirements

### Requirement: initServer executes initDB before NestJS bootstrap

`initServer()` MUST call `initDB()` before calling
`NestFactory.createApplicationContext(CoreModule)`. This ordering constraint is normative
and MUST NOT be relaxed. The `dr` singleton MUST be assigned (non-undefined) at the point
when the `DrizzleProvider` factory executes.

#### Scenario: initDB runs first — Drizzle singleton is available to the factory

- **GIVEN** `DATABASE_URL` is set in the environment
- **WHEN** `initServer()` is called
- **THEN** `initDB()` SHALL execute and assign `dr` before `NestFactory.createApplicationContext`
  is awaited
- **AND** the `DrizzleProvider` factory SHALL receive a non-undefined `Dr` instance

#### Scenario: initDB missing causes NestJS to fail visibly

- **GIVEN** `initDB()` has not been called (simulated by an undefined `dr` reference)
- **WHEN** `NestFactory.createApplicationContext(CoreModule)` resolves and a consumer
  calls `appContext.get(DRIZZLE_CLIENT)`
- **THEN** the resolved value SHALL be `undefined` OR the `DrizzleProvider` factory SHALL
  throw — in either case, the failure MUST surface at bootstrap time, not silently later

### Requirement: getAppContext returns the bootstrapped INestApplicationContext

`app/init.server.tsx` SHALL export a `getAppContext()` function that returns the
`INestApplicationContext` instance created during `initServer()`. Calling `getAppContext()`
before `initServer()` completes MUST throw an `Error` with a message that identifies the
cause (e.g. "NestJS application context has not been initialised").

#### Scenario: getAppContext returns context after successful bootstrap

- **GIVEN** `initServer()` has been called and its returned promise has resolved
- **WHEN** any server-side code calls `getAppContext()`
- **THEN** the returned value SHALL be the same `INestApplicationContext` that was
  created by `NestFactory.createApplicationContext(CoreModule)`
- **AND** `appContext.get(DRIZZLE_CLIENT)` on the returned context SHALL resolve to the
  `dr` singleton

#### Scenario: getAppContext throws before bootstrap

- **GIVEN** `initServer()` has not yet been called (or not yet awaited)
- **WHEN** code calls `getAppContext()`
- **THEN** it SHALL throw an `Error`
- **AND** the error message SHALL contain enough information for a developer to identify
  that the DI container has not been initialised

#### Scenario: initServer is idempotent — second call does not create a second context

- **GIVEN** `initServer()` has already been called once and resolved
- **WHEN** `initServer()` is called a second time
- **THEN** the function SHOULD guard against creating a duplicate application context —
  either by checking whether the context is already present and skipping bootstrap, or by
  explicitly documenting that double-initialisation is a caller error
