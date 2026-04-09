---
name: Scalability Bottlenecks
description: Load-related risks and single points of failure identified in 2026-04-01 audit
type: project
---

## 1. No DB Connection Pool Configuration
`db.server.ts` passes DATABASE_URL string directly to drizzle without pool config. `pg` Pool defaults: max=10 connections. Under 100x load (national emergency) this pool will exhaust in milliseconds, causing cascading request failures.
- File: `app/db.server.ts` line 20

## 2. DB Write on Every Authenticated Request
`getUserFromSession()` issues an UPDATE to the `session` table on every request to refresh `lastActiveAt`. Under 100x load this is a serialized write bottleneck against a single table.
- File: `app/utils/session.ts` lines 196-199

## 3. No Caching Layer
No Redis or in-memory cache exists. Reference data (HIPs, sectors, countries, divisions) is re-queried from PostgreSQL on every request. Under surge conditions, PostgreSQL becomes the sole scaling target with no cache shielding.

## 4. Single-Node Docker Deployment
`docker-compose.yml` runs one app container with `restart: always` and one DB container. No load balancer, no horizontal scaling, no health checks, no orchestration (Kubernetes/ECS). A single pod failure = complete outage.

## 5. File Uploads Fully In-Memory
Geography ZIP upload (50MB limit) and CSV imports (10MB limit) are parsed entirely in memory during the HTTP request. Under concurrent uploads this creates unbounded heap pressure. No streaming or background queue.
- File: `app/backend.server/handlers/geography_upload.ts` lines 11-23

## 6. Synchronous Cost Recalculation on Every Record Save
`updateTotalsUsingDisasterRecordId` is called synchronously in `disasterRecordsUpdate` within the write transaction, executing 4 additional aggregate queries per record save. This increases write latency proportionally with event size.
- File: `app/backend.server/models/disaster_record.ts` line 285

## 7. No Read Replica Support
All queries (read and write) go to the same `dr` instance. No read replica routing, no CQRS separation. Analytical queries (geographicImpact, mostDamagingEvents, etc.) compete with write operations on the same PostgreSQL instance.

## 8. Dockerfile Sets NODE_ENV=development in Production Image
`Dockerfile.app` sets `ENV NODE_ENV=development` and runs `yarn start` (the production serve command) with development environment. This disables React production optimizations, enables verbose error stacks in responses, and may affect cookie security (`secure: process.env.NODE_ENV === "production"` in session.ts becomes false).
- File: `Dockerfile.app` line ENV NODE_ENV=development
