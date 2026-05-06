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

Every change follows these steps:

```
0. /opsx:explore  →  (optional) clarify a vague intent before proposing
1. /opsx:propose  →  spec artifacts generated in openspec/changes/<name>/
2. Review         →  human reviews proposal.md, specs/, design.md, tasks.md
3. /opsx:apply    →  implementation (TDD: Red → Green → Refactor → archive)
4. Raise PR       →  artifacts are already archived on the branch
```

Never skip the review step between propose and apply. The spec is a checkpoint, not a formality.

## Step 0 — Explore (optional)

Use this when the intent is vague, the problem space is ambiguous, or you need to compare
approaches before committing to a proposal.

```
/opsx:explore "I think there's a performance issue in the analytics queries"
```

Explore is a thinking-partner mode — it investigates and clarifies requirements without generating
implementation artifacts. Once the intent is clear, proceed to propose.

Skip this step when the intent is already well-understood.

## Step 1 — Propose

Describe your intent to your AI assistant and invoke:

```
/opsx:propose "fix deleteByIdForStringId to await the select and throw on not-found"
```

The `spec-writer` agent picks this up. It first runs **Phase 0** — reading the actual source files
to validate the intent is still needed and hasn't already been resolved. If the change is confirmed
necessary, it generates:

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

The `sdd-implementer` agent runs the full TDD loop:

1. **Red phase** — invokes `tdd-test-writer` to write failing Vitest tests from the spec.
   Confirms tests fail specifically because the behaviour doesn't yet exist (not due to import
   errors or setup issues). *(Recommended: verify the failure reason yourself before proceeding.)*
2. **Green phase** — writes the minimum code to make the failing tests pass.
3. **Refactor loop** — runs 7 quality gates in order. If any gate fails, refactors and re-runs
   from that gate. Exits only when all pass:

   | Gate | Check |
   |---|---|
   | 1 | `yarn vitest run` — tests still green |
   | 2 | `yarn tsc` — zero TypeScript errors |
   | 3 | `yarn format:check` — Prettier clean |
   | 4 | Anti-pattern review — `.github/skills/anti-pattern-check/SKILL.md` |
   | 5 | SOLID review — `solid-reviewer` agent (SRP and DIP focus) |
   | 6 | Documentation review — comments explain WHY, not WHAT |
   | 7 | Project conventions — `.github/copilot-instructions.md` |

4. **Archive** — runs `opsx:archive` as the final step on the branch (see below).

## Step 4 — Archive and raise PR

`opsx:archive` is the last commit on the implementation branch, before the PR is raised:

```
/opsx:archive
```

This merges the change's delta specs into `openspec/specs/`, moves the change folder to
`openspec/changes/archive/`, and closes the change. No separate branch needed — the archived
artifacts travel with the implementation in the same PR.

After archiving, raise the PR targeting `dev` as normal.

## Agents and skills reference

| File | Role |
|---|---|
| `.github/agents/spec-writer.agent.md` | Phase 0 intent validation + OpenSpec proposal generation |
| `.github/agents/tdd-test-writer.agent.md` | Writes failing tests (Red phase) — invoked by sdd-implementer |
| `.github/agents/sdd-implementer.agent.md` | Orchestrates Red → Green → 7-gate Refactor → archive |
| `.github/agents/test-writer.agent.md` | Comprehensive test suites (all tiers, independent of TDD cycle) |
| `.github/agents/solid-reviewer.agent.md` | SOLID design review — invoked by sdd-implementer at gate 5 |
| `.github/skills/tdd-cycle/SKILL.md` | TDD Red→Green→Refactor methodology and DELTA tooling |
| `.github/skills/anti-pattern-check/SKILL.md` | Quality gate checklist — run before every PR |

## Useful commands

```bash
# List all active changes
openspec list

# Check artifact status for a change
openspec status --change "<name>"

# View apply instructions for a change
openspec instructions apply --change "<name>"

# Run a single test file
yarn vitest run tests/path/to/file.test.ts

# Full PGlite suite (primary gate)
yarn test:run2

# Type check
yarn tsc

# Format check / fix
yarn format:check
yarn format
```

## When not to use OpenSpec

- Typo fixes, one-line changes, or changes where the intent is completely unambiguous
- Emergency hotfixes where speed matters more than process

For everything else — especially anything touching models, handlers, or auth — use the workflow.
