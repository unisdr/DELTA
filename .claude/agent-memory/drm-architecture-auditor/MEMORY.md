# DRM Architecture Auditor — Memory Index

- [User Profile](user_profile.md) — Lead developer on DELTA Resilience, a UNDRR DRM system; TypeScript/Node.js/Drizzle/React Router v7 expertise
- [Project Context](project_context.md) — DELTA is a multi-tenant national disaster tracking system; active dev phase, no large refactors accepted from contributors
- [Architecture Snapshot](architecture_snapshot.md) — Stack, dominant patterns, multi-tenancy model, DB layer, auth, and test structure as of 2026-04-01 audit
- [Recurring Anti-Patterns](recurring_antipatterns.md) — Issues that appear repeatedly across the codebase (session query fan-out, N+1 cost calculator, string-encoded metadata, console.log instrumentation)
- [Security Findings](security_findings.md) — API key metadata-in-name hack, no rate limiting, missing CSP for prod, superadmin mock session, no RLS in DB
- [Scalability Bottlenecks](scalability_bottlenecks.md) — No connection pool config, session DB write on every request, no caching layer, file uploads fully in-memory, single-node deployment
- [Architectural Decisions](architectural_decisions.md) — Strategic decisions on topology (Modular Monolith), CQRS (lightweight, read replica), DB (PostgreSQL stays, add Redis), event sourcing (rejected), BFF (deferred), and anti-patterns to avoid
- [Cascade Architecture](cascade_architecture.md) — UUID-linked entity hierarchy, ON DELETE CASCADE audit, orphan risks, and UUID v4 index fragmentation risk (2026-04-02)
- [Interoperability Assessment](interoperability.md) — Current inbound/outbound integration surfaces, critical gaps (Sendai, webhooks, PostGIS, OpenAPI), and anti-patterns blocking future integrations (2026-04-02)
