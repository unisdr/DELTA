# P0 Audit Item List

Items to be verified and triaged in a Phase 0 source code audit.
Each entry maps to a known issue identified during the pre-Phase 0 codebase analysis.

Update `status` as items are resolved. Remove an item from this list only after its
fix has been merged and verified — the audit workflow uses this list as its scope.

---

## Items

> **Agent instruction:** Process each item in list order, one at a time. Do not
> batch items or skip any entry. Items with a link in the Notes column have a
> corresponding entry in the "Item Notes" section below — read that entry before
> analysing the source code for that item. Those notes define the intended behavior
> and take precedence over anything inferred from code reading alone.

| ID | Title | Status | Notes |
|----|-------|--------|-------|
| P0-0 | Remove/guard example & dev-example routes in production | `todo` | [notes](#p0-0) |
| P0-1 | Fix NODE_ENV in Dockerfile | `todo` | |
| P0-2 | Fix no-op `deleteById` await | `todo` | |
| P0-3 | Remove debug console.log + lint rule | `todo` | |
| P0-4 | Add coverage thresholds baseline | `todo` | [notes](#p0-4) |
| P0-5 | Fix placeholder support email in ErrorBoundary | `todo` | [notes](#p0-5) |
| P0-6 | Fix hardcoded `/en/` URL in email notifications | `todo` | [notes](#p0-6) |
| P0-7 | Fix `deleteAllData` silent error swallow | `todo` | |
| P0-8 | Fix `revokeUserApiAccess` sets emailVerified=false | `todo` | |
| P0-9 | Fix `handleTransaction` sentinel string | `todo` | [notes](#p0-9) |
| P0-10 | Fix type export bugs in humanCategoryPresence + hipHazard | `todo` | |
| P0-11 | Remove dead `countryName` column from instance_system_settings | `todo` | |
| P0-12 | Remove secret logging in env.ts | `todo` | |
| P0-13 | Fix `rejectUnauthorized: false` in SMTP transport | `todo` | |
| P0-14 | Fix `sanitizeInput` — remove destructive quote stripping | `todo` | |
| P0-15 | Fix `destroyUserSession` graceful handling of missing session | `todo` | [notes](#p0-15) |
| P0-16 | Delete dead cost calculation API endpoints (4 files, zero callers) | `todo` | |
| P0-17 | Fix `export_tables_for_translation.ts` — writes to directory not file | `todo` | |
| P0-18 | Add `.dockerignore` — prevent image bloat and secret leak | `todo` | |
| P0-19 | Fix `build_binary.sh` — build failure must be fatal | `todo` | |
| P0-20 | Add CSP header to `entry.server.tsx` — missing from production | `todo` | |
| P0-21 | Delete dead Selenium legacy file (`tests/selenium/browser.side`) | `todo` | |
| P0-22 | Fix `readme.md` factual errors — Jest→Vitest, Remix→React Router v7, correct test command | `todo` | |
| P0-23 | Fill Apache 2.0 LICENSE copyright placeholder — year + UNDRR legal entity | `todo` | [notes](#p0-23) |
| P0-24 | Create `CONTRIBUTING.md` — dev setup, branching, commit format, PR process | `todo` | [notes](#p0-24) |
| P0-25 | Create `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1 | `todo` | [notes](#p0-25) |
| P0-26 | Create `SECURITY.md` — vulnerability disclosure policy and contact | `todo` | [notes](#p0-26) |
| P0-27 | Add `NOTICE` file — Apache 2.0 Section 4(d) attribution requirement | `todo` | [notes](#p0-27) |

---

## Item Notes

Notes are provided only where the correct fix intent cannot be determined from reading
the code alone. Items not listed here are self-evident from their title and source.

#### P0-0

Routes must not be reachable in production under any circumstances.
The fix is either deletion (preferred if routes have no legitimate staging use) or
a hard `NODE_ENV !== 'production'` guard that returns 404. The agent should flag
which option applies based on whether a staging use case is present in the code.

#### P0-4

Do not set aspirational thresholds. Measure current passing coverage first
and set the initial threshold at that level. The goal is to prevent regression from
the baseline, not to enforce an arbitrary target.

#### P0-5

The support email is a placeholder (e.g. `support@example.com` or similar).
The correct fix is to read it from an environment variable (e.g. `SUPPORT_EMAIL`) so
each deployment can configure its own value. The agent should flag whether a fallback
hardcoded value is present and whether it is appropriate.

#### P0-6

The `/en/` prefix in outgoing email URLs is hardcoded, meaning users with
a non-English locale receive links that force the English UI. The correct behavior is
to derive the language prefix from the recipient user's stored locale preference, or
fall back to the system default locale env var if no preference is set.

#### P0-9

`handleTransaction` returns a string sentinel (e.g. `"ERROR"` or similar)
to signal failure instead of throwing a typed Error. Callers check for the sentinel
string, which is untyped and bypasses TypeScript's control-flow analysis. The correct
fix is to throw a typed Error subclass so callers can use `instanceof` checks and the
compiler enforces exhaustive handling.

#### P0-15

`destroyUserSession` should be idempotent: if the session does not exist,
the function should return successfully rather than throwing. Destroying an already-
absent session is not an error condition — this comes up during logout after session
expiry and must not produce an unhandled exception.

#### P0-23

The LICENSE file has a placeholder for the copyright year and legal entity
name. The year should reflect the year of the initial public commit. The legal entity
is "United Nations Office for Disaster Risk Reduction (UNDRR)". Confirm both values
are correct before closing this item.

#### P0-24

CONTRIBUTING.md must cover at minimum: local dev environment setup
(Node version, env vars, DB setup), branching convention (`feature/`, `fix/`, `chore/`
prefixes), commit message format (Conventional Commits), and PR process including
review requirements and the definition of "ready to merge".

#### P0-25

Use Contributor Covenant v2.1 verbatim. The only required customisation
is the enforcement contact email — this should be a monitored address owned by the
UNDRR/UNICC project lead, not a personal email.

#### P0-26

SECURITY.md must state: which versions are currently supported with
security fixes, how to report a vulnerability (private channel — do not use the
public issue tracker), the expected response SLA, and whether a coordinated disclosure
or bug bounty programme exists. If none exists yet, state that explicitly.

#### P0-27

The Apache 2.0 NOTICE file must attribute the original authors and list
any third-party components whose licences require attribution in the NOTICE file
(check bundled dependencies for Apache 2.0 components with their own NOTICE content).
The primary attribution line should read: "DELTA Resilience Platform — Copyright
[year] United Nations Office for Disaster Risk Reduction (UNDRR)".
