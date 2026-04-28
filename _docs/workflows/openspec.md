# Spec-Driven Development with OpenSpec

DELTA uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) to ensure every non-trivial change is
specified before it is implemented. This keeps AI-assisted development predictable across different
tools and models — the spec, not the chat history, is the source of truth.

## First-time setup

OpenSpec is a global CLI tool. Install it once per machine:

```bash
npm install -g @fission-ai/openspec@latest
```

The project is already initialised (`openspec/` directory exists). No `openspec init` needed after
cloning.

## The workflow

Every change follows four steps:

```
1. /opsx:propose  →  spec artifacts generated in openspec/changes/<name>/
2. Review         →  human reviews proposal.md, specs/, design.md, tasks.md
3. /opsx:apply    →  implementation (TDD: Red → Green → Refactor)
4. /opsx:archive  →  change closed, delta specs merged into openspec/specs/
```

Never skip the review step between propose and apply. The spec is a checkpoint, not a formality.

## Step 1 — Propose

Describe your intent to your AI assistant and invoke:

```
/opsx:propose "fix deleteByIdForStringId to await the delete and throw on not-found"
```

The `spec-writer` agent picks this up. It reads the relevant source files, then generates:

| Artifact | Purpose |
|---|---|
| `proposal.md` | What, why, files affected, test approach |
| `specs/` | Given/When/Then scenarios (observable behaviour only) |
| `design.md` | Types, Drizzle schema changes, test infrastructure |
| `tasks.md` | Ordered implementation checklist (TDD sequence) |

The project config at `openspec/config.yaml` injects DELTA's conventions and rules into every
artifact automatically.

## Step 2 — Review

Read each artifact before running apply. Check:
- `proposal.md` — does the scope make sense? Are all affected files listed?
- `specs/` — do the scenarios cover both happy path and failure paths?
- `design.md` — are the TypeScript types correct? Is the right test tier chosen?
- `tasks.md` — does the task order follow TDD (failing test first)?

Amend the files directly if anything is wrong. They are plain Markdown.

## Step 3 — Apply

```
/opsx:apply
```

Three agents run in sequence:

1. **`tdd-test-writer`** — writes failing Vitest tests from the spec (Red phase only). Stops here.
2. *(human confirms tests fail for the right reason)*
3. **`sdd-implementer`** — makes tests pass (Green), then runs the 7-gate Refactor loop until
   all quality checks pass: tests green → tsc → format → anti-patterns → SOLID → docs → conventions.

The `solid-reviewer` agent is invoked by `sdd-implementer` during the SOLID gate.

## Step 4 — Archive

```
/opsx:archive
```

Merges the change's delta specs into `openspec/specs/`, moves the change folder to
`openspec/archive/`, and closes the change. Run this after the PR is merged.

## Agents and skills reference

| File | Role |
|---|---|
| `.github/agents/spec-writer.agent.md` | Generates OpenSpec proposal from intent |
| `.github/agents/tdd-test-writer.agent.md` | Writes failing tests (Red phase) |
| `.github/agents/sdd-implementer.agent.md` | Green → Refactor loop with quality gates |
| `.github/agents/test-writer.agent.md` | Comprehensive test suites (all tiers, independent of TDD cycle) |
| `.github/agents/solid-reviewer.agent.md` | SOLID design review (SRP and DIP focus) |
| `.github/skills/tdd-cycle.md` | TDD Red→Green→Refactor methodology and DELTA tooling |
| `.github/skills/anti-pattern-check.md` | Quality gate checklist — run before every PR |

## Useful commands

```bash
# List all active changes
npx @fission-ai/openspec list

# Check artifact status for a change
npx @fission-ai/openspec status --change "<name>"

# View a change
npx @fission-ai/openspec show --change "<name>"

# Run a single test file
yarn vitest run tests/path/to/file.test.ts

# Full PGlite suite (primary gate)
yarn test:run2

# Type check
yarn tsc

# Format check
yarn format:check
```

## When not to use OpenSpec

- Typo fixes, one-line changes, or changes where the intent is completely unambiguous
- Emergency hotfixes where speed matters more than process

For everything else — especially anything touching models, handlers, or auth — use the workflow.
