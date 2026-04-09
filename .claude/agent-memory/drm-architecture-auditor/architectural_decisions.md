---
name: Architectural Decision Record
description: Strategic architecture decisions made as of 2026-04-01 — topology, CQRS, database, event sourcing, BFF, and anti-patterns to avoid
type: project
---

## Decision: Topology — Modular Monolith, not Microservices

Keep the current single-process deployment. Enforce hard module boundaries in code (no cross-domain internal imports). Analytics domain is the only future extraction candidate, and only if read replica + materialised views cannot satisfy load.

**Why:** Government multi-country deployment means one-container simplicity is a deployment requirement, not laziness. No distributed tracing, no service mesh, no saga transactions — the team cannot maintain that operational surface.

**Prerequisite for future extraction:** Module seams must be enforced with `index.ts` public interfaces per domain before any service split.

## Decision: Lightweight CQRS — Two DB Instances, No Separate Models

Add a `drRead` Drizzle instance pointing to a PostgreSQL read replica. All 17 analytics model files route to `drRead`. All writes stay on `dr` (primary). Organise code into `commands/` and `queries/` subdirectories per domain module — convention only, not infrastructure.

Add PostgreSQL materialised views for `geographicImpact` and `mostDamagingEvents` — the two heaviest analytics queries. Refresh on a 5-minute schedule.

**Why:** Genuine read/write asymmetry exists. Analytics queries (8-9 table joins, recursive CTEs) compete with write operations on the same primary. Read replica is a provisioning operation + two config lines.

## Decision: Database — PostgreSQL + PostGIS stays; Add Redis; No additional stores

PostgreSQL 16 + PostGIS covers all workloads: geospatial (PostGIS GIST indexes already defined), time-series losses (once dates migrated from text to date columns), full-text multi-language JSONB search (GIN indexes with tsvector generated columns).

Redis (or Valkey) is the only addition justified:
- Session storage (move from PostgreSQL session table to Redis — eliminates DB write per request)
- Reference data cache (HIPs, sectors, measure units — 5-minute TTL)
- Analytics query cache (tenant+filter keyed, 60-second TTL)
- Background job queue (BullMQ for ZIP import, CSV import, total recalculation)

**Reject:** TimescaleDB, InfluxDB, Elasticsearch, Typesense, MongoDB — no workload at DELTA's scale justifies the synchronisation pipeline cost.

## Decision: Event Sourcing — Reject; Extend Existing Audit Log

The `audit_logs` table (oldValues/newValues JSONB, action, userId, countryAccountsId, timestamp) meets the compliance requirement. Current state reconstruction is possible by replaying `recordId`-scoped audit log entries.

Full event sourcing would require projections layer, projection rebuilds on migration, and rewriting all Drizzle read queries.

**One exception:** If formal approval workflow states are added (Draft → Under Review → Validated → Published), implement as in-process domain events (Node.js EventEmitter or lightweight bus), not event sourcing. Handlers fire async side effects. This can be extracted to a message queue later.

## Decision: API Gateway / BFF — Logical separation within monolith, no split

One process serves SSR UI, REST API, and MCP. Do not split yet.

Immediate actions:
- Apply OpenAPI 3.1 spec as contract for all routes under `$lang+/api+/`
- Rate limiting middleware applied only to API routes (not SSR routes)
- API key auth consolidated into shared middleware, not per-route
- MCP endpoint already has clean service layer — maintain it

**Trigger for actual BFF split:** Different deployment cadence needed between API and UI, OR mobile clients with different payload requirements. Neither condition is true as of 2026-04-01.

## Decision: Priority Build Sequence

1. Redis session store + reference data cache (eliminates DB write bottleneck, enables clean horizontal scaling)
2. PostgreSQL read replica + drRead Drizzle instance (separates analytics read load from write primary)
3. DB connection pool configuration in db.server.ts (default 10 connections is dangerous at surge load)
4. BullMQ background jobs for ZIP import, CSV import, total recalculation (unblocks HTTP thread)
5. OpenAPI 3.1 spec for REST API surface (prerequisite for contract testing and partner integrations)
6. PostgreSQL Row-Level Security on disaster_records, disaster_event, losses, damages, division (converts app-enforced tenancy to DB-enforced tenancy)

## Anti-Patterns Explicitly Rejected

- Microservices before clean module seams exist
- Kafka/RabbitMQ as general integration layer (BullMQ on Redis covers actual async needs)
- GraphQL (N+1 in cost calculator is a SQL problem, not a resolver problem)
- Horizontal app scaling before session store is off PostgreSQL (causes 3x write amplification)
- Polyglot persistence (Elasticsearch + TimescaleDB + PostGIS) — too many synchronisation pipelines for a small team
- Eventual consistency on the write/transactional path
- Full CQRS with separate write/read models and projection engine
