## Layer 3 — Data Loading & Server/Client Boundary

### SSR pipeline — how every request flows

```
Browser request
  → entry.server.tsx        renderToPipeableStream (streaming SSR)
  → root.tsx loader         session, user, settings, translations
  → route loader            page-specific data
  → React renders on server HTML streamed to browser
  → entry.client.tsx        React hydrates, takes over
  → subsequent navigations  client-side, loaders re-run via fetch
```

`entry.server.tsx` correctly uses `renderToPipeableStream` with two modes:

- `onShellReady` for browsers — streams HTML as soon as the shell is ready (progressive)
- `onAllReady` for bots — waits for full render before sending (correct for SEO crawlers)

Streaming SSR is technically enabled. But no route loader uses `defer()` — so all data must complete before any HTML is sent. The streaming capability is unused at the data layer.

---

### Root loader — 8 sequential awaits on every single request

`app/root.tsx` loader runs before every page. It makes 8 sequential async calls, most independent of each other:

```ts
const user = await getUserFromSession(request);              // 1. session + DB
const superAdminSession = await getSuperAdminSession(request); // 2. session again
const session = await sessionCookie().getSession(...);       // 3. session again
const userRole = await getUserRoleFromSession(request);      // 4. session again
const isCountryAccountSelected = await getCountryAccountsIdFromSession(request); // 5. session again
const settings = await getCountrySettingsFromSession(request); // 6. session + DB
const userForFrontend = await authLoaderGetOptionalUserForFrontend(routeArgs);   // 7. session + DB
const translations = loadTranslations(lang);                 // 8. in-memory lookup
```

Calls 1–7 are all independent. They could run as `Promise.all([...])` and resolve in the time of the slowest single call, instead of summing all their times. Tracked as P1-13.

---

### Session cookie parsed 8+ times per request — no memoization

Each session helper (`getUserFromSession`, `getSuperAdminSession`, `getUserRoleFromSession`, `getCountryAccountsIdFromSession`) independently calls `sessionCookie().getSession(request.headers.get("Cookie"))`. On a root load + an `authLoaderWithPerm` route, the same cookie is parsed 8+ times in a single HTTP request. No request-scoped memoization exists. Tracked as P1-14.

---

### `defer()` not used — heavy loaders block rendering

The edit route for hazardous events (`routes/$lang+/hazardous-event+/edit.$id.tsx`) fetches in its loader:

- The event record
- Full HIP hazard hierarchy
- Full division tree (geographic subdivisions)
- Division GeoJSON (geometry data)
- Country settings
- Users with validator role

All awaited sequentially. A field worker on a slow connection sees a blank page until all six queries complete. React Router's `defer()` would allow the page shell to render immediately while the slower data (GeoJSON, tree) streams in. Tracked as P1-15.

---

### Translations injected as inline `<script>` on every page

`app/frontend/translations.ts` generates:

```html
<script>
	window.DTS_TRANSLATIONS = { ...all keys for this language... };
	window.DTS_LANG = "en";
	globalThis.createTranslationGetter = function(_lang) { ... };
</script>
```

Injected into `<head>` on every page. The full translation dictionary is re-serialized and re-sent on every full-page navigation. Combined with `Cache-Control: no-store` globally, it can never be browser-cached. `globalThis.createTranslationGetter` is set here and consumed by `ViewContext` and `BackendContext` — a global variable bridge between the server-serialized data and every component. Fragile: if the script errors, every `ViewContext` construction throws.

---

### Auth wrapper pattern — HOF, clean but duplicating session reads

`app/utils/auth.ts` defines 7 Higher-Order Function wrappers:

```
authLoader, authLoaderWithPerm, authLoaderPublicOrWithPerm,
authLoaderAllowUnverifiedEmail, authLoaderAllowNoTotp,
authLoaderApi, authLoaderApiDocs
```

Pattern is clean and composable. Problem: each wrapper re-reads the session independently. `authLoaderWithPerm` parses the cookie 3–4 more times on top of root loader's 7 reads.

Out of 233 total route loaders/actions, 140 don't call an auth wrapper inline. Not all are unprotected — public routes, API routes, and parent-layout-protected routes account for many — but the pattern is inconsistent and cannot be audited structurally. P1-8 (root authenticated layout) is the structural fix.

---

### `formSave` — best abstraction in the codebase

`app/backend.server/handlers/form/form.ts` (820 lines) handles every create/update mutation:

1. Parses multipart form data
2. Validates via `fieldsDef` rules
3. Enforces approval status constraints by role
4. Wraps in `dr.transaction()`
5. Calls `logAudit()` for every change
6. Returns `redirectWithMessage` (flash) on success, or error payload for re-render

Every mutation is transactional and audited. This is the highest-reliability code in the app. Minor issue: `formSave` calls `getUserRoleFromSession(request)` internally even though the caller (`authActionWithPerm`) already verified the role — one more redundant session parse.

---

