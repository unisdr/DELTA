## Layer 12 — Documentation

**Files read:** `readme.md`, `CHANGELOG.md`, `LICENSE`, `_docs/index.md`, `_docs/code-structure/code-structure.md`, `_docs/code-structure/form-csv-api.md`, `_docs/translations/index.md`, `_docs/installation/shared-instance-installation.md`, `_docs/License/INDEX.md`, `_docs/License/DPG-compliance-matrix.md`, `_docs/mcp.md`, `_docs/api.md`, `_docs/High Availability (HA)/01-HA-Analysis-Report.md`, `scripts/README.md`

---

### Documentation inventory

| Location | Content | Signal |
| --- | --- | --- |
| `readme.md` | Intro, features, stack, project structure, quick start, env vars, production recs, contributing | Good skeleton — contains factual errors |
| `CHANGELOG.md` | Keep a Changelog format, SemVer declared | Only 2 entries (v0.2.0, v0.1.3); v0.1.0–v0.1.2 unrecorded |
| `LICENSE` | Full Apache 2.0 text | Copyright placeholder `[yyyy] [name of copyright owner]` is unfilled |
| `_docs/index.md` | Navigation hub for developer docs | Minimal link list only |
| `_docs/code-structure/` | models, handlers, routes, frontend, drizzle, form-csv-api | Useful but thin — mostly folder + pattern names, little depth |
| `_docs/translations/` | Weblate, DeepL, file format, language param, app-ui, content | Strongest section — genuinely comprehensive |
| `_docs/installation/shared-instance-installation.md` | Docker + manual install, super admin, troubleshooting | Good; some sections reference outdated tooling |
| `_docs/License/` | DPG compliance matrix (72%), license comparison, Apache 2.0 rationale | Strong governance docs — well-researched |
| `_docs/mcp.md` | MCP endpoint, VS Code + opencode.ai config | Brief but practical |
| `_docs/api.md` | **62 bytes** — heading only | Critical gap for any external integrator |
| `_docs/High Availability (HA)/` | HA feasibility analysis | Internal research doc; not user-facing |
| `_docs/security/` | API key user assignment | Single narrow doc |
| `_docs/division/` | Division import guide | Technical and useful |
| `_docs/dashboards/sectors/` | Developer + user guide | One of the few end-user-facing docs in the repo |
| `scripts/README.md` | `.bat` / `.sh` script usage | Exists; references `bin/` folder that may not be present |
| `.github/` | **Does not exist** | No issue templates, PR templates, CODEOWNERS |

---

### Industry standard assessment — Diataxis framework

