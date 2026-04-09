## Layer 1 — Routing & URL Structure

### Framework: React Router v7 + remix-flat-routes

**Config file:** `app/routes.ts`

```typescript
export default remixRoutesOptionAdapter((defineRoutes) =>
	flatRoutes("routes", defineRoutes),
) satisfies RouteConfig;
```

React Router v7 uses file-based routing but requires explicit opt-in to a routing strategy. Here, `remix-flat-routes` is used as an adapter via `@react-router/remix-routes-option-adapter` — a compatibility bridge from the Remix-to-React-Router migration path.

**Limitation:** `remix-flat-routes` is an external package not maintained by the React Router team. React Router v7 ships its own native file-based routing convention which the project has not yet migrated to. Low-priority maintenance debt, but the adapter may lag behind React Router releases.

---

### Route file statistics

| Category                          | Count |
| --------------------------------- | ----- |
| Total route files                 | 273   |
| API routes (`api+/`)              | 125   |
| Page index routes (`_index.tsx`)  | 44    |
| Layout routes (`_layout.tsx`)     | 5     |
| Example/dev routes (`examples+/`) | 30    |
| SSO routes                        | 3     |

273 route files is a large surface area. 125 of them are API endpoints — nearly half the codebase by file count. The 30 example routes exist in production code (not isolated to a dev-only bundle).

---

### URL structure

All user-facing routes follow this pattern:

```
/:lang/<section>/<action>
```

**Valid languages** (`app/utils/lang.backend.ts:4`): `ar`, `zh`, `en`, `fr`, `ru`, `es`
**Default language:** `en`

**Entry flow:**

1. `/` → `routes/_index.tsx` — public landing page (no lang prefix)
2. `/:lang` → `routes/$lang+/_index.tsx` — redirects to `/:lang/hazardous-event`
3. Unknown lang → 404 (`getLanguage()` throws `Response("Not Found", 404)`)
4. `/*` (catch-all) → `routes/$.tsx` — 404 page

**Route groups by section:**

| Prefix                     | Purpose                                                                     | Auth                          |
| -------------------------- | --------------------------------------------------------------------------- | ----------------------------- |
| `$lang+/admin+/`           | Super admin — country account management                                    | Super admin session           |
| `$lang+/user+/`            | Auth flows — login, invite, password reset, profile                         | Mixed (some public)           |
| `$lang+/hazardous-event+/` | Hazardous event CRUD + CSV + files                                          | User session                  |
| `$lang+/disaster-event+/`  | Disaster event CRUD + CSV + files                                           | User session                  |
| `$lang+/disaster-record+/` | Disaster record + sub-records (damages, losses, disruptions, human effects) | User session                  |
| `$lang+/analytics+/`       | Dashboards and reports                                                      | User session                  |
| `$lang+/settings+/`        | Tenant settings (geography, sectors, access, assets, org)                   | Admin role                    |
| `$lang+/api+/`             | JSON REST API                                                               | API key or session            |
| `$lang+/about+/`           | Static informational pages                                                  | Public                        |
| `$lang+/faq+/`             | FAQ                                                                         | Public                        |
| `$lang+/examples+/`        | Developer examples and component demos                                      | ⚠️ No auth guard              |
| `sso+/`                    | Azure B2C callbacks                                                         | Public (externally initiated) |

---

### Naming conventions (remix-flat-routes)

| Convention           | Meaning                                  | Example                                                  |
| -------------------- | ---------------------------------------- | -------------------------------------------------------- |
| `+` suffix on folder | Route group — folder becomes URL segment | `hazardous-event+/` → `/hazardous-event/...`             |
| `_index.tsx`         | Index route for a group                  | `hazardous-event+/_index.tsx` → `/hazardous-event`       |
| `_layout.tsx`        | Layout wrapping all siblings             | `country-accounts+/_layout.tsx`                          |
| `$param`             | Dynamic segment                          | `edit.$id.tsx` → `/edit/:id`                             |
| `dot.notation.tsx`   | Nested URL, flat layout                  | `disaster-events.sector.tsx` → `/disaster-events/sector` |
| `$.tsx`              | Catch-all splat route                    | Matches any unmatched path                               |

The dot-notation is used deliberately for analytics routes — separate render targets that share the URL namespace without nesting in a shared layout.

---

### Layout routes — sparse use of nested UI

Only 5 `_layout.tsx` files exist across 273 routes. Most routes are self-contained and manually pull in `MainContainer`. There is no shared layout enforcement — any route can render any way it wants. This is a contributing factor to the visual inconsistency between old and new UI (P1-6 in refactoring plan).

**Settings folder anomaly:** `settings/nav.tsx` and `settings/route.tsx` exist without the `+` suffix — they are shared components living inside `routes/`. Mixing component files into `routes/` is an anti-pattern; these belong in `app/frontend/` or `app/components/`.

---

### Issues and limitations found

