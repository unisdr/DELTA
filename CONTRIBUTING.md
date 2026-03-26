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

## Before submitting

Run the unit and integration tests and make sure they pass:

```bash
yarn test:run2
```

For end-to-end tests:

```bash
yarn test:e2e
```

## Pull requests

- Target `dev`, not `main`
- Title should describe the change and reference the issue (e.g. `Bug: attachment upload error message #422`)
- `main` is updated from `dev` by maintainers at release time

## Licensing

By submitting a contribution you agree to license your work under the [Apache License 2.0](LICENSE).
