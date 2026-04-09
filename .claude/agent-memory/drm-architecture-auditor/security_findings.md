---
name: Security Findings
description: Structural security issues identified in 2026-04-01 audit — not code-level bugs but architectural risks
type: project
---

## 1. API Keys Stored Plaintext
`apiKeyTable.secret` is stored as plaintext in DB. If DB is compromised, all API keys are immediately usable. Should be stored as bcrypt/SHA-256 hash, compared on lookup.
- File: `app/backend.server/models/api_key.ts` line 26 (generateSecret stores raw value)

## 2. No PostgreSQL Row-Level Security
All tenant isolation is application-enforced via `countryAccountsId` WHERE clauses. No PostgreSQL RLS policies exist. A single SQL injection or query construction bug bypasses all tenant isolation for all tenants simultaneously.

## 3. Superadmin Mock Session Bypasses Normal Auth
`authLoaderWithPerm` creates a hardcoded mock userSession object `{ user: { id: "super_admin" } }` for superadmin. This synthetic identity is passed to business logic functions that expect real user objects. The string "super_admin" is used as a userId in audit logs.
- File: `app/utils/auth.ts` lines 191-203, 422-430

## 4. CSP `unsafe-inline` in Production Build Config
`vite.config.ts` sets `script-src 'self' 'unsafe-inline'` which defeats XSS protection from CSP. This is set in the dev server middleware; production CSP headers are applied separately (unknown location) — risk depends on production header config.
- File: `vite.config.ts` line 35

## 5. SESSION_SECRET Shared Between User and Superadmin Cookies
Both `__session` and `__super_admin_session` cookies use the same `SESSION_SECRET`. A compromised session secret affects both regular users and the superadmin channel simultaneously.
- File: `app/utils/session.ts` lines 31-56

## 6. No Rate Limiting on Auth Endpoints
No rate limiting middleware observed on login, TOTP, password reset, or API key endpoints. Brute force attacks on form authentication are unbounded.

## 7. `console.log("1")` and `console.log("2")` Left in Production Auth Code
Debug logging in `authActionWithPerm` in `app/utils/auth.ts` lines 433, 448. These are low-severity but indicate the auth middleware has not been properly reviewed/cleaned before shipping.

## 9. Cross-Tenant GeoJSON Leakage (Identified 2026-04-02)
`spatial-footprint-geojson.ts` queries `disaster_records.spatial_footprint` by `record_id` and `division_id` with no tenant ownership check. The `authLoaderApiDocs` guard only checks ViewApiDocs permission, not that the record belongs to the caller's country account. Any authenticated user knowing a UUID can retrieve geometry data from any tenant's disaster record.
- File: `app/routes/$lang+/api+/spatial-footprint-geojson.ts` lines 5–42
- Fix: Add sub-query join against `disaster_records.country_accounts_id` scoped to caller's tenant. Return 404 (not 403) to avoid record existence disclosure.

## 8. Invite Code Reuse Risk
When re-inviting an unverified user who already has a valid `inviteCode`, the existing code is reused without regeneration (`existingInviteCode` is sent again). If the original invite email was intercepted, the window of exposure is extended.
- File: `app/services/accessManagementService.ts` lines 205-230