The [Diataxis](https://diataxis.fr/) framework defines four types of documentation that every production open-source tool needs:

| Diataxis type | Purpose | DELTA coverage |
| --- | --- | --- |
| **Tutorials** (learning-oriented) | "Follow this to get something working" | `shared-instance-installation.md` exists. No "my first disaster record" onboarding journey. No user-level tutorial at all. |
| **How-to guides** (goal-oriented) | "How do I accomplish X" | Partial: division import, CSV import, Weblate, MCP connection. Most application workflows have no how-to guide. |
| **Reference** (information-oriented) | API reference, data model, config options | `_docs/api.md` is 62 bytes. No OpenAPI spec published. No data model reference doc. No env var reference beyond README prose. |
| **Explanation** (understanding-oriented) | "Why is it designed this way?" | `database-options.md`, `license-recommendation.md`, `DPG-compliance-matrix.md` are good ADR-style explanations. Everything architectural is otherwise undocumented. |

**Estimated Diataxis coverage: ~18%.** Tutorials and Reference are effectively absent. How-to is sparse. Explanation exists only for licensing and licensing-adjacent topics.

---

### GitHub Community Health Standards

GitHub's Community Standards checklist for public repositories:

| File | Status | Notes |
| --- | --- | --- |
| `README.md` | ✅ Exists | Has factual errors — see below |
| `LICENSE` | ⚠️ Exists | Apache 2.0 text present but copyright line is an unfilled placeholder |
| `CONTRIBUTING.md` | ❌ Missing | Planned in `_docs/License/INDEX.md` but not written |
| `CODE_OF_CONDUCT.md` | ❌ Missing | Required for DPG and most contributor programs |
| `SECURITY.md` | ❌ Missing | No vulnerability disclosure policy, no responsible disclosure contact |
| `CODEOWNERS` | ❌ Missing | No defined review ownership for any codebase area |
| `.github/ISSUE_TEMPLATE/` | ❌ Missing | No bug report or feature request templates |
| `.github/PULL_REQUEST_TEMPLATE.md` | ❌ Missing | No PR quality checklist |
| `NOTICE` | ❌ Missing | Apache 2.0 requires a `NOTICE` attribution file |

**5 of 9 community health files are absent.** Without `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`, GitHub marks the repository as failing its own Community Standards check — visible to any prospective contributor on the Insights tab.

---

### Errors in existing docs

These are factually wrong, not just incomplete:

**Gap L12-1: `readme.md` says "Jest" and wrong test command**
`readme.md:126` says "Run unit and integration tests with Jest". The project uses **Vitest**. The command shown (`yarn run test`) does not exist in `package.json`. Correct command: `yarn test:run2`.

**Gap L12-2: `readme.md` says "Remix (React)" in tech stack**
`readme.md:27` lists "Remix (React)". The project migrated to **React Router v7** — Remix is the legacy name. New contributors will search Remix documentation and find mismatches.

**Gap L12-3: Apache 2.0 `LICENSE` has unfilled copyright placeholder**
`LICENSE` contains `Copyright [yyyy] [name of copyright owner]`. Apache 2.0 is legally incomplete without the actual year and rights holder. UNDRR/UNISDR name and year must be inserted.

**Gap L12-4: `_docs/api.md` is empty**
The file contains only a `# API` heading — 62 bytes. Any external integrator or AI assistant that navigates here for API documentation finds nothing.

---

### Changelog quality

`CHANGELOG.md` follows Keep a Changelog format and declares SemVer — correct choices. Problems:

- Only 2 entries: v0.2.0 (Feb 2026) and v0.1.3 (Dec 2025). Versions v0.1.0, v0.1.1, v0.1.2 are not recorded.
- v0.2.0 has 4 bullet points for what was a major React Router + React 19 upgrade cycle — underdocumented.
- No `[Unreleased]` section (Keep a Changelog convention for tracking in-progress changes).
- Entirely hand-maintained — depends on a human remembering to update before each release. No automation.

---

### Versioned documentation

There is no versioned documentation system. All docs are flat markdown files committed to the `main` branch. A user running v0.1.3 reading `main` branch docs may encounter instructions that don't apply to their version. No published docs site exists — everything requires raw GitHub navigation.

---

### DPG compliance — documentation impact

`_docs/License/DPG-compliance-matrix.md` self-scores at **72%** (5 of 9 indicators fully compliant). Documentation gaps directly affect the remaining 28%:

- **Indicator 2 (Open License)**: Unfilled copyright placeholder in `LICENSE`.
- **Indicator 5 (Documentation)**: "Incomplete documentation for country-level deployment" and "Limited data extraction documentation for non-technical users" — both doc gaps.
- **Indicator 7 (Standards compliance)**: "Incomplete documentation of standards compliance."

Closing the `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `NOTICE`, and API reference gaps would directly advance DPG compliance toward the 100% target.

---

### Gaps

**Gap L12-1: `readme.md` factual errors (Jest reference, Remix label, wrong test command)**
See above. First file any new contributor reads — errors here immediately erode confidence.

**Gap L12-2: `_docs/api.md` is empty**
The entry point for API documentation is a single heading. Any external system, AI assistant, or DesInventar integration team hits a dead end.

**Gap L12-3: `LICENSE` copyright placeholder unfilled**
Apache 2.0 text is present but legally incomplete. `[yyyy]` and `[name of copyright owner]` must be replaced with the actual values (UNDRR / UNISDR, year of first publication).

**Gap L12-4: `NOTICE` file missing**
Apache 2.0 Section 4(d) requires a `NOTICE` file when the work contains attribution notices. Without it, redistributors cannot comply with the license properly.

**Gap L12-5: `CONTRIBUTING.md` missing**
Without a contribution guide, new contributors have no authoritative source on: how to set up a dev environment, how to run tests before submitting, what the branching model is, the commit message format, or how PRs are reviewed. Currently a contributor has to synthesize this from `readme.md`, `CLAUDE.md`, and `_docs/code-structure/`.

**Gap L12-6: `CODE_OF_CONDUCT.md` missing**
Required for DPG recognition and expected by open-source contributor communities. No code of conduct = no enforceable standard for community behaviour.

**Gap L12-7: `SECURITY.md` missing**
No responsible disclosure process. If someone finds a vulnerability in a UN-backed national disaster tracking system, there is no documented channel for reporting it. This is a reputational and operational risk.

**Gap L12-8: `.github/` directory entirely absent**
No issue templates (bug / feature / question), no PR template, no CODEOWNERS. Issues will be filed inconsistently, PRs will lack context, and there is no automated reviewer assignment.

**Gap L12-9: No automated changelog — version history has gaps**
v0.1.0 through v0.1.2 are unrecorded. Changelog is entirely manual. Without Conventional Commits + `release-please` or equivalent, every release depends on human discipline.

**Gap L12-10: No versioned published docs site**
Docs are raw markdown on GitHub. No versioning by release tag, no searchable site, no stable URL per version. Incompatible with DELTA's multi-version deployment model (countries run different versions).

**Gap L12-11: No user-facing tutorial content**
The only end-user docs are `_docs/dashboards/sectors/user-guide.md`. There is no tutorial for the primary use case: recording a disaster event, entering losses and damages, running a report, and exporting data. Country-level staff who are the actual end users have no documentation.

**Gap L12-12: No ADR system**
`database-options.md` and `license-recommendation.md` are written in ADR style but live as one-off files. There is no systematic Architecture Decision Record directory. Architectural reasoning (why React Router v7, why Drizzle, why PostgreSQL RLS) is undocumented and lives only in developer memory.

---

### AI-Assisted Development Lifecycle — recommendations

**1. CLAUDE.md as the AI Knowledge Contract (extend what already exists)**
The existing `CLAUDE.md` is ahead of most open-source projects — it describes architecture and patterns for AI assistants. Extend it to include known P0 bugs (so AI assistants don't reproduce them), schema change freeze zones, and auth patterns that must not be simplified by refactoring agents.

**2. Conventional Commits + automated changelog (`release-please`)**
Replace manual `CHANGELOG.md` maintenance with Conventional Commits (`feat:`, `fix:`, `docs:`, `BREAKING CHANGE:` prefixes) and Google's `release-please` GitHub Action. On merge to `main`, `release-please` opens a release PR that auto-generates `CHANGELOG.md` entries and bumps `package.json` version. The changelog becomes a verified CI artifact.

**3. TypeDoc for auto-generated API reference**
The codebase uses TypeScript strict mode throughout. Adding `typedoc` generates a full reference from existing type signatures and any TSDoc comments added over time. Run in CI on every merge to `main` — `_docs/api.md` is replaced by a generated reference that is always current.

**4. OpenAPI + Redoc for published REST API docs**
The refactoring plan already proposes `_docs/api-specs/` with Spectral linting (P2-7). Extend the pipeline to publish rendered docs: `redoc-cli build` → served at `/api-docs` from the app itself, or published via GitHub Pages. AI assistants pointed at the OpenAPI spec get structured, machine-readable API knowledge rather than parsing prose.

**5. MkDocs Material + `mike` for versioned published docs**
[MkDocs Material](https://squidfunk.github.io/mkdocs-material/) is the recommended docs platform for this context: zero-config, government-friendly aesthetic, built-in versioning via `mike`, and native i18n support that mirrors DELTA's own multi-language design. The existing `_docs/` directory maps directly to MkDocs's `docs/` convention with minimal restructuring. After each release: `mike deploy v0.2 latest --push`. The CI step `mkdocs gh-deploy --force` on merge to `main` keeps the live site current.

**6. Formalized ADR system (MADR format)**
Adopt [MADR](https://adr.github.io/madr/) under `_docs/decisions/`. In an AI-assisted workflow, an AI assistant writes the ADR draft as part of any PR that contains a significant architectural decision — it gets committed alongside the code. The License/ directory documents become `0001-apache-license.md`, etc. Architectural reasoning becomes versioned and searchable.

**7. Docs-as-code CI checks**
Add to the CI pipeline (P1-37):
- `markdownlint` — enforce consistent doc style
- `markdown-link-check` — catch broken internal and external links
- `typedoc --emit none` (dry run) — verify doc generation passes
- `mkdocs build --strict` — fail CI if any doc cross-reference is broken
This makes documentation a first-class quality gate, not an afterthought.

**8. AI-assisted doc generation hooks**
Add a PR template checkbox: `[ ] I have updated _docs/ or confirmed no documentation change is needed.` Add a CI check: if `app/routes/*/` or `app/backend.server/models/` changed but `_docs/` did not, the PR receives an automated comment flagging the gap. This keeps docs in sync with code in an AI-heavy development cycle where large code changes land rapidly.

---

### What works well

- **Translation docs are the strongest section** — `_docs/translations/` covers Weblate, DeepL, file format, language parameter, app-UI vs content types with multiple guides. Reflects the genuine complexity of the i18n system.
- **DPG compliance effort is serious** — the `License/` directory shows genuine institutional commitment: license comparison, dependency review, compliance matrix with roadmap and completion dates. Few government-backed OSS tools have this level of governance documentation.
- **`CLAUDE.md` as AI knowledge file** — having a dedicated file that describes architecture and conventions for AI assistants is forward-thinking. Most open-source projects have nothing equivalent.
- **MCP endpoint is documented with working config examples** — `_docs/mcp.md` gives concrete client configs for VS Code and opencode.ai. Practical and unusual for this type of system.
- **Installation guide covers multi-tenant complexity** — `shared-instance-installation.md` explains the single-DB multi-tenancy architecture, two deployment modes (Docker and manual), super admin setup, and troubleshooting. Useful for deployment teams.
- **ADR culture exists** — `database-options.md`, `license-recommendation.md`, `DPG-compliance-matrix.md` demonstrate a habit of documenting decisions with options considered and rationale. The pattern just needs to be systematized.

---

### Already tracked — reference only

- **P1-37** — Add CI/CD pipeline (where docs-as-code checks will be added)
- **P2-7** — Add Zod input validation + OpenAPI specs (`_docs/api-specs/`)

---
