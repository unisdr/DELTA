# DELTA Resilience (**D**isaster & Hazardous **E**vents, **L**osses and Damages **T**racking & **A**nalysis)

DELTA Resilience is a comprehensive system, not just an open-source software. Co-developed with data producers and users and building on DesInventar Sendai, DELTA brings together:

- Methodological frameworks
- Data standards and governance,
- Capacity development and technical assistance,
- Open-source software

It supports nationally owned Disaster Tracking Systems to monitor hazardous events and record losses and damages at national and subnational levels—whether countries use the DELTA Resilience software interface or strengthen their existing national platforms.

Visit the [project website for more details](https://www.undrr.org/building-risk-knowledge/disaster-losses-and-damages-tracking-system-delta-resilience). See [CHANGELOG.md](CHANGELOG.md) for release history.

## Features

- Create, edit and publish hazardous events, disaster events and disaster records
- Geospatial footprints
- Import tools for legacy datasets (DesInventar using [DIX - DesInventar eXchange](https://github.com/unisdr/dts-import-middleware))
- Role based access
- Multi-factor authentication (TOTP)
- Multi-language support (i18n)
- Multi-tenant, multi-country architecture

## Technology stack

- TypeScript
- Node.js (v22 recommended)
- React Router v7 (React)
- Vite
- Tailwind CSS v4
- PrimeReact (UI components)
- Drizzle ORM
- PostgreSQL 17 + PostGIS
- Vitest (unit and integration tests)
- Playwright (end-to-end tests)

## Project structure

Below is a view of the repository layout and the purpose of key folders/files to help new contributors navigate the codebase.

```
├── _docs/                     # Developer docs and design docs
├── app/                       # React Router v7 app source
│   ├── backend.server/        # Server-side API handlers and models
│   ├── components/            # Shared UI components (charts, maps, tables, etc.)
│   ├── frontend/              # Shared frontend views and form components
│   ├── pages/                 # Full-page components (access management, org management)
│   ├── routes/                # React Router route modules (under $lang+ prefix)
│   ├── services/              # Application-level service layer
│   ├── utils/                 # Utility functions (auth, email, logging, etc.)
│   ├── types/                 # Global TypeScript types
│   └── db/                    # DB helpers and query layer
├── tests/                     # Test suites (unit, integration, integration-realdb, e2e)
├── locales/                   # i18n translation files
├── scripts/                   # Database init, build and deployment scripts
├── public/                    # Static assets served by the app
├── docker-compose.yml         # Docker Compose setup (app + PostgreSQL/PostGIS + Adminer)
├── Dockerfile.app             # Application container definition
├── Makefile                   # Convenience targets (start, stop, migrate, logs, db-shell)
├── drizzle.config.ts          # Drizzle ORM configuration
├── CHANGELOG.md               # Release history
└── example.env                # Example environment variables
```

Notes:

- The `app/` directory contains the bulk of the application code (React Router routes, frontend components, and server models).

- `_docs/` contains developer and design documentation — consult these before contributing.

- `scripts/` includes db schema and initialization scripts used in CI/deploy flows.

- `public/` contains static front-end assets and theme files.

- `build/`, `uploads/`, and `logs/` are generated at build/runtime and are not committed to the repository.

## Quick start (local development)

### Docker (recommended)

The fastest way to get a working environment is Docker Compose, which starts the app, PostgreSQL 17 + PostGIS, and Adminer together.

```bash
docker-compose build          # builds the image (includes app compilation)
docker-compose up -d
docker-compose exec app yarn dbsync   # apply DB migrations
```

Open http://localhost:3000. Use `docker-compose logs -f app` to tail logs.

### Manual setup

Prerequisites:

- Node.js (22.x recommended)
- Yarn (or use npm)
- PostgreSQL 17 with PostGIS

1. Clone the repository

```bash
    git clone https://github.com/unisdr/delta.git
    cd delta
```

2. Install dependencies

```bash
yarn install
```

3. Copy example env and configure

```bash
cp example.env .env
# edit .env and set DATABASE_URL, SESSION_SECRET, EMAIL config, etc.
```

4. Apply database schema (drizzle)

```bash
yarn run dbsync
```

5. Run in development mode

```bash
yarn run dev
```

Open http://localhost:3000.

Follow this [full guide](_docs/installation/shared-instance-installation.md) or [continue with the admin setup](_docs/installation/shared-instance-installation.md#4-super-admin-setup).

### Environment variables

Copy `example.env` to `.env` and update values. Key variables:

- DATABASE_URL (required): Postgres connection string. Example: `postgresql://user:pass@localhost:5432/dts?schema=public`
- SESSION_SECRET (required): long random string for session signing
- PUBLIC_URL: base URL of the application (used in emails, links)
- NODE_ENV: `development` or `production`
- EMAIL_TRANSPORT: `smtp` or `file` (file is useful for dev)
- EMAIL_FROM: default sender address for outgoing emails
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE: SMTP settings when EMAIL_TRANSPORT=smtp
- AUTHENTICATION_SUPPORTED: `form`, `sso_azure_b2c`, or comma-separated values
- `SSO_AZURE_B2C_*`: configuration for Azure B2C SSO when used
  Security notes:
- Never commit `.env` to source control. Use a secrets manager for production.

### Database

- Uses PostgreSQL 17 with PostGIS. Create your DB and enable PostGIS extensions before applying migrations.
- Apply migrations using drizzle-kit: `yarn dbsync`.
- Backup and restore: use `pg_dump`/`pg_restore` for database backups; ensure PostGIS types are preserved.

### Testing

The project has three test layers:

- **Unit + integration tests** (Vitest with PGlite in-memory DB):

```bash
yarn test:run2
```

- **Real-DB integration tests** (Vitest against a live PostgreSQL instance):

```bash
cp example.env.test .env.test
# configure .env.test with a test database URL
yarn test:run3
```

- **End-to-end tests** (Playwright, runs the full app on port 4000):

```bash
yarn test:e2e
```

### Useful commands

- Install dependencies: `yarn install`
- Run dev: `yarn run dev`
- Apply migrations: `yarn run dbsync`
- Run unit/integration tests: `yarn test:run2`
- Run E2E tests: `yarn test:e2e`
- Build production artifact: `yarn run build`

## Production deployment (recommendations)

- Use a managed Postgres (RDS, Cloud SQL, Azure DB) or a highly available Postgres cluster
- Use Docker or Kubernetes for deployment. Store secrets in a vault or orchestrator secrets store
- Terminate TLS at the load balancer / ingress and enable secure cookies and HSTS
- Configure monitoring (logs, metrics, Sentry for errors)
- Use a CDN for static assets if serving at scale

### Minimal production checklist:

- Strong `SESSION_SECRET` and secure storage of DB credentials
- HTTPS enabled
- Backups and monitoring configured

### Security & secrets

- Set `SESSION_SECRET` to a secure, randomly generated value
- Use environment-based secret management (Vault, cloud secrets manager)
- Validate and sanitize uploads; enforce limits on attachment sizes
- Change the default password

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit style, and PR conventions.