### `init.server.tsx` — `importTranslationsIfNeeded` is fire-and-forget

```ts
export function initServer() {
	initDB();
	initCookieStorage();
	globalThis.createTranslationGetter = createTranslationGetter;
	importTranslationsIfNeeded(); // ← no await
}
```

Called without `await`. If it throws, it's an unhandled Promise rejection — Node.js logs it but the server continues in a potentially inconsistent translation state. Related to P2-6 (translation race condition).

---

### Hardcoded placeholder email in production error boundary

`app/root.tsx` `ErrorBoundary` hardcodes:

```tsx
<a href="mailto:support@example.org">support@example.org</a>
```

This placeholder is shipped to production. Users hitting a 500 error are directed to a non-existent address. Tracked as P0-5.

---

### The approval workflow — domain logic in four wrong places

The most business-critical concept — the approval lifecycle — is split across four files in four different layers:

| What                                       | Where                                      | Layer             |
| ------------------------------------------ | ------------------------------------------ | ----------------- |
| `approvalStatusIds` type, field definition | `frontend/approval.ts`                     | UI layer          |
| `adjustApprovalStatsBasedOnUserRole`       | `handlers/form/form.ts`                    | Generic handler   |
| `processValidationAssignmentWorkflow`      | `models/event.ts`                          | Data access layer |
| Permission enforcement                     | `utils/auth.ts` + `frontend/user/roles.ts` | Cross-cutting     |

This is the canonical DDD anti-pattern: a domain concept dispersed across layers. When approval rules change, there is no single authoritative file to update. Tracked as P5-6.

---

### Identifiable bounded contexts

The domain IS clear — bounded contexts are visible, just not structurally separated:

| Bounded Context              | Type                           | Current home                                                                                             |
| ---------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **Disaster Data Management** | Core domain                    | `models/event.ts`, `disaster_record.ts`, `damages.ts`, `losses.ts`, `disruptions.ts`, `human_effects.ts` |
| **Hazard Catalog (HIP)**     | Supporting domain              | `models/hip.ts`, `models/hip_hazard_picker.ts`                                                           |
| **Geography**                | Supporting domain              | `models/division.ts`, `handlers/geography_upload.ts`                                                     |
| **Tenancy & Configuration**  | Supporting domain              | `services/` (partial), `utils/session.ts` (mixed)                                                        |
| **Identity & Access**        | Generic subdomain              | `models/user/`, `utils/auth.ts`, `frontend/user/roles.ts`                                                |
| **Analytics**                | Supporting domain (read model) | `models/analytics/`, `handlers/analytics/`                                                               |
| **Notification**             | Generic subdomain              | `services/emailValidationWorkflowService.ts`                                                             |
| **Translation/i18n**         | Generic subdomain              | `backend.server/translations.ts`, `services/translationDBUpdates/`                                       |

`frontend/user/roles.ts` and `frontend/approval.ts` are domain concepts sitting in the UI directory — they are imported by both frontend and backend code, but owned by neither. Both belong in a `domain/` layer. Tracked as P5-7.

---

### Current pattern: Transaction Script, not DDD

The architecture is a **Transaction Script** pattern — each operation is a sequential procedure: read → validate → write. Works well at small scale. Does not enforce domain boundaries, so business logic spreads naturally across files. This is what's happened.

`backend.server/services/` is a correct move toward a service layer. `handlers/form/form.ts` is a well-designed application service. The building blocks exist — they need reorganization, not rewriting.

**Pragmatic DDD target (not full DDD — 80% benefit, 20% effort):**

```
app/
├── domain/            ← Move here: entities, value objects, domain services, repository interfaces
│   ├── disaster/      (DisasterEvent, DisasterRecord aggregate, ApprovalWorkflowService)
│   ├── hazard-catalog/
│   ├── geography/
│   ├── identity/      (Role, Permission — move from frontend/user/roles.ts)
│   └── tenancy/
│
├── application/       ← Reorganize handlers/ into use cases (Commands + Queries)
├── infrastructure/    ← Reorganize models/ + drizzle/ (repository implementations)
└── presentation/      ← routes/ + API (unchanged in concept)
```

Key insight: the four most valuable DDD practices for this codebase are:

1. Bounded context directories (file moves, no logic changes) — P5-5
2. Pull domain concepts out of `frontend/` — P5-7
3. `ApprovalWorkflowService` to consolidate the workflow — P5-6
4. Repository interfaces to enable testing without DB — P5-8

---

### What works well

- `renderToPipeableStream` with bot/browser detection is correctly implemented
- Security headers applied consistently in `entry.server.tsx`: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`
- `formSave` wrapping every mutation in a transaction with audit logging is excellent — highest-reliability code in the codebase
- Auth HOF wrappers are clean and composable
- Inactivity warning with session refresh is thoughtful UX
- `BackendContext` mirrors `ViewContext` cleanly for the server side — same `lang`, `t()`, `url()` interface

---

