## Context

Phase 3a of the Notices Pilot Clean Architecture migration installed `@nestjs/core`,
`@nestjs/common`, `@nestjs/testing`, and `reflect-metadata`. The project now has the NestJS
packages present but no bootstrapped DI container. The Drizzle client singleton `dr` is
created in `app/db.server.ts` by `initDB()` (synchronous) and stored as a module-level
`let dr: Dr`. No NestJS infrastructure files exist in `app/infrastructure/` beyond a
`.gitkeep` placeholder.

The project's TypeScript config (`tsconfig.json`) currently has neither
`experimentalDecorators` nor `emitDecoratorMetadata` set. NestJS decorators
(`@Module`, `@Injectable`, `@Inject`) require both flags. These must be added before the
NestJS files compile.

`reflect-metadata` is already imported at the top of `app/entry.server.tsx` (line 1), so
the polyfill is available in the server runtime. The test harness (`vitest.config.ts`) uses
the same Vite config, so the import will resolve in tests as well — but the test file for
this change must import `reflect-metadata` explicitly at its top (or via a setup import)
to avoid "Reflect is not defined" errors in the Vitest environment.

## Goals / Non-Goals

**Goals:**

- Define a typed `DRIZZLE_CLIENT` injection token (an `InjectionToken<Dr>`) exported from
  `DrizzleProvider.server.ts` so consumers never use a raw string.
- Implement `DrizzleProvider` as a `useFactory` provider that returns the already-initialised
  `dr` singleton.
- Implement `CoreModule` as the root NestJS module that provides and exports `DrizzleProvider`.
- Update `initServer()` to be `async`, call `NestFactory.createApplicationContext(CoreModule)`
  after `initDB()`, and store the result so `getAppContext()` can return it.
- Add `experimentalDecorators: true` and `emitDecoratorMetadata: true` to `tsconfig.json`.
- Write an integration test using `Test.createTestingModule([CoreModule])` that confirms
  `DRIZZLE_CLIENT` resolves to the `dr` singleton.

**Non-Goals:**

- Starting an HTTP server — `NestFactory.create()` is NOT used; only
  `NestFactory.createApplicationContext()`.
- Adding rxjs as a first-class domain dependency — it is installed as a required peer
  dependency of `@nestjs/common` (which imports from `rxjs/operators`), but it is not
  used directly in application code.
- Wiring any domain module (notices, events) into `CoreModule` — that is per-module work.
- Implementing the Pino logger adapter — that is ADR-004 Phase 3.
- Modifying `app/entry.server.tsx` to `await initServer()` — the React Router entry point
  pattern does not support top-level await in this way; `getAppContext()` is designed to be
  called lazily from within async loaders/actions.

## Decisions

### Decision 1: `DRIZZLE_CLIENT` as a typed `InjectionToken<Dr>`, not a string

**Implementation note (deviation from original draft):** In NestJS v11, `InjectionToken<T>`
is a TypeScript type alias (`string | symbol | Type<T> | Abstract<T> | Function`), NOT a
constructable class. The Angular-style `new InjectionToken<Dr>("DRIZZLE_CLIENT")` does not
exist in NestJS v11 and would throw "InjectionToken is not a constructor" at runtime.

The actual implementation uses:
```typescript
export const DRIZZLE_CLIENT: InjectionToken<Dr> = Symbol("DRIZZLE_CLIENT");
```

A `Symbol` typed as `InjectionToken<Dr>` satisfies all the original goals:
- TypeScript infers the correct type at the injection site — no `as Dr` cast needed.
- `Symbol` is inherently unique — zero collision risk.
- It is discoverable: searching for `DRIZZLE_CLIENT` finds all consumers.

Alternatives rejected:
- **Plain string `"DRIZZLE_CLIENT"`** — no type safety; prone to typos.
- **`new InjectionToken<Dr>(...)`** — does not exist in NestJS v11; Angular-only pattern.

### Decision 2: `useFactory` provider rather than `useValue`

The `dr` singleton does not exist at module-definition time (it is assigned by `initDB()`
which runs synchronously before the NestJS bootstrap call). However, by the time
`NestFactory.createApplicationContext()` is called, `initDB()` has already completed.
Either `useFactory: () => dr` or `useValue: dr` would work at runtime.

`useFactory` is preferred because:
- It defers the read of `dr` to the point when the provider resolves, not to the point when
  the provider descriptor object is constructed (import time).
- It makes the dependency on `initDB()` having been called first explicit — if `dr` is
  `undefined` at factory time, it will fail loudly at context creation rather than silently
  binding `undefined`.
- It follows the pattern all future providers (e.g. Pino logger) will use.

### Decision 3: `CoreModule` is a thin delegation module

`CoreModule` declares only `DrizzleProvider` in its `providers` array and re-exports it.
Domain modules (e.g. `NoticesModule`) import `CoreModule` to gain access to `DRIZZLE_CLIENT`
without directly depending on `DrizzleProvider`. This follows the NestJS module encapsulation
pattern and avoids re-declaring the same provider in every consuming module.

