## Layer 0 — Project Config, Toolchain & Deployment Model

### Package manager — Yarn (Classic, v1)

- **File:** `yarn.lock` (present), `package.json`
- Yarn Classic (v1.22.x) — **not** Yarn Berry (v2+). No `.yarnrc.yml`, no PnP.
- `"private": true` — not published to npm, intentional for an internal system.
- `"type": "module"` — the whole project is ESM. All imports/exports use ES module syntax. This is important: no `require()`, CommonJS interop can be tricky and is a common source of issues with older Node packages.
- **Limitation worth noting:** Yarn v1 is in maintenance mode. No workspace support used here (monorepo not needed), but upgrading to Yarn Berry or switching to `npm`/`pnpm` is worth considering if managing multiple packages in future.

---

### Three-layered architecture — is it separated?

**Short answer: No. All three layers ship as one unit.**

The project is a **monolith** — frontend, backend, and database migrations all live in one repo and deploy together:

```
One repo → one build → one Node.js process → one Docker image
                              ↕
                     PostgreSQL (separate container/service)
```

- The React Router v7 app (`yarn build` → `build/`) produces both server-side and client-side bundles **in a single output**
- `yarn start` runs `react-router-serve ./build/server/index.js` — one Express-based Node.js process serving both SSR and API
- The DB is the only separately deployed service (PostgreSQL + PostGIS)
- `docker-compose.yml` confirms: `app` service + `db` service + `adminer` — all launched together

**Implication for future refactoring:** If the team wants a true three-tier separation (standalone frontend SPA, standalone API server, DB), this would require a significant architecture change — extracting the API routes to a separate service and decoupling the React Router SSR from the Express server.

---

### Build pipeline

| Step             | Command                   | Output                                                                                               |
| ---------------- | ------------------------- | ---------------------------------------------------------------------------------------------------- |
| Type check       | `yarn tsc`                | No emit — Vite handles transpilation, `tsc` is validation only (`"noEmit": true` in `tsconfig.json`) |
| Dev server       | `yarn dev`                | `yarn install` → `yarn dbsync` → `react-router dev --port 3000`                                      |
| Production build | `yarn build`              | `react-router build` → `build/` (server + client bundles)                                            |
| Production start | `yarn start`              | `react-router-serve ./build/server/index.js`                                                         |
| Binary release   | `yarn build:binary:linux` | `scripts/build_binary.sh` — packages `build/` + scripts + locale files into `dts_shared_binary/`     |

**`yarn dev` does three things on every start:** installs deps, runs DB migrations, then starts the dev server. This means every `yarn dev` is safe to run on a fresh clone — it self-bootstraps. Convenient but slow if you just want to restart the server.

---

### Binary/offline deployment model

`scripts/build_binary.sh` reveals a **second deployment path** distinct from Docker:

1. Build the app (`yarn build`)
2. Package into `dts_shared_binary/` containing: built app, `package.json`, `.env`, locale files, DB SQL scripts, shell scripts
3. Operator runs `init_db.sh` (creates PostgreSQL DB from raw SQL schema) + `init_website.sh` (installs Node, yarn, dotenv-cli) + `start.sh`

This is a **self-contained offline deployment** for environments that can't use Docker (e.g., government servers without container runtimes). The DB init uses a raw `dts_db_schema.sql` file — **not** Drizzle migrations. This means there are two separate DB setup paths that can drift apart. The SQL schema file in `scripts/dts_database/` and the Drizzle migrations must be kept in sync manually — a known maintenance risk.

---

### TypeScript configuration (`tsconfig.json`)

