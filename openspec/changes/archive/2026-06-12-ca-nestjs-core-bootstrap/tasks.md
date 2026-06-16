## 1. Write the failing test (Red)

- [x] 1.1 Create `tests/integration/nestjs/CoreModule.test.ts`. The test file MUST
  import `reflect-metadata` as its very first statement (before any NestJS import),
  then import `Test` from `@nestjs/testing`, `DRIZZLE_CLIENT` and `DrizzleProvider`
  from `~/infrastructure/DrizzleProvider`, and `CoreModule` from `~/infrastructure/CoreModule`.
  Write three tests:

  (a) `Test.createTestingModule({ imports: [CoreModule] }).compile()` resolves without
  throwing — verifies `core-module` spec: CoreModule compiles.

  (b) `module.get(DRIZZLE_CLIENT)` returns the `dr` singleton (the PGlite test double
  injected by `tests/integration/db/setup.ts`) — verifies `drizzle-provider` spec:
  Provider resolves to the dr singleton.

  (c) Calling `module.get(DRIZZLE_CLIENT)` twice on the same compiled module returns
  the same object reference — verifies `drizzle-provider` concurrent resolution spec.

  Tests MUST fail at this point because `CoreModule` and `DrizzleProvider` do not exist.

  Run to confirm red: `yarn vitest run tests/integration/nestjs/CoreModule.test.ts`

## 2. Enable TypeScript decorator support

- [x] 2.1 Add `"experimentalDecorators": true` and `"emitDecoratorMetadata": true` to
  the `compilerOptions` block in `tsconfig.json`. These are required for `@Module()`,
  `@Injectable()`, and `@Inject()` decorators to compile and for `reflect-metadata`
  to have type metadata to read at runtime.

  Verify: `yarn tsc` should still report zero errors (it will fail on the missing
  infrastructure files until step 3, but no pre-existing errors should appear).

## 3. Implement DrizzleProvider (Green — token + provider)

- [x] 3.1 Create `app/infrastructure/DrizzleProvider.ts`. Export:

  - `DRIZZLE_CLIENT` — a typed injection token:
    `export const DRIZZLE_CLIENT = new InjectionToken<Dr>("DRIZZLE_CLIENT");`
    Import `InjectionToken` from `@nestjs/common` and `Dr` from `~/db.server`.

  - `DrizzleProvider` — a provider descriptor:
    ```
    export const DrizzleProvider: Provider = {
      provide: DRIZZLE_CLIENT,
      useFactory: (): Dr => dr,
    };
    ```
    Import `Provider` from `@nestjs/common` and `dr` from `~/db.server`.

  The file MUST use the `.server.ts` suffix: name it `DrizzleProvider.server.ts`.
  It imports `dr` from `~/db.server`; without the suffix the React Router bundler may
  attempt to include it in the client bundle and fail. Update all import references
  accordingly.

  Run to confirm the token and provider exist:
  `yarn vitest run tests/integration/nestjs/CoreModule.test.ts`
  (tests will still fail until CoreModule exists)

## 4. Implement CoreModule (Green — module wiring)

- [x] 4.1 Create `app/infrastructure/CoreModule.server.ts`. Export:

  ```typescript
  import { Module } from "@nestjs/common";
  import { DrizzleProvider } from "./DrizzleProvider.server";

  @Module({
    providers: [DrizzleProvider],
    exports: [DrizzleProvider],
  })
  export class CoreModule {}
  ```

  The `.server.ts` suffix is required because this file imports from `DrizzleProvider.server.ts`
  which pulls in `~/db.server`.

  Run to confirm green:
  `yarn vitest run tests/integration/nestjs/CoreModule.test.ts`

- [x] 4.2 Delete `app/infrastructure/.gitkeep` — the placeholder is no longer needed
  now that real files occupy the directory.

## 5. Wire NestJS bootstrap into initServer (Green — bootstrap)

- [x] 5.1 Update `app/init.server.tsx`:

  - Change `export function initServer()` to `export async function initServer()`.
  - Add a module-level variable:
    `let appContext: INestApplicationContext | undefined;`
  - After the existing `initDB()` call, add:
    `appContext = await NestFactory.createApplicationContext(CoreModule);`
  - Add a new export:
    ```typescript
    export function getAppContext(): INestApplicationContext {
      if (!appContext) {
        throw new Error(
          "NestJS application context has not been initialised. Call initServer() first.",
        );
      }
      return appContext;
    }
    ```
  - Import `NestFactory` from `@nestjs/core`, `INestApplicationContext` from
    `@nestjs/common`, and `CoreModule` from `~/infrastructure/CoreModule.server`.
  - Import `reflect-metadata` at the top of `init.server.tsx` (before NestJS imports)
    if it is not already imported there. Note: `entry.server.tsx` already imports it, but
    `init.server.tsx` must be self-contained for test environments.

  This file already has `.tsx` extension — it is server-only by convention. No suffix
  change needed.

  Run to confirm green (all three CoreModule tests):
  `yarn vitest run tests/integration/nestjs/CoreModule.test.ts`