### Decision 4: `getAppContext()` guard — throw on premature access

The NestJS application context is stored in a module-level `let appContext: INestApplicationContext | undefined`. `getAppContext()` checks for `undefined` and throws an
`Error("NestJS application context has not been initialised. Call initServer() first.")` if
called before `initServer()` completes. This matches the behaviour of `dr` itself (which is
`undefined` before `initDB()` runs) and ensures failure-fast semantics rather than returning
`undefined` silently.

### Decision 5: `initServer()` remains fire-and-forget from `entry.server.tsx`

`app/entry.server.tsx` calls `initServer()` synchronously (no `await`). Making the call
`await initServer()` in the entry point would require top-level await support in the React
Router server bundle — which is not guaranteed. Instead:
- `initServer()` is declared `async` and starts the NestJS bootstrap, which returns a
  `Promise<INestApplicationContext>`.
- The caller in `entry.server.tsx` does not need to `await` it; the first incoming HTTP
  request will not reach a loader/action that calls `getAppContext()` before the Node.js
  event loop has had a chance to settle the bootstrap promise (NestJS application context
  bootstrap is fast — it is synchronous module resolution under the hood).
- If strict sequencing is required in future (e.g. a health-check endpoint), a future
  change can make the entry point await the init promise explicitly.

### Decision 6: Test approach — `Test.createTestingModule` without PGlite

`Test.createTestingModule([CoreModule])` in `@nestjs/testing` compiles the module graph
and resolves providers. It does not open a real DB connection. The test stubs `dr` by
importing `~/db.server` and providing a fake `Dr`-typed object, then passes
`{ provide: DRIZZLE_CLIENT, useValue: fakeDr }` as an override — or simply imports
`CoreModule` with the real `useFactory: () => dr` and verifies that the result equals
the `dr` singleton imported in the test. Since `vitest.config.ts` includes the global
`tests/integration/db/setup.ts` (which mocks `~/db.server`), the PGlite `dr` mock will
be active, and the resolved token value will equal the mocked `dr`. This makes the test
runnable in the `yarn test:run2` suite without a real database.

The test file lives at `tests/integration/nestjs/CoreModule.test.ts`. It imports
`reflect-metadata` at the top so the Reflect polyfill is available before any NestJS
decorator evaluation.

### Decision 7: `tsconfig.json` additions

```json
"experimentalDecorators": true,
"emitDecoratorMetadata": true
```

Both are required. `experimentalDecorators` enables `@Module()`, `@Injectable()`, and
`@Inject()`. `emitDecoratorMetadata` causes the TypeScript compiler to emit `Reflect.metadata`
calls that NestJS uses to resolve constructor-injected types at runtime. Without
`emitDecoratorMetadata`, `reflect-metadata` has no data to read and NestJS DI breaks
for class-based injection. Neither flag affects existing non-decorator code.

## Risks / Trade-offs

- **Risk: `initServer()` call site in `entry.server.tsx` does not `await`** — If a cold-start
  request arrives before the NestJS bootstrap promise resolves (typically < 50 ms), the first
  `getAppContext()` call in a loader will throw "not yet initialised."
  Mitigation: In practice, the React Router server processes the `initServer()` call on
  module load before the first request is dispatched. A future change can add explicit
  `await` if early-request races are observed. The guard error is explicit and loud, making
  the problem diagnosable.

- **Risk: `emitDecoratorMetadata` changes compiled output for all files** — TypeScript will
  emit `Reflect.metadata` calls in every decorated file. If any file uses decorators outside
  NestJS (e.g. a custom class decorator), the metadata will also be emitted.
  Mitigation: The project has no existing decorators outside NestJS files. The added
  tsconfig flag is additive and non-breaking.

- **Risk: `useFactory: () => dr` reads `dr` lazily — if `initDB()` has not been called,
  `dr` is `undefined` at factory time** — The provider would register `undefined` under
  `DRIZZLE_CLIENT`, causing silent failures in consumers.
  Mitigation: `CoreModule` is only bootstrapped via `NestFactory.createApplicationContext()`
  which is called after `initDB()` in `initServer()`. The ordering is explicit and tested.
  If `initDB()` is ever removed or reordered, the guard in `getAppContext()` and the
  `DrizzleProvider` factory will both surface the problem at startup.

- **Trade-off: `CoreModule` is not lazy-loaded** — All providers in `CoreModule` are
  resolved when `createApplicationContext()` is called, even if no consumer requests them.
  For the single `DrizzleProvider`, this is zero overhead (it reads a reference to an
  already-existing object). Future providers added to `CoreModule` should be similarly cheap
  to instantiate.

## Open Questions

None. The NestJS application context mode is well-defined; the token typing, ordering
constraint, and test approach are fully determined by the constraints in the intent.
