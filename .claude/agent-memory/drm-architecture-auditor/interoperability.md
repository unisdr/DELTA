---
name: Interoperability Assessment
description: Current inbound/outbound integration capabilities and critical gaps — identified 2026-04-02
type: project
---

## Current Inbound Capabilities (Working)

### REST API with API Key Auth
- Endpoints for all core entities under `app/routes/$lang+/api+/{entity}+/`
- Routes: list, add, update, upsert, fields, csv-import-example per entity
- Auth: X-Auth header, key scoped to countryAccountsId
- Idempotent upsert via apiImportId + countryAccountsId composite key
- No OpenAPI spec — no machine-readable contract exists
- API URL is language-prefixed (/$lang+/api+/) — non-standard for REST APIs

### CSV Import
- UI-driven (form upload), not headless API
- Available for disaster-record and disaster-event entities
- Routes: `app/routes/$lang+/disaster-record+/csv-import.tsx`, `disaster-event+/csv-import.tsx`

### SSO — Azure AD B2C Only
- Full OAuth 2.0 authorization code flow
- Handles: direct B2C, Google IDP federated through B2C, UN Staff (idp_access_token)
- No generic OIDC abstraction, no SAML support
- Route: `app/routes/sso+/azure-b2c.callback.tsx`
- Config: SSO_AZURE_B2C_* env vars

### MCP (Model Context Protocol)
- JSON-RPC 2.0, protocol version 2024-11-05
- Endpoint: `app/routes/$lang+/api+/mcp.ts`
- Tools, prompts, resources capabilities
- Authenticated via X-Auth API key
- Documented in `_docs/mcp.md`
- Allows AI agents to interact with full data model programmatically

### GeoJSON Endpoints (Read-Only)
- `geojson.$id.ts` — division boundary by ID
- `spatial-footprint-geojson.ts` — spatial footprint from disaster_records JSONB (NO TENANT CHECK — security issue)
- Stored as JSONB, not PostGIS geometry — no spatial indexing, no ST_ operations

## Current Outbound Capabilities (Working)
- CSV export: flat raw schema format (UUID FKs not resolved), disaster-record and disaster-event only
- Email via SMTP: transactional only
- No webhooks, no push, no event streaming, no scheduled feeds

## Critical Gaps

### 1. No OpenAPI 3.1 Specification
No machine-readable contract. Every integration partner must reverse-engineer from source code. Blocks contract testing in CI.

### 2. No Sendai Framework API Layer
No endpoint mapping DELTA data to Sendai Monitor indicator vocabulary (Targets A–G). This is the primary UNDRR reporting requirement. Missing endpoints: GET /api/sendai/targets, GET /api/sendai/events/{year}.

### 3. GLIDE Number Field Exists But No Registry Integration
disasterEventTable.glide field (line 57) exists but no inbound lookup from glidenumber.net and no outbound GLIDE assignment. Manual entry only.

### 4. No Webhooks / Event Push
No outbound HTTP push, no message queue publisher, no SSE. External systems must poll. Critical gap for national alert system integration and UN OCHA feeds.

### 5. No GIS Platform Integration
No WMS/WFS, no OGC API Features, no GeoPackage/Shapefile export. Spatial data in JSONB instead of PostGIS geometry prevents native spatial queries and ArcGIS/QGIS direct consumption.

### 6. No DesInventar Fully Headless Pipeline
Geography import still requires UI-based ZIP upload. Human effects import path underdocumented.

## Key Anti-Patterns for Future Integrations

### Route-Coupled API
Business logic (tenant injection) embedded in React Router route files. Any new protocol adapter must duplicate this.

### JSONB Spatial Footprint (Not PostGIS)
Migrating to PostGIS later requires data transformation of all existing spatial_footprint JSONB values across disaster_records, disaster_event, losses, damages, disruption tables.

### Language-Prefixed API URLs
All API routes under /$lang+/api+/ — breaks API consumers when tenant language changes. Fix: route /api/* at root, language as query parameter.

### CSV Exports Without FK Resolution
UUID foreign keys exported without resolving to labels. Unusable by ministry statisticians. Fix: add Sendai-export route with FK resolution.
