- [Code structure](code-structure.md)

### Request Handlers

`app/backend.server/handlers`

Handlers contain logic shared between multiple routes. If route files had repeating code, that logic was moved here.

Read about [routes](routes.md) first.

## BackendContext

Most handlers receive a `BackendContext` instance (from `~/backend.server/context`) rather than raw route args. `BackendContext` wraps the request, exposes the active language (`ctx.lang`), and provides the translator (`ctx.t({ code, msg })`). Construct one at the top of a loader or action:

```ts
import { BackendContext } from "~/backend.server/context";
const ctx = new BackendContext(args);
```

## Auth wrappers

Route loaders and actions should be wrapped with one of the auth helpers from `~/utils/auth` before calling any handler or model code:

- `authLoader` — Requires any logged-in user
- `authLoaderWithPerm(perm, fn)` — Requires a specific permission
- `authLoaderIsPublic` — Returns `true` if no user is logged in — used for inline auth checks, not as a route wrapper
- `authLoaderPublicOrWithPerm(perm, fn)` — Public read, permissioned write
- `authLoaderApi` — API key auth

Action equivalents follow the same naming (`authActionWithPerm`, etc.).

## Form handlers

Form-related handlers are in `app/backend.server/handlers/form/`. See [Form implementation details](form-implementation.md) for comprehensive documentation of these files:

- `form.ts` — HTML form save/update/delete actions; view and delete loaders
- `form_api.ts` — JSON API functions: `jsonCreate`, `jsonUpdate`, `jsonUpsert`, `jsonApiDocs`
- `form_csv.ts` — CSV import functions: `csvCreate`, `csvUpdate`, `csvUpsert`, `csvImportExample`
- `csv_import.ts` — Route-level CSV import action and example loader
- `csv_export.ts` — Route-level CSV export loader
- `form_utils.ts` — Shared utility helpers
