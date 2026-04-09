# Phase 5 — Module Boundaries, AI/MCP & Interoperability

> Module boundaries, AI/MCP evolution, and interoperability. Long-horizon items. Some are exploratory — scope may change as earlier phases land.
>
> **17 items** — check status in [`../INDEX.md`](../INDEX.md)

---

### P5-0 · PWA — Installable Layer (Quick Win)

| | |
|---|---|
| **Current** | No web app manifest, no service worker, no PWA meta tags. `Cache-Control: no-store` on all responses. |
| **Value** | Field workers can install DELTA to their home screen, run full-screen, get a native app feel. Zero architectural risk. |

**Scope of this item — installable only, not offline:**

1. Add `public/manifest.webmanifest` with app name, icons, theme colour, `display: standalone`
2. Add `<link rel="manifest">` and `<meta name="theme-color">` to `root.tsx`
3. Add app icons (192×192, 512×512) to `public/`
4. Ensure HTTPS is configured in production (`Dockerfile.app` / deployment)

**Explicitly out of scope here:** Service worker, offline data caching. That requires the three-tier architecture decision first (see P5-4).

**Measure:** Lighthouse PWA installability score passes. Browser shows "Add to Home Screen" prompt.

---

---

### P5-1 · Tighten Domain Module Boundaries

Each domain (disaster_record, hazardous_event, human_effects) should expose only a public interface via `index.ts`. Internal model functions should not be directly imported by routes.

```
app/backend.server/domains/
  disaster-record/
    index.ts        ← public interface only
    model.ts        ← internal
    queries.ts      ← internal
    handler.ts      ← internal
```

This is a prerequisite for any future service extraction.

---

---

### P5-2 · Evolve MCP Endpoint with Prompt Templates + Resources

Current `/en/api/mcp` exposes raw CRUD tools. Add:

```typescript
// _docs/api-specs/mcp-v2.yaml
// New: prompts (structured AI workflows)
prompts:
  - name: classify_from_news_article
  - name: detect_anomalies_in_quarter
  - name: find_geospatial_patterns

// New: resources (read-only reference data)
resources:
  - name: hazard_types_taxonomy
  - name: postgis_schema_documentation
  - name: sector_classifications
```

---

---

### P5-3 · AI Classification Worker (Event-Driven, Async)

Follows the pattern defined in the macro architecture assessment. AI workers operate **outside the monolith request cycle**, reading from and writing to PostgreSQL only.

```
app/workers/
  disaster-record-classifier.ts   ← calls Claude API, writes classification back
  anomaly-detector.ts             ← weekly batch, flags implausible values
```

Entry point via pg-boss queue. Invoked by `disaster_record.created` event. See `_docs/api-specs/ai-workflows.yaml` for contract.

---

---

### P5-4 · Architecture Decision — Three-Tier Separation & Full Offline PWA

> **This is a strategic decision item, not an implementation item.** Document the decision when made and update the plan accordingly.

**Trigger conditions — revisit this decision when any of the following are true:**
- Field worker mobile use is confirmed as a primary use case (not just desktop)
- Offline data entry (not just offline viewing) is a hard requirement
- The team wants to build a native mobile app alongside the web app

**What the decision involves:**

| Option | Description | Effort |
|---|---|---|
| A — Keep SSR monolith + PWA installable | Current path. Good enough if offline = "graceful degradation, queue submissions". | Low |
| B — Extract REST API + React SPA frontend | Separate Node/Express API server + standalone React app. Full offline capability possible via service worker + IndexedDB sync. | High |
| C — React Router SSR + Islands architecture | Keep SSR for initial load/SEO, hydrate specific form islands client-side for offline capability. Middle path. | Medium |

**Current recommendation: Option A** until mobile/offline is confirmed as a hard requirement. The installable PWA (P5-0) delivers meaningful value immediately.

