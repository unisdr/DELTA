# Contributing to DELTA

Thanks for contributing. Please read this before opening a branch or PR.

## Scope

We are in active development and ask contributors to focus on **bug fixes**, **documentation**, and **minor improvements**. Large features and major refactors are not accepted at this time.

## Before you start

Read `_docs/code-structure/code-structure.md` and the related pages. They explain folder structure, how routes and handlers work, and conventions used across the codebase.

## Branch naming

| Type | Pattern | Example |
|---|---|---|
| Bug fix | `bug/issuenumber-short-description` | `bug/422-upload-error-message` |
| Feature | `feature/issuenumber-short-description` | `feature/385-validation-workflow` |
| Refactor | `refactor/short-description` | `refactor/country-accounts-routes` |

Omit the issue number if there is no associated issue (common for refactors).

Always branch from `dev`.

## Commit messages

Use a context prefix and reference the issue number:

```
Bug: attachment upload gives generic error for files over 2MB #422
```

Common prefixes: `Bug:`, `Feature:`, `Refactor:`, `Docs:`, or the relevant component name (e.g. `Damages: fix null check on submission`).

## PR review checklist

Run through this before marking a PR ready for review, and again as a reviewer before approving.

**Tests** — all automated tests must pass:

```bash
yarn test:run2   # unit + integration (PGlite, no external DB needed)
yarn test:e2e    # Playwright end-to-end (requires a running app)
```

**Smoke test** — start the app locally and manually verify the affected area works as expected. Automated tests won't catch every regression in the UI or data flow.

**Documentation** — if behavior, config, or API surface changed, update the relevant pages in `_docs/`. Re-read anything you touched and confirm that commands, paths, and descriptions still match the actual code.

**Translations** — if you added or changed any user-facing strings, run the extractor and commit the result:

```bash
yarn i18n:extractor
```

This updates `locales/app/en.json` (and the other locale files). English is the source of truth; strings in other languages can be left blank for translators to fill in. Do not remove or rename existing keys without confirming no other route depends on them.

**Environment variables** — if you introduced a new env var, add it to `example.env` with a short comment explaining what it does and whether it is required.

## Pull requests

- Target `dev`, not `main`
- Title should describe the change and reference the issue (e.g. `Bug: attachment upload error message #422`)
- `main` is updated from `dev` by maintainers at release time

## Licensing

By submitting a contribution you agree to license your work under the [Apache License 2.0](LICENSE).