**1. Example routes accessible in production**
`$lang+/examples+/` (30 routes) has no auth guard. `/en/examples/...` is accessible to anyone in production. Exposes internal patterns and test routes.

**2. `dev-example1` routes shipped to production**
Both `$lang+/api+/dev-example1+/` and `$lang+/examples+/dev-example1+/` are scaffolding templates in the live bundle. Should be removed or compile-time excluded.

**3. Hardcoded `/en/` on the landing page**
`routes/_index.tsx` has 5 hardcoded `/en/` links. The public landing page always directs users to English regardless of browser language settings.

**4. `$lang` prefix on API routes is unconventional**
All API endpoints are language-prefixed: `/en/api/hazardous-event/list`. External systems must include a language code. In some endpoints this affects translated content returned — but this is not clearly documented. Confusing for API consumers.

**5. No route-level lazy loading strategy**
With 273 routes, first-load bundle includes all route manifests. Compounded by the Vite dependency discovery issue (P1-5).

---

### Companion folder pattern (`settings/` vs `settings+/`)

Two `settings` folders exist side-by-side under `$lang+/`:

```
app/routes/$lang+/
    settings/          ← NO + sign — companion folder
        nav.tsx
        route.tsx
    settings+/         ← WITH + sign — route group
        access-mgmnt+/
        system.tsx
        geography+/
        ...
```

- **`settings+/`** — a route group. The folder name becomes a URL segment; every file inside is a real route (e.g. `/en/settings/system`, `/en/settings/geography`).
- **`settings/`** — a companion folder. No `+` means it does NOT generate URL segments. `route.tsx` inside it is the layout module for the `/settings` path itself. `nav.tsx` is a plain component co-located here. Neither is independently accessible as a URL.

This is valid `remix-flat-routes` convention, but mixing component files into `app/routes/` is an anti-pattern. `nav.tsx` belongs in `app/frontend/` or `app/components/`. Noted as a cleanup item.

---

### Missing `_index.tsx` — how it's handled

Not every route group has an `_index.tsx`. Two patterns in use:

1. **Programmatic redirect** — `settings/route.tsx` checks if the URL is exactly `/settings` and redirects to `/settings/system`. Explicit, but requires custom loader logic.
2. **Accept 404** — `admin+/` has no `_index.tsx`. Visiting `/en/admin` renders nothing useful. In practice nobody links there directly (menu links go to `/admin/country-accounts`). A silent gap.

The redirect approach is better, but it's implemented ad-hoc per section rather than as a convention.

---

### How navigation links are built — no central link registry

The app uses two mechanisms for navigation:

**1. `ctx.url()` + `navigate()` (used in `MainMenuBar.tsx` and most internal nav)**

```ts
// app/frontend/context.ts
url(path: string): string {
    return urlLang(this.lang, path);  // prepends "/${lang}"
}

// MainMenuBar.tsx
command: () => navigate(ctx.url("/disaster-event"))
// → "/en/disaster-event" when lang is "en"
```

**2. React Router `<Link>` (used for static links)**

```tsx
<Link to={urlLang(ctx.lang, "/user/login")}>Sign in</Link>
```

`MainMenuBar.tsx` (`app/components/MainMenuBar.tsx`) is the sole central navigation component. All top-level menu items and their URLs are hardcoded as plain strings inside it.

**Risk:** `ctx.url()` accepts any plain string. If a route is renamed (e.g., `disaster-event` → `disaster-incidents`), TypeScript will not catch broken links. Every `ctx.url("/disaster-event")` call across the codebase becomes a silent 404. There is no compile-time route type safety — this is a known limitation of file-based routing without a type-safe link generation layer.

---

### No top-level authenticated layout route

The most impactful missing layout is not per-section — it's at the top level. Every authenticated page independently:

- Calls its own `authLoader` / `authLoaderWithPerm` to verify the session
- Renders `<MainMenuBar>` by pulling it from a root layout or repeating it per route
- Assembles its own full-page chrome

There is no single `_layout.tsx` at the `$lang+/` level that enforces: _"all authenticated routes share the same shell."_ A root-level authenticated layout would:

1. Run auth check once, redirect to login on failure
2. Render `<MainMenuBar>` once
3. Inject page content via `<Outlet />`

This is the highest-value layout addition available — more impactful than adding per-section layouts. Tracked as P1-7.

---

### What works well

- Consistent CRUD pattern across all domain entities: `_index`, `$id`, `edit.$id`, `delete.$id`, `csv-import`, `csv-export` — predictable and navigable.
- Clean separation of admin vs user routes — different login flows, URL prefixes, session types.
- Catch-all `$.tsx` provides graceful 404s.
- SSO routes outside the lang prefix (`sso+/`) — correct, since Azure B2C callbacks are lang-agnostic.
- `$lang+/_index.tsx` as a protected entry point means unauthenticated users are always redirected to login.
- `ctx.url()` helper ensures all internal links are language-aware — no hardcoded `/en/` in components (except the landing page, which is a known issue).

---