**If Option B is chosen:** The Strangler Fig approach applies — extract API endpoints one domain at a time, starting with disaster records (highest volume). Do not attempt a big-bang rewrite.

---

---

### P5-5 · Bounded Context Directory Restructure

| | |
|---|---|
| **Issue** | Architectural clarity / long-term maintainability |
| **Current** | All backend code lives flat under `app/backend.server/`. Bounded contexts (Disaster Data, Hazard Catalog, Geography, Identity, Tenancy, Analytics, Notification, Translation) are logically visible but structurally invisible. Business logic from different domains is mixed in the same directories. |

**Target structure (file moves only — no logic changes):**
```
app/
├── domain/                    ← NEW
│   ├── disaster/              (entities, value objects, domain services, repository interfaces)
│   ├── hazard-catalog/
│   ├── geography/
│   ├── identity/              (Role, Permission — moved from frontend/user/roles.ts)
│   └── tenancy/
│
├── application/               ← RENAME from backend.server/handlers/
│   ├── disaster/commands/
│   ├── disaster/queries/
│   └── ...
│
├── infrastructure/            ← RENAME from backend.server/models/ + drizzle/
│   ├── db/repositories/
│   └── db/schema/
│
└── presentation/              ← routes/ + API (unchanged)
```

**Approach:** Strangler Fig. Migrate one bounded context at a time, starting with Identity (smallest, most self-contained). Run `yarn tsc` after each move to verify no broken imports.

**Measure:** `app/backend.server/` directory no longer exists. All files live under `domain/`, `application/`, or `infrastructure/`. Zero circular imports between layers (enforced via ESLint `import/no-restricted-paths`).

---

---

### P5-6 · Extract `ApprovalWorkflowService` — Consolidate Scattered Domain Logic

| | |
|---|---|
| **Issue** | Domain integrity / maintainability |
| **Current** | The approval lifecycle (`draft → waiting-for-validation → needs-revision → validated → published`) is implemented in four separate files across four layers: `frontend/approval.ts` (status enum), `handlers/form/form.ts:adjustApprovalStatsBasedOnUserRole` (business rule), `models/event.ts:processValidationAssignmentWorkflow` (workflow orchestration), `utils/auth.ts` + `frontend/user/roles.ts` (permission enforcement). |

**Why this matters:** When approval rules change (e.g., new status, role permission change, new notification side-effect), all four files must be found and updated. No single file answers "what are the valid transitions and who can trigger them?"

**Target:** A single `app/domain/disaster/ApprovalWorkflowService.ts`:

```ts
export class ApprovalWorkflowService {
    // Answers: can this role trigger this transition?
    canTransition(role: RoleId, from: ApprovalStatus, to: ApprovalStatus): boolean

    // Executes: validates transition, updates status, assigns validators, sends emails
    async submitForValidation(ctx, tx, entityId, validatorIds, submittedByUserId): Promise<void>
    async markNeedsRevision(ctx, tx, entityId, reviewerId): Promise<void>
    async validate(ctx, tx, entityId, validatorId): Promise<void>
    async publish(ctx, tx, entityId, publisherId): Promise<void>
}
```

**TDD steps:**
1. `test(red):` Write unit tests for `canTransition` covering all role × transition combinations. Test `submitForValidation` with a fake repository — no DB needed.
2. `feat:` Implement `ApprovalWorkflowService` with all transitions and side-effects.
3. `refactor:` Replace `adjustApprovalStatsBasedOnUserRole` in `form.ts` and `processValidationAssignmentWorkflow` in `event.ts` with calls to the service.

**Measure:** `adjustApprovalStatsBasedOnUserRole` and `processValidationAssignmentWorkflow` are deleted. All approval transition logic passes through `ApprovalWorkflowService`. Unit test coverage ≥ 95%.

---

---

### P5-7 · Move Domain Concepts Out of `frontend/`