- `"strict": true` — full strict mode (no implicit `any`, strict null checks etc.)
- `"noImplicitReturns": true`, `"noUnusedParameters": true`, `"noUnusedLocals": true` — strict code hygiene enforced at compile time
- `"moduleResolution": "Bundler"` — modern resolution, relies on Vite/bundler to resolve, not Node's classic algorithm
- `"noEmit": true` — TypeScript does zero compilation. Vite handles all transpilation via `esbuild`. `tsc` is only used as a linter/type checker.
- `"paths": { "~/*": ["./app/*"] }` — `~` alias maps to `app/`. Used everywhere in the codebase.
- **Limitation:** `tsconfig.json` includes `"**/.server/**"` and `"**/.client/**"` patterns but the project uses `backend.server/` (not `.server/`). The `.server.ts` file suffix convention is what React Router uses for exclusion — the folder name `backend.server` does not trigger the same guarantee.

---

### Code quality toolchain

| Tool         | Config file                    | Purpose                                                                                                       |
| ------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Prettier     | `.prettierrc`                  | Formatting — tabs, 80-char width, trailing commas, double quotes                                              |
| EditorConfig | `.editorconfig`                | Editor-level consistency — LF line endings, 2-space indent (note: **conflicts with Prettier's tabs setting**) |
| Husky        | (via `package.json` `prepare`) | Git hooks — runs on install                                                                                   |
| lint-staged  | `package.json` `lint-staged`   | Runs Prettier on staged files before commit                                                                   |
| PostCSS      | `postcss.config.js`            | Only `postcss-import` plugin — minimal, just handles CSS `@import` resolution                                 |

**Conflict to note:** `.editorconfig` says `indent_style = space, indent_size = 2` but `.prettierrc` says `"useTabs": true`. Prettier wins at commit time (via lint-staged), but editors following EditorConfig will show different indentation while typing. This is a minor but persistent friction point.

---

### Testing strategy — three separate test suites

| Suite                        | Config                                | Runner     | DB                                            |
| ---------------------------- | ------------------------------------- | ---------- | --------------------------------------------- |
| Unit + integration (mock DB) | `vitest.config.ts`                    | Vitest     | `@electric-sql/pglite` (in-memory PostgreSQL) |
| Integration (real DB)        | `vitest.integration-realdb.config.ts` | Vitest     | Real PostgreSQL (requires running DB)         |
| E2E                          | `playwright.config.ts`                | Playwright | Real DB via `global.setup.ts` / teardown      |

**Key observations:**

- E2E tests run against port `4000` (not 3000) — separate server instance spawned by Playwright
- E2E is single-worker (`workers: 1`) — tests are sequential, not parallel. Safe but slow at scale.
- Integration (mock) uses `pglite` — lightweight but may not replicate PostGIS behaviour
- The real-DB integration suite has `testTimeout: 60000ms` (60s) — suggests some tests are slow
- No CI configuration file found in the root (no `.github/workflows/`, no `Jenkinsfile`) — CI pipeline, if any, is external to this repo

---

### Notable root-level observations & limitations

| Observation                                                | File                                               | Risk                                                                                                                                        |
| ---------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `ENV NODE_ENV=development` hardcoded in Dockerfile         | `Dockerfile.app:27`                                | Already in P0-1 of refactoring plan                                                                                                         |
| Two DB setup paths (Drizzle migrations vs raw SQL)         | `scripts/dts_database/`, `app/drizzle/migrations/` | Schema drift risk — must be kept in sync manually                                                                                           |
| No CI config in repo                                       | root                                               | Unclear if/how CI runs tests before merge                                                                                                   |
| `pg` and `postgres` both listed as dependencies            | `package.json:66,67`                               | Two different PostgreSQL client libraries. `pg` is used by Drizzle, `postgres` may be unused or a leftover. Worth auditing with `depcheck`. |
| `package.txt` file                                         | root                                               | Unknown purpose — not a standard file. Contents not standard package format.                                                                |
| `build:css` script references `source/scss`                | `package.json:31`                                  | No `source/scss` directory exists — dead script                                                                                             |
| `test:run1` uses `vite build --ssr` then runs built output | `package.json:9`                                   | Old test approach, superseded by `test:run2`. May be stale.                                                                                 |

---

### Architecture discussion — monolith vs three-tier separation

**Context:** The architecture audit described DELTA as a "modular monolith." This is accurate — the codebase has clear folder-based module boundaries (`routes/`, `backend.server/`, `frontend/`, `utils/`) but all modules deploy as a single Node.js process. "Modular" describes internal organisation, not deployment topology.

**Should we split into a proper three-tier architecture (separate frontend + backend)?**

Decision recorded: **Not now, but keep the door open.** Reasoning:

- React Router v7's SSR model is a deliberate choice, not an oversight. It runs on top of Express (`@react-router/express`) — it doesn't replace it.
- The offline/binary deployment path (`scripts/build_binary.sh`) serves environments without Docker or reliable internet. A separated frontend SPA + backend API would complicate this significantly.
- The actual dev team pain (UI changes cascading) is a **component boundary problem**, not a deployment model problem. Splitting into two apps wouldn't fix it.
- The correct fix is: complete the UI migration (P1-6), delete the old `formScreen()` system, establish clear component ownership per route.

**However** — two future requirements may force the three-tier question back onto the table:

1. **Mobile / field use with low/no connectivity** — full offline capability for field workers requires the frontend to operate independently of the server (a client-side SPA with a local cache). This naturally leads to SPA + REST API separation.
2. **PWA progressive enhancement** — installable PWA is achievable today (2–3 days); true offline functionality requires client-side rendering for data-entry forms.

---

### PWA readiness assessment

**Current state: zero PWA infrastructure.**

| PWA requirement  | Current state           | File evidence                                                      |
| ---------------- | ----------------------- | ------------------------------------------------------------------ |
| Web app manifest | Missing                 | No `manifest.json` in `public/`                                    |
| Service worker   | Missing                 | No SW files anywhere                                               |
| PWA meta tags    | Minimal                 | Only `viewport` meta in `root.tsx:304`                             |
| HTTPS            | Unknown (env-dependent) | —                                                                  |
| Caching strategy | Actively disabled       | `entry.server.tsx:96` — `Cache-Control: no-store` on all responses |

**What's achievable and at what cost:**

| Capability                       | Effort         | Notes                                                                                                                           |
| -------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Installable (Add to Home Screen) | Low (2–3 days) | Manifest + icons + HTTPS. No code architecture changes needed.                                                                  |
| Offline static shell             | Low-Medium     | Service worker caching JS/CSS assets. Pages still need server.                                                                  |
| Full offline data entry          | High           | Requires moving forms to client-side rendering + local cache + sync queue. Fundamentally changes the SSR model for those pages. |
| Map tile caching (OpenLayers)    | Medium         | Well-solved with service workers. `ol` library supports this pattern.                                                           |
| Push notifications               | Medium         | Independent of SSR. Browser API. Needs a push service.                                                                          |

**Recommendation:** Implement the installable layer now (manifest + icons) as it adds real value for field workers with zero architectural risk. Defer offline capability to when the three-tier separation decision is made — it's the same work.

---

### React Router v7 SSR — limitations for long-term development

Documented for awareness, not as immediate blockers:

1. **Every navigation is a server round-trip** — loaders always run server-side. For low-connectivity field use, this means a dropped connection = broken navigation. A SPA with cached data handles this gracefully; SSR does not.

2. **Background jobs are awkward** — the framework is built around the request/response cycle. Long-running work (geography ZIP parse, translation import, future AI classification) requires bolting on a job queue (pg-boss, Redis queues) rather than it being first-class. The geography upload issue (P3-3) is already in the plan.

3. **WebSockets / real-time are not native** — if real-time features are ever needed (concurrent editing notifications, live disaster feed), they must be added to the underlying Express layer manually.

4. **API consumers are second-class** — the `$lang+/api+/` routes are coupled to the language URL prefix and session-based auth. External systems or mobile apps integrating with the API have to navigate these HTML-oriented assumptions.

5. **Horizontal scaling requires shared infrastructure** — detailed in the scalability section below.

---

### Horizontal scalability analysis

**Scenario:** Load balancer with 2–3 Node.js nodes — what breaks?

#### What works fine (no changes needed)

- **Session auth** — cookies store only a signed session ID. Session data lives in PostgreSQL `sessionTable`. Any node can verify any session. No sticky sessions required, as long as all nodes share `SESSION_SECRET`.
- **Super admin sessions** — purely cookie-based (signed JWT-style). Stateless by design.
- **DB reads/writes** — all go through Drizzle → PostgreSQL. Shared by all nodes naturally.

#### Hard blockers

**File uploads on local filesystem** (`app/utils/paths.ts`)

```
uploads/hazardous-event/
uploads/disaster-event/
uploads/disaster-record/
uploads/temp/
```

Files are written with `fs.writeFileSync` (`components/ContentRepeater/PreUploadFile.tsx:99`). If Node A handles the upload and Node B handles the next request, Node B has no file. Attachments on disaster events/records would randomly 404 depending on which node answers. **Cannot add a second node without fixing this first.**

Fix: Move to shared object storage — S3, MinIO (self-hosted), or Azure Blob Storage.

#### Race conditions

**Translation import on startup** (`backend.server/services/translationDBUpdates/update.ts`)
`importTranslationsIfNeeded()` runs on every process start. With two nodes starting simultaneously, both read `lastTranslationImportAt`, both decide import is needed, both run the full import. Last write wins — data integrity risk is low but double-work is guaranteed. Fix: distributed lock (Redis `SET NX`) or a startup leader-election pattern.

#### Per-process state that won't replicate

| State                            | Location                   | Impact                                                                                   |
| -------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------- |
| `loadedLangs` translation cache  | `translations.ts:15`       | Each node loads its own copy. Memory × node count. Cache invalidation doesn't propagate. |
| `divisionCache` geographic cache | `geographicFilters.ts:15`  | Same — stale data possible on one node after geography update.                           |
| `loggerCache`                    | `logger.server.ts`         | Benign — loggers are stateless.                                                          |
| `GeoDatabaseUtils` singleton     | `utils/geoDatabase.ts:431` | Per-process singleton. Fine as long as it holds no mutable request state.                |

#### DB connection exhaustion

`db.server.ts` uses Drizzle's default pool (10 connections per process). 3 nodes = 30 connections. PostgreSQL default `max_connections = 100`. Without PgBouncer, 10+ nodes would exhaust DB connections. Fix: PgBouncer at infrastructure level + explicit pool sizing (P1-1 already in refactoring plan).

#### Rate limiting (future)

`express-rate-limit` default store is in-process. With 3 nodes, limit is effectively multiplied by 3. Fix: Redis store for rate limiter (already noted in P2-1).

#### Summary — what it takes to support a basic load balancer

| Item                                    | Effort | Blocking?                                 |
| --------------------------------------- | ------ | ----------------------------------------- |
| Shared file storage (S3/MinIO)          | Medium | **Yes — hard blocker**                    |
| Fix translation import race condition   | Low    | Yes                                       |
| PgBouncer + explicit pool sizing        | Low    | Recommended                               |
| Redis for rate limiting                 | Medium | Recommended (once rate limiting is added) |
| Session activity write threshold (P1-2) | Low    | Recommended — reduces DB write load       |
| Redis for distributed caches            | Medium | Optional — improves consistency           |

The app is **2–3 targeted changes** from supporting a basic load-balanced setup. Not a full rewrite.

For a major disaster event (tsunami/earthquake across multiple nations), the analytics queries (`app/backend.server/models/analytics/`) are the highest-risk load — they are complex aggregations over potentially large datasets. These should be routed to a read replica (P4-3) before attempting horizontal scaling of the app tier.

---

