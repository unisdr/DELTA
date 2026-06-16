## Why

NestJS (`@nestjs/core`, `@nestjs/common`) and `reflect-metadata` were installed in Phase 3a
of the Notices Pilot Clean Architecture migration, but no DI container has been wired up.
Without a bootstrapped application context, downstream domain modules (use cases, repositories)
have no mechanism to declare or receive injected dependencies. This change bootstraps
`NestFactory.createApplicationContext()` with a `CoreModule` that makes the Drizzle `dr`
singleton available under a typed `DRIZZLE_CLIENT` injection token — the minimum DI
infrastructure required before any domain module can be wired.

## What Changes

- **New file** `app/infrastructure/CoreModule.server.ts` — a NestJS `@Module` that declares
  `DrizzleProvider` in its `providers` array and exports it, so any module that imports
  `CoreModule` can inject the Drizzle client. The `.server.ts` suffix is required because
  this file transitively imports from `~/db.server`.
- **New file** `app/infrastructure/DrizzleProvider.server.ts` — a `useFactory` provider that
  reads the `dr` singleton (already initialised by `initDB()`) and registers it under
  the `DRIZZLE_CLIENT` typed injection token. Also exports the `DRIZZLE_CLIENT` token
  constant so consumers import it from one place. The `.server.ts` suffix is required
  because this file imports directly from `~/db.server`.
- **Modified file** `app/init.server.tsx` — `initServer()` becomes `async`; after the
  existing `initDB()` call, it calls `NestFactory.createApplicationContext(CoreModule)`
  and stores the returned `INestApplicationContext` in a module-level variable. A new
  `getAppContext()` export allows domain code to access the container.
- **Remove** `app/infrastructure/.gitkeep` — the placeholder is no longer needed once
  real files occupy the directory.

No DB migration is required. No routes, models, handlers, or fieldsDef pipelines are touched.

## Capabilities

### New Capabilities

- `drizzle-provider`: The `DrizzleProvider` factory provider — that it registers the `dr`
  singleton under the `DRIZZLE_CLIENT` token, that the token is typed as
  `InjectionToken<Dr>`, and that the provider is exportable from `CoreModule`.
- `core-module`: The `CoreModule` NestJS module — that it declares `DrizzleProvider`,
  that it exports `DrizzleProvider`, and that `NestFactory.createApplicationContext(CoreModule)`
  resolves without error.
- `nestjs-bootstrap`: The `initServer()` async bootstrap sequence — that `initDB()` runs
  first, that `NestFactory.createApplicationContext(CoreModule)` is called after, that the
  resulting context is accessible via `getAppContext()`, and that calling `getAppContext()`
  before bootstrap throws a clear error.

### Modified Capabilities

(none — no existing spec-level behaviour changes)

## Impact

- **`app/infrastructure/CoreModule.server.ts`** — new file; NestJS module declaration.
- **`app/infrastructure/DrizzleProvider.server.ts`** — new file; DI token + factory provider.
- **`app/init.server.tsx`** — modified; `initServer` becomes `async`, stores the NestJS
  application context.
- **`app/infrastructure/.gitkeep`** — removed (directory no longer empty).
- **`app/entry.server.tsx`** — NOT modified. `initServer()` is already called without
  `await` there; the NestJS bootstrap will settle asynchronously. If the entry point must
  await the context, that is a separate concern for the consuming use case (which calls
  `getAppContext()` inside a loader/action where `await` is available).
- **Security / multi-tenancy**: not applicable — no data access surface, no auth surface.
  The Drizzle client is the same singleton already accessible globally; DI registration
  adds no new access path.
- **DB migration**: not required.
- **Test approach**: `@nestjs/testing` `Test.createTestingModule([CoreModule])` — the
  module is compiled in isolation, the `DRIZZLE_CLIENT` token is resolved, and the
  returned value is compared to the `dr` singleton. No PGlite needed (the DrizzleProvider
  wraps the existing singleton; the test stubs `dr` directly). Uses `yarn test:run2`
  (Vitest + PGlite suite).
- **tsconfig.json**: `experimentalDecorators` and `emitDecoratorMetadata` must be added
  because NestJS `@Module()` and `@Injectable()` decorators require them even when using
  the application context (no HTTP) mode.