| | |
|---|---|
| **Issue** | Structural / boundary violation |
| **Files** | `app/frontend/user/roles.ts`, `app/frontend/approval.ts` |
| **Current** | `roles.ts` defines `RoleId`, `PermissionId`, the full role-permission matrix, and `roleHasPermission()`. `approval.ts` defines `approvalStatusIds` and the status field definition. Both are domain concepts imported by server-side code (`utils/auth.ts`, `models/event.ts`, `services/emailValidationWorkflowService.ts`) and frontend components. They live in `frontend/` only by historical accident. |

**Fix:**
- Move `frontend/user/roles.ts` → `domain/identity/roles.ts`
- Move `frontend/approval.ts` → `domain/disaster/approvalStatus.ts`
- Update all import paths (mechanical find-and-replace)
- The UI-specific helpers (`validRoles(ctx)` with translated labels) can stay in `frontend/` as a thin wrapper that imports from `domain/`

**No logic changes.** This is a pure structural move.

**Measure:** `app/frontend/user/roles.ts` and `app/frontend/approval.ts` deleted. No server-side file imports from `~/frontend/user/roles` or `~/frontend/approval`. `yarn tsc` passes.

---

---

### P5-8 · Introduce Repository Interfaces for Core Domain Models

| | |
|---|---|
| **Issue** | Testability / clean architecture |
| **Current** | All domain models call `dr` (the Drizzle instance) directly. There are no interfaces between domain logic and data access. You cannot test `ApprovalWorkflowService`, validation logic, or any use case without a real (or seeded) PostgreSQL database. Integration tests require full DB setup even for pure business logic. |

**Target:** Define repository interfaces in `domain/` and implement them with Drizzle in `infrastructure/`:

```ts
// domain/disaster/repositories.ts
export interface IHazardousEventRepository {
    findById(ctx: BackendContext, id: string): Promise<HazardousEvent | null>
    save(tx: Tx, event: HazardousEvent): Promise<void>
    findByCountryAccount(ctx: BackendContext, filters: HazardousEventFilters): Promise<PaginatedResult<HazardousEvent>>
}

// infrastructure/db/repositories/DrizzleHazardousEventRepository.ts
export class DrizzleHazardousEventRepository implements IHazardousEventRepository {
    // Drizzle implementation
}
```

**Scope:** Start with the three core domain models: `HazardousEvent`, `DisasterEvent`, `DisasterRecord`. Other models can follow incrementally.

**Benefit:** Domain services and use cases receive the interface. Tests inject a `FakeHazardousEventRepository` (in-memory Map) — no DB needed. The Drizzle implementation is tested via integration tests only.

**TDD steps:**
1. `test(red):` Write a unit test for `ApprovalWorkflowService.submitForValidation` using a `FakeHazardousEventRepository`. Assert it fails (repository not yet abstract).
2. `feat:` Extract interface, create fake implementation, wire service to interface.
3. `test(green):` Unit test passes without any DB connection.

**Measure:** `ApprovalWorkflowService` unit tests run in < 100ms with zero DB connections. Integration tests cover the Drizzle repository implementations separately.

---

---

### P5-9 · Reconcile `backend.server/utils/` Partial Refactoring

| | |
|---|---|
| **Issue** | Structural / developer confusion |
| **Files** | `app/backend.server/utils/dateFilters.ts`, `geographicFilters.ts`, `hazardFilters.ts`, `disasterCalculations.ts` |
| **Current** | `backend.server/utils/` was created as a refactoring step to extract reusable query-building utilities. The work was never completed — the main handlers (`disaster_record.ts`, `disasterevent.ts`, `hazardevent.ts`) still contain the original inline query logic and were never updated to use these utilities. Now three versions of some logic coexist: original in handler, partial version in utils, target version in analytics models. `dateFilters.ts` is less accurate than the handlers it was meant to replace. `hazardFilters.ts` has a 12-parameter signature typed entirely as `any`. |

