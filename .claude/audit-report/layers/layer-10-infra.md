## Layer 10 — Infrastructure (Docker, Build, Deployment)

### Inventory

```
Dockerfile.app                      — Single-stage Node 22 image
docker-compose.yml                  — App + PostGIS DB + Adminer (dev-only compose)
Makefile                            — Docker Compose shortcuts (build/start/stop/migrate)
.husky/pre-push                     — lint-staged + tsc --noEmit (no pre-commit hook)
vite.config.ts                      — Vite config, SSR, Tailwind, security headers (dev only)
vitest.config.ts                    — Unit + in-memory integration tests
vitest.integration-realdb.config.ts — Real-DB integration tests
playwright.config.ts                — E2E tests (Chromium, runs against dev server)
drizzle.config.ts                   — Drizzle Kit config, migrations in app/drizzle/migrations/
example.env                         — Env var template (committed)
package.json                        — Scripts: build, dev, start, test:run2/3, e2e, dbsync
scripts/
  build_binary.sh / .bat            — Release packager (build → dts_shared_binary/)
  init_db.sh / .bat                 — New installation: restore from SQL snapshot
  init_website.sh / .bat            — Install yarn + deps for production deployment
  upgrade_database.sh / .bat        — Interactive DB version-chain upgrade runner
  start.sh / .bat                   — dotenv wrapper around yarn start
  dts_database/
    dts_db_schema.sql               — Static schema snapshot (used by init_db.sh)
    upgrade_database.sql            — Version-chained upgrade dispatcher (0.1.1→0.2.0)
    upgrade_from_*.sql              — Individual version patches
```

No `.github/` directory — **no CI/CD pipeline exists.**
No `.dockerignore` — **Docker build copies entire working directory.**

---

### Gap 1: No `.dockerignore` — image bloat and secret leak risk

`Dockerfile.app` uses `COPY . .` with no `.dockerignore`. Every Docker build copies `node_modules/` (hundreds of MB, then immediately overwritten by `yarn install`), `.git/`, `logs/`, `tests/`, and any local `.env` file that happens to exist. A developer who has a populated `.env` with real credentials will bake those credentials into the image layer — retrievable via `docker history`.

**Plan item:** P0-18

---

### Gap 2: `build_binary.sh` — non-fatal build failure

`scripts/build_binary.sh:32`:

```bash
if ! yarn build; then
  echo "WARNING: yarn build failed, continuing anyway..."
fi
```

A broken production build is silently packaged and distributed to UNDRR country teams as a release artifact. `set -e` is declared at the top of the script but the `if !` construct suppresses it for this block.

**Plan item:** P0-19

---

### Gap 3: CSP header missing from production — only on dev server

`vite.config.ts:35` sets a full `Content-Security-Policy` header inside `configureServer` — which only runs on the Vite dev server. `entry.server.tsx` sets all other security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, etc.) on every SSR response in production, but CSP is absent.

The same headers are copy-pasted in both files with no shared source of truth — a future update to any header value requires changing two files, and as seen with CSP, it is easy to miss one.

**Plan item:** P0-20

---

### Gap 4: No CI/CD pipeline

No `.github/` directory. The only automated quality gate is a `pre-push` husky hook running `lint-staged` (prettier) + `tsc --noEmit`. There is no pre-commit hook.

Consequences:

- The entire test suite (Vitest unit, Vitest integration, Playwright E2E) never runs automatically on any commit or PR
- A broken `yarn build` is never caught before merge
- `git push --no-verify` bypasses all gates
- No dependency security auditing (`yarn audit`)
- The i18n extractor is never verified in CI — stale translations reach main silently

**Plan item:** P1-37

---

### Gap 5: Dual migration systems with no coordination

Two independent database schema management systems coexist:

**System 1 — Drizzle Kit** (authoritative, newer): TypeScript schema in `app/drizzle/schema/` → timestamped migration files in `app/drizzle/migrations/` → tracked in `__drizzle_migrations__` table. Driven by `yarn dbsync`.

**System 2 — Raw SQL** (legacy, pre-Drizzle): `dts_db_schema.sql` (full schema snapshot) + `upgrade_from_*.sql` version patches. Used by `init_db.sh` (new installations) and `upgrade_database.sh` (manual upgrades). Both are packaged into every release by `build_binary.sh`.

The two systems have no shared state. `init_db.sh` restores from the static snapshot — if Drizzle has added migrations since the snapshot was last regenerated, new installations are missing those columns. No process enforces keeping the snapshot in sync. The version numbering in the SQL scripts (0.1.1 → 0.1.3 → 0.2.0) is also inconsistent with the `package.json` version (`0.2.0`).

**Plan item:** P1-38

---

### Gap 6: `docker-compose.yml` — credentials, no healthcheck, Adminer exposure, v1 CLI

