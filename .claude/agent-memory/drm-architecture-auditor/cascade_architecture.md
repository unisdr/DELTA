---
name: Cascade Architecture
description: UUID-linked cascading entity hierarchy, ON DELETE CASCADE audit, and orphan risks — identified 2026-04-02
type: project
---

## Entity Hierarchy

### Event vocabulary tree (table-per-type inheritance via shared UUID PK)
```
event
  ├── hazardous_event  (id FK → event.id, no onDelete)
  └── disaster_event   (id FK → event.id, no onDelete)
        └── disaster_record (disasterEventId FK → disaster_event.id, no onDelete)
```

`event_relationship` provides an arbitrary parent/child graph between any two `event` rows.
`disaster_event.disasterEventId` self-references `disaster_event.id` (parent event) — no cycle guard.

### Effects subtree hanging off disaster_record
```
disaster_record
  ├── losses            (recordId, no onDelete)
  ├── damages           (recordId, no onDelete)
  ├── disruption        (recordId, no onDelete)
  ├── noneco_losses     (disaster_record_id, no onDelete)
  ├── human_category_presence (recordId, no onDelete)
  └── human_dsg         (recordId, no onDelete)
        ├── deaths       (dsg_id, no onDelete)
        ├── injured      (dsg_id, no onDelete)
        ├── missing      (dsg_id, no onDelete)
        ├── affected     (dsg_id, no onDelete)
        └── displaced    (dsg_id, no onDelete)
```

## ON DELETE CASCADE — Only at Tenant Root
- `country_accounts → disaster_event`: CASCADE (disasterEventTable.ts line 36–39)
- `country_accounts → disaster_record`: CASCADE (disasterRecordsTable.ts line 31–35)
- All other FK relationships: NO ACTION (default RESTRICT)

## Application-Managed Cascading
`deleteAllDataByDisasterRecordId` in `disaster_record.ts` lines 443–513 manually deletes:
noneco_losses → damages → losses → disruption → sectorDisasterRecordsRelation → (calls deleteAllDataHumanEffects) → disaster_record

CRITICAL BUG: The existence check on lines 449–458 is a no-op (query builder not awaited, always truthy). Tenant ownership of child deletions is not enforced on the child table queries.

## UUID Strategy
- All PKs use `gen_random_uuid()` (UUID v4) via `ourRandomUUID()` in `utils/drizzleUtil.ts` line 36–40.
- No UUIDv7 — random PKs cause B-tree index fragmentation at scale.
- `apiImportId` (text, nullable) + `countryAccountsId` composite unique constraint on disaster_record, disaster_event, hazardous_event enables idempotent external imports.

## Orphan Risks
- human_dsg and all 5 leaf tables have no cascade — orphaned if deleteAllDataHumanEffects is skipped or throws.
- losses/damages/disruption have no tenant stamp — direct queries without joining disaster_record will return cross-tenant data.
- disaster_event self-reference could form cycles — no guard at DB or application level.