**Fix (in order):**
1. `fix:` P1-19 removes the dev/prod split from `geographicFilters.ts`. P1-18 fixes the full table scan.
2. `refactor:` After P3-1 (date column migration) deletes the CASE/regex from handlers, delete `dateFilters.ts` — it becomes redundant.
3. `refactor:` Rewrite `hazardFilters.ts` with a typed options object signature. Remove the decorative validation queries or make them a separate opt-in utility.
4. `refactor:` Once handlers have been refactored to delegate to models (P5-5), delete `backend.server/utils/` entirely — the query utilities should live in their respective model or domain service files.

**Measure:** `app/backend.server/utils/` directory does not exist. All query logic lives in `infrastructure/db/repositories/` (per P5-5 target structure) or in specific model files.

---

---

### P5-11 · Normalise `disaster_event` Repeated Column Groups → Child Tables

| | |
|---|---|
| **Issue** | Schema design — wide table antipattern, hardcoded maximum of 5 |
| **File** | `disasterEventTable.ts` |
| **Current** | `disaster_event` has 25+ columns encoding up to 5 entries each of: disaster declarations, early actions, rapid/preliminary assessments, post-disaster assessments, other assessments — as numbered column pairs (`description1`, `date1`…`description5`, `date5`). A 6th entry requires a schema migration. Every row with fewer than 5 entries carries empty nullable column groups. |

**Target model:**
```sql
CREATE TABLE disaster_event_declaration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES disaster_event(id) ON DELETE CASCADE,
  type_and_effect text,
  declared_at timestamp,
  sort_order integer
);

CREATE TABLE disaster_event_assessment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES disaster_event(id) ON DELETE CASCADE,
  category text NOT NULL, -- 'rapid', 'post_disaster', 'other'
  description text,
  assessed_at timestamp,
  sort_order integer
);

CREATE TABLE disaster_event_early_action (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES disaster_event(id) ON DELETE CASCADE,
  description text,
  action_at timestamp,
  sort_order integer
);
```

**Strangler Fig:** This is a multi-sprint migration — add new child tables, dual-write from application, backfill, cut over reads, drop old columns. Do not attempt in a single PR.

**Measure:** Zero numbered column groups in `disaster_event`. New entries beyond 5 work without a migration. `disaster_event` row count in `EXPLAIN ANALYZE` is proportional to events, not entries × 5.

---

---

### P5-12 · Designate `app/db/queries/` as Single Repository Tier — Block Direct Route Imports

| | |
|---|---|
| **Issue** | Architectural boundary — data access fragmentation |
| **Files** | `app/db/queries/` (33 repos), `app/backend.server/models/` (30 fat models), `app/routes/` (200+ routes) |
| **Current** | Four parallel data access paths exist with no enforced convention: fat models, thin repositories (`db/queries/`), handler-embedded Drizzle, and partial utilities. The `db/queries/` tier is imported directly by 47+ locations including `app/routes/` — bypassing the service/handler layer. |

**Target:** Designate `app/db/queries/` as the single repository tier. All data access must flow through a service, handler, or model — never directly from a route to a repository.

**Enforcement:**

Add to `eslint.config.js`:
```js
{
    files: ["app/routes/**/*"],
    rules: {
        "no-restricted-imports": ["error", {
            patterns: [{ group: ["*/db/queries/*"], message: "Routes must not import repositories directly. Use a service or handler." }]
        }]
    }
}
```

**Migration sequence (Strangler Fig):**

1. Add ESLint rule in warn mode — measure the current violation count
2. For each violating route: identify which service or handler should own the call, extract or add the method there
3. Switch ESLint rule to error mode once violations reach zero
4. Incrementally absorb fat model DB methods into `db/queries/` repositories (or keep models as thin wrappers delegating to repositories)

**TDD steps:**
1. `test(red):` Add ESLint no-restricted-imports rule. Run `yarn lint` — all direct repository imports in `app/routes/` appear as violations.
2. `refactor:` Fix violations one route section at a time. Start with `settings+/` (smallest section).