**Hardcoded password:** `POSTGRES_PASSWORD=2024` committed to the repo. No `docker-compose.prod.yml` or env-override pattern provided — teams deploying via Docker have no documented path to a secure config.

**No DB healthcheck:** `depends_on: db` starts the `app` container when the `db` container process starts, not when PostgreSQL is actually ready. First-boot startup consistently fails and requires a manual restart.

**Adminer exposed:** The `adminer` service exposes a full DB GUI on port 8080 with no authentication — direct full access to PostgreSQL for anyone who can reach the port. Included in the default compose file with no separation between dev and production.

**Deprecated CLI:** `Makefile` uses `docker-compose` (Python-based v1, deprecated, removed from modern Docker installations). Current standard is `docker compose` (Go v2 plugin).

**Plan item:** P1-39

---

### Gap 7: Migrations run at app startup — breaks multi-node deployment

`package.json:dev` runs `yarn dbsync` (migrations) on every `yarn dev`. In a multi-node deployment (Docker Swarm, Kubernetes), all replicas start concurrently and each would attempt to run migrations simultaneously. Drizzle Kit has no distributed migration lock — concurrent runs against the same `__drizzle_migrations__` table produce conflicts or duplicate entries.

Migrations must run exactly once as a pre-deployment job, not as part of application startup.

**Plan item:** P1-40

---

### Gap 8: E2E tests run against dev server, not production build

`playwright.config.ts:19`:

```ts
webServer: { command: "yarn dev", port: 4000 }
```

Tests run against the Vite dev server (`NODE_ENV=development`, HMR). The production build (`yarn build` + `react-router-serve`) is never exercised end-to-end. A build-time error or production-only behaviour (e.g. `NODE_ENV`-conditional code paths) goes undetected.

**Plan item:** P2-8

---

### Horizontal scaling assessment — Docker Swarm (3 nodes)

Three prerequisites must be resolved before a 3-node Docker Swarm is viable:

| Concern                        | Verdict           | Blocker item                                            |
| ------------------------------ | ----------------- | ------------------------------------------------------- |
| Session sharing                | ✅ Safe           | PostgreSQL-backed — no sticky sessions needed           |
| Translation cache              | ✅ Safe           | File-based, baked into image — identical per node       |
| File uploads to local disk     | ❌ Hard blocker   | P2-5 — must move to object storage                      |
| Migrations running at startup  | ❌ Hard blocker   | P1-40 — must isolate as pre-deploy job                  |
| Translation import TOCTOU race | ❌ Race condition | P2-6 — add `SELECT FOR UPDATE` on `dts_system_info`     |
| DB connection pool             | ⚠️ Configure      | P1-1 — cap per-node pool (3×10 = 30 total connections)  |
| DB single point of failure     | ⚠️ Risk           | P4-3 — no PostgreSQL standby                            |
| In-memory rate limiter         | ⚠️ Moot now       | `checkRateLimit` is dead code — would break if wired up |
| Log aggregation                | ⚠️ Operational    | Each node writes to own container filesystem            |

**Verdict:** With P2-5 + P1-40 + P2-6 resolved the application is architecturally ready for horizontal scaling. Session storage is already correct (PostgreSQL). No sticky sessions needed. The remaining concerns are operational configuration, not architecture changes. Estimated: one sprint of targeted work.

The swarm compose config (`deploy.replicas`, `update_config`, `restart_policy`, pool sizing) does not currently exist and must be created.

**Plan item:** P1-41

---

### Already tracked — reference only

- **P0-1** — `NODE_ENV=development` in Dockerfile
- **P0-4** — No coverage thresholds in vitest config
- **P1-1** — DB connection pool unconfigured (3-node pool sizing)
- **P2-5** — File uploads to object storage (hard blocker for horizontal scaling)
- **P2-6** — Translation import startup race (TOCTOU + multi-node concern)
- **P4-3** — Read replica for analytics (DB single point of failure)

---

### What works well

- `drizzle.config.ts` correctly excludes PostGIS tables via `extensionsFilters: ["postgis"]`
- `vitest.integration-realdb.config.ts` cleanly separated from unit tests with appropriate 60s timeout
- `build_binary.sh` produces a complete, reproducible distributable in one step — right model for country team deployments
- `upgrade_database.sql` version-chain dispatcher uses `\gset`/`\if` for safe idempotent conditional upgrades
- `pre-push` hook enforces TypeScript correctness before any push — catches regressions without CI
- `drizzle-kit migrate` (not `push`) used in production path — migration files are version-controlled, not ad-hoc schema pushes
- Security headers correctly applied to SSR responses in `entry.server.tsx` (all except CSP)
- Playwright config includes setup/teardown DB fixtures and screenshot/video retention on failure

---

