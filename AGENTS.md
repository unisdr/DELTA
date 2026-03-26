# AGENTS.md — Shared AI agent instructions for DELTA Resilience

This file is the single source of truth for AI coding agents (Claude Code, GitHub Copilot, etc.). Tool-specific files (CLAUDE.md, .github/copilot-instructions.md) point here.

## Project overview

DELTA Resilience is a full-stack TypeScript disaster tracking system built on React Router v7, Vite, PostgreSQL 17 + PostGIS, and Drizzle ORM. It uses a multi-tenant, multi-country architecture.

## Key entry points

- **README**: `readme.md` — quick start, tech stack, project structure
- **Developer docs**: `_docs/index.md` — comprehensive index of all developer documentation
- **Contributing**: `CONTRIBUTING.md` — branch naming, commit style, PR conventions
- **Code structure**: `_docs/code-structure/code-structure.md` — folder layout and architecture

## Tech stack

- TypeScript, Node.js 22
- React Router v7 (React) with Vite
- Tailwind CSS v4, PrimeReact
- Drizzle ORM, PostgreSQL 17 + PostGIS
- Vitest (unit/integration), Playwright (e2e)

## Common commands

- `yarn install` — install dependencies
- `yarn run dev` — start dev server (port 3000)
- `yarn run build` — production build
- `yarn dbsync` — apply database migrations (runs `drizzle-kit migrate`)
- `yarn test:run2` — unit + integration tests (PGlite, no external DB)
- `yarn test:run3` — real-DB integration tests (needs `.env.test`)
- `yarn test:e2e` — Playwright end-to-end tests
- `yarn i18n:extractor` — extract i18n strings

## Key conventions

- **Migrations**: Always use `yarn dbsync` (`drizzle-kit migrate`). Never use `drizzle-kit push`. See `_docs/code-structure/drizzle.md`.
- **Branches**: branch from `dev`, not `main`. See CONTRIBUTING.md for naming conventions.
- **PRs**: target `dev`. `main` is updated by maintainers at release time.
- **Commit prefixes**: `Bug:`, `Feature:`, `Refactor:`, `Docs:`, or component name (e.g. `Damages:`).
- **Routes**: use `$lang+` prefix pattern, remix-flat-routes conventions.
- **Models**: follow patterns in `app/backend.server/models/dev_example1.ts` as a template.