**Measure:** `yarn lint` passes with zero `no-restricted-imports` violations in `app/routes/`. All data access from routes goes through a named service or handler.

---

---

### P5B-1 · Stabilise API URLs — Remove Language Prefix from Programmatic Endpoints

| | |
|---|---|
| **Issue** | INTEROP-004 |
| **Current** | All API routes live under `/$lang/api/...` — API consumers must know the language setting |

**Fix:** Add stable language-independent aliases under `/api/v1/...` that proxy to the `en` locale handlers. The `/$lang/api/` routes remain for backward compatibility.

**OpenAPI spec:** `_docs/api-specs/api-v1.yaml` — all stable endpoints documented under `/api/v1/` prefix.

---

---

### P5B-2 · Outbound Webhook Engine

| | |
|---|---|
| **Issue** | INTEROP-007 |
| **Current** | Zero outbound push capability — no webhooks, no event push to national alert systems |

A government DRM system must be able to **notify** partner systems when disaster events are created or reach a severity threshold.

**OpenAPI spec:** `_docs/api-specs/webhooks.yaml` (AsyncAPI 3.0 format)

**Schema additions:**
```sql
CREATE TABLE webhook_subscriptions (
  id uuid PRIMARY KEY,
  country_accounts_id uuid NOT NULL REFERENCES country_accounts(id),
  event_type text NOT NULL,        -- 'disaster_event.created', 'disaster_record.published'
  target_url text NOT NULL,
  secret text NOT NULL,            -- HMAC signing secret (stored hashed)
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**Implementation:** After any `disaster_event.created` or `disaster_record.published` write, enqueue a webhook delivery job (pg-boss). Worker sends signed POST to subscriber URLs with retry + dead-letter handling.

---

---

### P5B-3 · Sendai Framework Data Export

| | |
|---|---|
| **Issue** | INTEROP-008 |
| **Current** | CSV exports use internal UUID keys — unusable by UN reporting tools or ministry statisticians |

**Fix:** Add a Sendai-aligned export endpoint:
- Replace UUID foreign keys with human-readable codes in CSV output
- Align field names to Sendai Framework terminology
- Add `GET /api/v1/export/sendai?year=2025&format=csv|json` endpoint

**OpenAPI spec:** `_docs/api-specs/sendai-export.yaml`

---

---

### P5B-4 · Generic OIDC SSO (Replace Azure B2C Hardcode)

| | |
|---|---|
| **Issue** | INTEROP-009 |
| **File** | `app/routes/sso+/azure-b2c.callback.tsx` — SSO hardcoded to Azure B2C |
| **Current** | Multi-country deployments using Okta, Keycloak, or national identity providers are blocked |

**Fix:** Abstract the SSO callback behind an `OIDCProvider` interface. Azure B2C becomes one implementation. New providers (Keycloak, Google, national eID systems) can be added via configuration.

**New env vars:** `OIDC_PROVIDER=azure_b2c|keycloak|generic`, `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`

---

---

### P5B-5 · PostGIS Native Geometry (Replace JSONB Spatial Footprint)

| | |
|---|---|
| **Issue** | INTEROP-005 |
| **Current** | Spatial footprints stored as JSONB — blocks native PostGIS spatial indexing and GIS platform integration |

**Fix:** Migrate spatial footprint columns to `geometry(MultiPolygon, 4326)` PostGIS native type. This enables:
- Native `ST_Contains`, `ST_Intersects` spatial queries without JSON parsing
- Direct WMS/WFS feeds to ArcGIS / QGIS
- GeoServer integration for national GIS platforms

**Migration:** Add new `geometry` column alongside JSONB. Backfill via `ST_GeomFromGeoJSON(jsonb_column)`. Update all spatial queries. Drop JSONB column after validation.

---

---

