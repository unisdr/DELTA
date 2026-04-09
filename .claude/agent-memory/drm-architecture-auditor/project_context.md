---
name: Project Context
description: DELTA Resilience is a UNDRR multi-tenant national disaster tracking system in active dev; contributors limited to bug fixes only
type: project
---

DELTA Resilience is a government DRM system (Disaster and Hazardous Events, Losses and Damages Tracking and Analysis) built for UNDRR. It is multi-tenant (one country_accounts row per tenant), multi-language (JSONB name fields), and geospatial (PostGIS divisions table).

**Why:** System must support 99.99%+ uptime during national emergencies when 100x traffic spikes are expected. Currently v0.2.0. Active development phase — large refactors not accepted from outside contributors, but internal architecture work is ongoing.

**How to apply:** Recommendations must be framed as incremental, non-breaking changes. Avoid recommending Big Bang rewrites. The team values the Form-CSV-API abstraction (fieldsDef pattern) — improvements should work with or extend that pattern rather than replace it.

First full audit conducted: 2026-04-01.
