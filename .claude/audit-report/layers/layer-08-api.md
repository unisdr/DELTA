## Layer 8 — API Layer (`app/routes/$lang+/api+/`)

### Inventory

107 files across 22 API groups. Directory listing confirmed before reading any file.

**Domain CRUD groups:** asset, damage, disaster-event, disaster-record, disruption, hazardous-event, losses, nonecolosses, sector-disaster-record-relation, organization (partial)
**Reference data:** categories, sector, hips (cluster/hazard/type)
**Geo/spatial:** division (upload, list, delete_all), geojson.$id, spatial-footprint-geojson
**Operational:** client-log, qrcode, subsectors
**AI integration:** mcp
**Scaffolding (tracked P0-0):** dev-example1

---

### Architectural role — three distinct consumer types

The API layer exists for reasons the SSR loader/action pattern cannot serve:

1. **External systems (API key auth)** — The core domain CRUD routes (add, update, upsert, list, csv-import-example) accept `X-Auth` API key headers. Designed for national agencies and field systems to bulk-import disaster data without the browser UI. This is the primary purpose and aligns with the Form-CSV-API pattern.

2. **Internal frontend via `useFetcher()` / direct `fetch()`** — Some routes are called by the SSR app itself for interactions that cannot go through the standard loader model:
   - `subsectors.tsx` — called from `DisasterRecordsFilter.tsx:99` via `fetcher.load(ctx.url("/api/subsectors?sectorId=..."))` — dynamic sector → subsector dependent dropdown
   - `spatial-footprint-geojson.ts` — called from `SpatialFootprintsMapViewer.tsx:337` via `fetch("/api/spatial-footprint-geojson?...")` — Leaflet map component making direct HTTP requests
   - `geojson.$id.ts` — called from `spatialFootprintFormView.tsx:323` — map rendering via URL

3. **AI/LLM integration** — `mcp.ts` implements the Model Context Protocol (JSON-RPC 2.0 over HTTP + SSE). Authenticated with API keys on the POST path.

---

### Standard route pattern (what works correctly)

Most domain routes follow a consistent two-function pattern:

- `loader` — `authLoaderApi(...)` returning `"Use POST"` — guards accidental browser GET
- `action` — calls `await apiAuth(request)`, extracts and checks `countryAccountsId`, then delegates to `jsonCreate` / `jsonUpsert` / `jsonUpdate` with `fieldsDef`

Example: `disaster-event+/add.ts`, `disaster-event+/upsert.ts`, `disaster-record+/delete.$id.ts` (also validates UUID, checks record belongs to tenant, handles FK constraint error explicitly).

---

### Gap 1: Four dead cost endpoints — no auth, no tenant scope, no callers

`disaster-events.$disaster_event_id+/recovery-cost.ts`, `rehabilitation-cost.tsx`, `repair-cost.tsx`, `replacement-cost.tsx`

All four are bare `async function loader` with no HOF wrapper and no `apiAuth()` call. Grep for the URL patterns (`recovery-cost`, `repair-cost`, `replacement-cost`, `rehabilitation-cost`) confirms **zero callers anywhere in the codebase**. The cost calculations happen server-side via direct model imports (`disaster-events-cost-calculator.ts` imported by `damages.ts`, `disaster_record.ts`, etc.). These four files are dead code that also happens to have no auth and no tenant scope. Fix: delete them.

**Plan item:** P0-16

---

### Gap 2: Cross-tenant spatial data leaks

**`spatial-footprint-geojson.ts`** — The raw SQL query is:

```sql
SELECT value -> 'geojson' AS geojson
FROM disaster_records,
     jsonb_array_elements(spatial_footprint) AS value
WHERE disaster_records.id = ${record_id}
  AND value -> 'geojson' -> 'properties' ->> 'division_id' = ${division_id}
```

No `country_accounts_id` filter. A logged-in user who knows another tenant's `record_id` can retrieve their spatial footprint data. Uses `authLoaderApiDocs` which has the Layer 7 tenant bypass (P1-22), compounding the issue.

**`geojson.$id.ts`** — `divisionTable.findFirst({ where: eq(divisionTable.id, id) })` with no `countryAccountsId` filter. Divisions are per-tenant (uploaded via `division+/upload.ts` scoped to `countryAccountsId`). Uses `authLoaderPublicOrWithPerm` — accessible without auth in public mode.

Root cause for both: auth HOF wrappers validate the caller but do not scope the query to their tenant.

**Plan items:** P1-29, P1-30

---

### Gap 3: `subsectors.tsx` — no auth wrapper

Plain `async function loader(args)` — no HOF, no session check. Called from `DisasterRecordsFilter.tsx` via `useFetcher()` which sends the session cookie (same-origin), so the caller is in practice authenticated — but the route enforces nothing. If sectors are ever customized per tenant this leaks reference data. Defense in depth: should use `authLoaderApi`.

**Plan item:** P1-31

---

### Gap 4: `organization+/` — incomplete API module

Only `_index.tsx` (docs), `add.ts`, `fields.ts`. No `list`, `update`, `upsert`. External systems can create organizations via API but cannot query or update them. Breaks the Form-CSV-API contract that is central to the architecture — every other domain resource has the full set.

**Plan item:** P1-32

---

### Gap 5: `mcp.ts` — GET/SSE path unprotected + protocol issue

The `loader` (GET) handles SSE stream setup with no authentication — any caller can establish an SSE connection. Only the `action` (POST) calls `apiAuth`. An unauthenticated SSE connection is low-risk on its own (it only receives the endpoint event pointing back to the same URL) but is inconsistent with the security model.

MCP protocol compliance: there is no handler for `notifications/initialized`. The MCP spec requires servers to silently ignore notification methods (requests without an `id` field). The current `default` branch returns `-32601 Method not found` which breaks MCP client initialization — clients send `notifications/initialized` after the `initialize` handshake and do not expect an error response.

Also: `req: any` for the entire JSON-RPC body — no TypeScript typing for the request structure.

**Plan item:** P1-33

---

### Gap 6: No input validation on API write endpoints

All `add.ts` and `upsert.ts` routes accept raw JSON arrays cast to schema types (e.g., `let data: SelectDisasterEvent[] = await request.json()`) with no Zod/yup validation. Combined with P0-14 (`sanitizeInput` does not provide meaningful sanitization), external inputs reach the model layer unvalidated beyond TypeScript casting (which is erased at runtime). A malformed or deliberately crafted payload causes obscure DB errors rather than a clear 422 validation response.

**Plan item:** P2-7

---

### What is NOT a gap in this layer

- `client-log.ts` `Access-Control-Allow-Origin: "*"` — intentional for a browser error logging endpoint that must accept errors from any page origin
- `dev-example1+/` API routes — tracked as P0-0 (delete scaffolding routes)
- `mcp.ts` console.logs — covered by blanket P0-3 console audit
- `division+/delete_all.ts` — properly auth'd and tenant-scoped
- `disaster-record+/delete.$id.ts` — well-implemented: validates UUID, checks record ownership by tenant, handles FK constraint explicitly

---

### What works well

- Consistent `authLoaderApi` + `apiAuth(request)` + `countryAccountsId` check pattern across all core domain CRUD routes
- `upsert.ts` pattern correctly injects `countryAccountsId` into every record before delegating to `jsonUpsert` — external callers cannot override the tenant
- MCP JSON-RPC 2.0 structure is correct: all methods handled, error codes follow the spec, `initialize` returns proper capabilities
- `disaster-record+/delete.$id.ts` is the most defensively implemented route in the layer

---

