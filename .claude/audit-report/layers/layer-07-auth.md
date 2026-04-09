## Layer 7 — Auth, Session & Middleware

### Directory scope

`app/utils/` contains 41 files — far broader than auth/session alone. Beyond the core security files (`auth.ts`, `session.ts`, `passwordUtil.ts`, `csrf.ts`, `ssoauzeb2c.ts`), it includes: logging (`logger.ts`, `logger.server.ts`), email (`email.ts`, `emailUtil.ts`), config (`config.ts`, `env.ts`), geo utilities, CSV, date/time, and general helpers. This is effectively the entire shared utility layer of the application.

---

### `env.ts` — Logs every secret to stdout on startup (Critical)

```ts
content.split("\n").forEach((line) => {
	const [k, v] = splitInto2(line, "=");
	process.env[k] = removeQuotes(v.trim());
	console.log("kv", k, v); // ← prints every key=value from .env
});
```

`loadEnvFile` prints every environment variable it loads to stdout — including `SESSION_SECRET`, `DATABASE_URL`, `SSO_AZURE_B2C_CLIENT_SECRET`, and `SMTP_PASS`. In any environment where logs are collected (Docker, cloud platforms, log aggregators), credentials are now in the log store. This is a credential leak on every process startup.

---

### `email.ts` — TLS certificate verification disabled

```ts
tls: {
    minVersion: "TLSv1.2",         // ✅ correct
    rejectUnauthorized: false,      // ← disables cert verification
    // "Debugging, remove this if working fine"
}
```

A debugging flag never removed from production code. With `rejectUnauthorized: false`, the SMTP connection cannot detect a man-in-the-middle attacker between the app server and the SMTP relay. Outgoing emails — password reset links, invite codes, validation notifications — can be intercepted or modified. For a government system this is a direct attack surface on the user onboarding and approval flows.

Secondary issues:

- `createTransporter()` called on every `sendEmail()` invocation — creates a new SMTP connection per email, expensive under notification bursts
- `EMAIL_FROM` fallback: `'"Example" <no-reply@example.com>'` — if env var is missing, all emails fail SPF/DKIM and go to spam
- `console.log("Email sent: %s", info.messageId)` — noise in production logs

---

### `security.ts` — `sanitizeInput` corrupts legitimate data; `checkRateLimit` never wired

**`sanitizeInput` strips quotes — wrong approach, harmful:**

```ts
input = input.replace(/['";]/g, ""); // "Remove SQL injection patterns"
```

Drizzle ORM uses parameterized queries. SQL injection is impossible regardless of input content. This strip is unnecessary — and actively harmful: `Cyclone O'Neill` → `Cyclone ONeill`; institution names with semicolons are silently truncated; JSON strings in text fields are corrupted. The only legitimate part of this function is the `<[^>]*>` HTML tag strip, which prevents XSS in rendered text fields.

