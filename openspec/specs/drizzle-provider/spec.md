## ADDED Requirements

### Requirement: DRIZZLE_CLIENT token is a typed InjectionToken

`DRIZZLE_CLIENT` SHALL be exported from `app/infrastructure/DrizzleProvider.server.ts` as an
`InjectionToken<Dr>` value — specifically a `Symbol` typed as `InjectionToken<Dr>` (see
design.md Decision 1 for why `new InjectionToken<Dr>(...)` is not used in NestJS v11).
It MUST NOT be a plain untyped `string` constant.
All consumers of the Drizzle client via DI MUST import this constant — no inline string
literal `"DRIZZLE_CLIENT"` is permitted at any injection site.

#### Scenario: Token is importable from DrizzleProvider

- **WHEN** a TypeScript consumer imports `DRIZZLE_CLIENT` from
  `~/infrastructure/DrizzleProvider.server`
- **THEN** the imported value SHALL be a `symbol` assignable to `InjectionToken<Dr>`

#### Scenario: Token string duplicate is rejected by TypeScript

- **WHEN** a TypeScript consumer declares `@Inject("DRIZZLE_CLIENT")` using a plain
  string literal instead of the exported constant
- **THEN** NestJS SHALL resolve a different (likely empty) provider slot — the typed
  token SHALL NOT match the plain string — making the type mismatch diagnosable at
  code-review time

### Requirement: DrizzleProvider registers dr singleton under DRIZZLE_CLIENT

`DrizzleProvider` SHALL be a NestJS provider descriptor object exported from
`app/infrastructure/DrizzleProvider.server.ts` with `provide: DRIZZLE_CLIENT` and
`useFactory: () => dr` (where `dr` is the Drizzle singleton from `~/db.server`).
The factory MUST NOT accept any inject array — it reads `dr` directly from the
already-initialised module-level singleton.

#### Scenario: Provider resolves to the dr singleton after initDB

- **GIVEN** `initDB()` has been called so `dr` is a live `Dr` instance
- **WHEN** a NestJS module compiles `DrizzleProvider` and resolves `DRIZZLE_CLIENT`
- **THEN** the resolved value SHALL be the same object reference as `dr` exported from
  `~/db.server`

#### Scenario: Provider descriptor has the correct provide key

- **WHEN** the `DrizzleProvider` object is inspected at runtime
- **THEN** its `provide` property SHALL equal the `DRIZZLE_CLIENT` token constant
- **AND** its `useFactory` property SHALL be a function

#### Scenario: Concurrent resolution of DRIZZLE_CLIENT

- **GIVEN** two callers simultaneously call `appContext.get(DRIZZLE_CLIENT)` on the
  bootstrapped application context
- **WHEN** both calls resolve
- **THEN** both callers SHALL receive the identical `Dr` object reference — NestJS
  singleton scope guarantees a single provider instance across the lifetime of the context