## 6. Quality gates (Refactor)

- [x] 6.1 **Gate 1 — Tests green**
  `yarn vitest run tests/integration/nestjs/CoreModule.test.ts`
  All three tests must pass. If any fail, diagnose before proceeding.

- [x] 6.2 **Gate 2 — TypeScript**
  `yarn tsc`
  Zero type errors. Confirm `DRIZZLE_CLIENT` is typed as `InjectionToken<Dr>`,
  `CoreModule` compiles with decorators, and `getAppContext()` return type is
  `INestApplicationContext`. Pay special attention to `noUnusedLocals` and
  `noUnusedParameters` — tsconfig is strict.

- [x] 6.3 **Gate 3 — Prettier**
  `yarn format:check`
  If it reports formatting issues, run `yarn format` then re-check. Ensure tabs
  (not spaces) and 80-char width are applied consistently.

- [x] 6.4 **Gate 4 — Anti-pattern review**
  Read `.github/skills/anti-pattern-check/SKILL.md` and verify none of the listed
  anti-patterns are present in the three new/modified files. Specifically check:
  - No `as any` casts.
  - No `console.log` in the infrastructure files.
  - No raw string used in place of `DRIZZLE_CLIENT` token.
  - `useFactory` is a function, not `useValue` assigned at import time.

- [x] 6.5 **Gate 5 — SOLID review**
  Invoke the `solid-reviewer` agent on `DrizzleProvider.server.ts`, `CoreModule.server.ts`,
  and the updated `init.server.tsx`. Confirm:
  - SRP: `DrizzleProvider.server.ts` has one responsibility (token + factory).
    `CoreModule.server.ts` has one responsibility (module wiring).
  - DIP: `CoreModule` depends on the `DrizzleProvider` descriptor, not on the concrete
    `Dr` class directly.
  - OCP: Adding a new provider to `CoreModule` is additive — no existing code changes.

- [x] 6.6 **Gate 6 — Documentation review**
  Each new file MUST have a JSDoc or inline comment explaining WHY it exists, not just
  what it does. Required comments:
  - `DrizzleProvider.server.ts`: reference that `initDB()` must have run first; explain
    why `useFactory` is used over `useValue`.
  - `CoreModule.server.ts`: reference ADR-004 and the CA migration phase; explain that
    `NestFactory.createApplicationContext` is used, not `NestFactory.create`.
  - `init.server.tsx`: explain the ordering constraint (initDB before NestJS) and why
    `getAppContext()` throws on premature access.

- [x] 6.7 **Gate 7 — Project conventions review**
  Read `.github/copilot-instructions.md` and confirm:
  - Files that import from `~/db.server` use `.server.ts` suffix.
  - No `export *` in any barrel — named exports only.
  - No `console.log` statements added.
  - `tsconfig.json` additions are in `compilerOptions`, not at the top level.
  - Branch is `feature/ca-nestjs-deps`, PR will target `dev`.

- [x] 6.8 **Gate 8 — Code review**
  Run `.github/skills/code-review/SKILL.md` in full against the diff on this branch.
  Address every finding before proceeding to the regression task.

## 7. Regression and archive

- [x] 7.1 **Full PGlite regression suite**
  `yarn test:run2`
  MUST pass with no new failures. If any test fails, run the suite on the base branch
  (`dev` or `feature/ca-nestjs-deps`) to confirm it was already failing before this
  change. Do not label any failure as pre-existing without this baseline confirmation.

- [x] 7.2 **Tick all checkboxes** — tick every item in this tasks.md (including this one)
  so the incomplete-task guard does not block the archive step.

- [x] 7.3 **Archive** — run `opsx:archive` on branch `feature/ca-nestjs-deps`
  to finalise the OpenSpec change artifacts and mark the change complete.

- [x] 7.4 **Raise PR** — target `dev` with title:
  `Feature: NestJS CoreModule bootstrap with DRIZZLE_CLIENT DI token (Phase 3b)`
