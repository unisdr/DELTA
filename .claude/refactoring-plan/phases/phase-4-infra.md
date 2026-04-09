# Phase 4 — Infrastructure & High Availability

> Infrastructure and high availability. Dependent on Phase 1 blockers (P1-40, P1-1). Requires DevOps coordination.
>
> **3 items** — check status in [`../INDEX.md`](../INDEX.md)

---

### P4-1 · Health Endpoint + Kubernetes Deployment

| | |
|---|---|
| **Issue** | ISSUE-012 |
| **Current** | Single Docker Compose node — no HA, no health check, no failover |

**Step A — Add health route** (zero risk, do immediately):
```typescript
// app/routes/$lang+/health.ts
export async function loader() {
  const dbOk = await testDbConnection();
  return json(
    { status: dbOk ? "ok" : "degraded", db: dbOk ? "connected" : "error", version: pkg.version },
    { status: dbOk ? 200 : 503 }
  );
}
```

**Step B — Kubernetes manifest** (`scripts/k8s/deployment.yaml`):
- `replicas: 2`
- `readinessProbe` on `GET /:lang/health`
- Resource limits: `memory: 512Mi`, `cpu: 500m`
- Horizontal Pod Autoscaler: scale at 70% CPU

**OpenAPI spec:** Add `GET /{lang}/health` to `_docs/api-specs/system.yaml`.

---

---

### P4-2 · Add Redis — Sessions + Rate Limiting + Job Queue

> Prerequisite for P4-3. Enables P2-1's rate limiter to work across replicas.

**Additions:**
1. `redis` service in `docker-compose.yml` and Kubernetes
2. Migrate session storage from PostgreSQL `sessionTable` to Redis TTL keys — eliminates the `lastActiveAt` write pattern entirely
3. Switch `express-rate-limit` store from in-memory to `rate-limit-redis`
4. Use Redis as pg-boss alternative for P3-3 geography import jobs if preferred

**New env var:** `REDIS_URL`

---

---

### P4-3 · Read Replica for Analytics

> Route the 17 analytics model files to a read replica, not the primary.

```typescript
// app/db.server.ts — add after initDB()
export let drReadonly: Dr;

export function initReadonlyDB() {
  if (!process.env.DATABASE_REPLICA_URL) return; // graceful degradation to primary
  drReadonly = drizzle(new Pool({ connectionString: process.env.DATABASE_REPLICA_URL }), { schema });
}
```

Update all `app/backend.server/models/analytics/**` to use `drReadonly ?? dr`.

**New env var:** `DATABASE_REPLICA_URL`

---

---

