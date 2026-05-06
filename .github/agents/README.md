# AI Agents

This directory contains custom agent definitions for GitHub Copilot and compatible AI coding tools. Agents extend the base AI assistant with deep, project-specific knowledge for recurring task types.

For the full OpenSpec workflow guide (install → propose → apply → archive), see
[`_docs/workflows/openspec.md`](../../_docs/workflows/openspec.md).

## How agents work

Each `.agent.md` file defines a specialist agent:

```
---
name: agent-name
description: "One-line summary used by the AI tool to decide when to invoke this agent.
  Include trigger phrases — the more specific, the better."
---

# Agent name

Full system prompt: role, project context, conventions, methodology, output format.
```

The `description` frontmatter is what the AI tool reads when deciding whether to invoke the agent. Make it specific and include concrete trigger phrases so it gets called at the right moments rather than the generic assistant taking over.

The body is the actual instruction set the agent runs with. Write it as if briefing a capable engineer who knows the technology but not this specific codebase.

## When to add a new agent

Add one when you have a task type that:

- Recurs often enough to justify the setup cost
- Has enough project-specific context (conventions, file paths, patterns) that the generic assistant keeps getting it slightly wrong
- Has a clear enough scope that you can write a precise description

Don't add agents for one-off tasks, or for things the generic assistant handles well already.

## Current agents

| Agent | When it's invoked |
|---|---|
| `tech-architect-writer` | Designing project structure, establishing conventions, architectural documentation, reviewing how the codebase is organized for both humans and AI tools |
| `spec-writer` | Translating a developer's intent into a complete OpenSpec proposal (proposal → specs → design → tasks). Used before any implementation begins. |
| `tdd-test-writer` | Writing failing Vitest tests from an OpenSpec proposal (Red phase of TDD). Stops before any implementation. |
| `sdd-implementer` | Implementing a change from its OpenSpec proposal and failing tests, running the Green → Refactor loop until all quality gates pass. |
| `test-writer` | Writing comprehensive test suites across all tiers — unit, PGlite integration, real-DB integration, and Playwright E2E. Knows when to use each tier and DELTA's full test infrastructure. |
| `solid-reviewer` | Reviewing code changes against SOLID principles, with primary focus on SRP and DIP. Reports violations with concrete refactoring steps. Invoked by sdd-implementer during the Refactor phase. |

## Skills

Reusable methodology and quality gate documents referenced by agents and humans alike.
Located in `.github/skills/`.

| Skill | Purpose |
|---|---|
| `tdd-cycle/SKILL.md` | Red→Green→Refactor methodology with DELTA-specific tooling and conventions |
| `anti-pattern-check/SKILL.md` | Full quality gate checklist: known anti-patterns, auth, multi-tenancy, DB, error handling, code quality |

## Proposed agents

These would add real value given the project's structure. None are implemented yet.

### `drizzle-migration`

**What it would know:** Drizzle schema conventions for this project — `ourRandomUUID()` for primary keys, `uuid` for foreign key references, always including `countryAccountsId` for tenant scoping, `Tx` union type for transaction-safe model functions, migration safety rules (`yarn dbsync` only, never `drizzle-kit push`), and the layout of `app/drizzle/schema/`.

**Trigger phrases:** "add a new database table", "create a schema for...", "write a migration", "add a column to..."

### `i18n-workflow`

**What it would know:** The full end-to-end translation process — adding `ctx.t({ code, msg })` calls, running `yarn i18n:extractor`, pushing to the `weblate` branch, triggering DeepL pre-translation, and the Weblate programmer workflow. Would also know the difference between app-ui strings (`locales/app/`) and content strings (`locales/content/`), and which extractor handles each.

**Trigger phrases:** "add a translated string", "make this text translatable", "update translations", "run the extractor"

### `api-route-builder`

**What it would know:** How to scaffold a new API route in this project — `$lang+/api+/` path convention, correct `authLoaderWithPerm` / `authActionWithPerm` wrapping, `BackendContext` initialisation, JSON response shape, and how the `form_api.ts` handler functions (`jsonCreate`, `jsonUpdate`, `jsonUpsert`) map to route files.

**Trigger phrases:** "add a new API endpoint", "create a JSON API route", "add an API for...", "expose ... via the API"

## Keeping agents current

An agent that points at wrong file paths or describes stale conventions is worse than no agent — it confidently misleads. When making structural changes to the codebase:

- Update any agent whose domain is affected
- Agents referencing specific file paths should be checked when those paths change
- The `drizzle-migration` and `api-route-builder` agents (once written) would need updating if the handler or schema layout changes