**`checkRateLimit` is never called:**
An in-memory `Map`-based rate limiter is implemented but never imported or applied in any route, middleware, or entry point. It exists as dead code. Additionally it uses `x-forwarded-for` without validation (spoofable by the client) and is single-node only (Map doesn't survive across replicas). P2-1 (`express-rate-limit`) is the correct fix.

---

### `auth.ts` — Three issues beyond P0-3 and P2-2

**P0-3 confirmed:** `console.log("1")` (line 433) and `console.log("2")` (line 450) fire on every 403 Forbidden response in `authActionWithPerm`.

**P2-2 confirmed:** Super admin mock session hardcodes `id: "super_admin"` (non-UUID string) in both `authLoaderWithPerm` and `authActionWithPerm`.

**`hasPermission` — identical dead code branch:**

```ts
if (isSuperAdmin(effectiveRole)) {
	return roleHasPermission(effectiveRole, permission); // same as ↓
}
return roleHasPermission(effectiveRole, permission); // identical
```

Both branches call the same function with the same arguments. The `if` block is dead.

**`authLoaderApiDocs` — tenant validation skipped on API key path:**

```ts
if (authToken) {
	await apiAuth(args.request); // validates key
	return fn(args); // no countryAccountsId check
}
```

When authenticated via `X-Auth` header, the handler skips the `countryAccountsId` presence check that `authLoaderWithPerm` enforces for session-based auth. API key callers can access the docs endpoint without a valid tenant context.

---

### `session.ts` — Three issues

**Multiple cookie parses per request (P1-14 confirmed):** Each session helper independently parses the cookie. `getUserRoleFromSession` alone triggers two parse+DB-query cycles — once inside `getUserFromSession`, once inside `getCountryAccountsIdFromSession`. On a typical authenticated action these are called in sequence, parsing the same cookie 4–6 times.

**`lastActiveAt` written unconditionally on every request (P1-2 confirmed):**

```ts
await dr.update(sessionTable).set({ lastActiveAt: now }).where(...)
```

No threshold — every request causes a DB write regardless of how recently the session was active.

**`destroyUserSession` throws on missing session:**

```ts
if (!sessionId) {
	throw new Error("Session is missing sessionId"); // 500 on double-logout
}
```

A user logging out with an already-expired or absent cookie gets a 500. Should redirect to login gracefully.

**Stale TODO comment:**

```ts
// TODO: currently sessions are not deleted when users are deleted, fix this
```

`sessionTable.userId` has `onDelete: "cascade"` to `userTable` — so sessions _are_ deleted when the user is deleted. Comment is likely stale but should be verified and removed.

---

### `ssoauzeb2c.ts` — Two SSO functions are empty

```ts
export function editProfile(pRedirectURL: string) {
	// entire implementation commented out
}
export function passwordReset(pRedirectURL: string) {
	// entire implementation commented out
}
```

Both functions are fully commented-out no-ops. Profile editing and password reset via Azure B2C SSO are silently broken at the function level — any caller expecting a redirect gets nothing.

---

### `config.ts` — SSO config silently defaults to empty string

All Azure B2C config accessors return `process.env.SSO_AZURE_B2C_... || ""`. A missing env var produces an empty string with no startup warning. The app proceeds to attempt SSO flows with a blank `client_id` and gets a cryptic Azure error at runtime instead of a clear misconfiguration error at boot. There is no startup validation that checks required env vars when `AUTHENTICATION_SUPPORTED=sso_azure_b2c`.

---

### `logger.ts` vs `logger.server.ts` — Two parallel logging systems

|                  | `logger.ts`            | `logger.server.ts`                      |
| ---------------- | ---------------------- | --------------------------------------- |
| Size             | 150 lines              | 550 lines                               |
| Backend          | `console.*` wrappers   | Winston + daily file rotation           |
| Remote transport | None                   | Optional HTTP endpoint                  |
| Client-safe      | Yes                    | No (uses `fs`, `path`)                  |
| Export           | `createLogger(module)` | `createLogger(module)` — same signature |

Both export a `createLogger` function with the same name and signature. Which logger a module gets depends on which file it imports. Most application code uses raw `console.log` directly, so neither is consistently adopted. Application-wide structured logging cannot be enforced while two separate systems exist.

`logger.server.ts` additional issues:

- `process.setMaxListeners(0)` (line 8) — disables Node.js's memory leak warning globally, hiding listener accumulation bugs
- `createLogStream()` monkey-patches `console.error/warn/log` globally — invasive and test-breaking
- `require("events")` inside `createLogStream` — CommonJS `require` in an ESM project

---

### `passwordUtil.ts` — Correct

bcrypt with 10 rounds. `passwordHashCompare` short-circuits on empty strings. No findings.

---

### `csrf.ts` — Token generated, usage unclear

`createCSRFToken()` generates a cryptographically random 100-byte base64 token. Whether the generated token is actually validated on form submissions requires checking route-level usage — the generator alone is not sufficient protection without a corresponding verify step.

---

### `session-activity-config.ts` — Hardcoded, not configurable

```ts
export const sessionActivityTimeoutMinutes = 40;
export const sessionActivityWarningBeforeTimeoutMinutes = 10;
```

Session timeout hardcoded at 40 minutes. Different deployment environments (high-security government vs field worker with intermittent connectivity) may need different values. Not configurable via env var.

---

### What works well

- `passwordUtil.ts` — bcrypt 10 rounds, correct empty-string guard — safe password hashing
- Cookie configuration in `session.ts` — `httpOnly: true`, `sameSite: "lax"`, `secure: NODE_ENV === "production"` — correct setup
- Two separate session cookies (`__session` and `__super_admin_session`) cleanly isolate user and super admin sessions
- `requireUser` TOTP enforcement — correctly gates on `user.totpEnabled && !session.totpAuthed` before granting access
- `authLoaderWithPerm` and `authActionWithPerm` HOF pattern — composable and consistent across 200+ route files
- `errors.ts` — well-structured error class hierarchy (`AppError`, `ValidationError`, `DatabaseError`, etc.) with user-visible/internal distinction — good foundation for structured error handling

---

