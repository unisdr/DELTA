export const DOCS = `
 DTS Data Model - Quick Reference
 ================================

 ENTITY RELATIONSHIPS
 --------------------
 event (base table with name, description)
   → hazardous-event (physical hazard, extends event)
     → disaster-event (can link to hazardous-event via hazardousEventId)
       → disaster-record (links to disaster-event via disasterEventId)
         → damages (recordId, sectorId, assetId - infrastructure damage)
         → losses (recordId, sectorId - economic losses)
         → disruption (recordId, sectorId - service disruptions)
         → nonecolosses (recordId - non-economic losses)
         → human-dsg (recordId - disaggregation for human effects)
           → displaced (dsgId - displaced persons)
           → missing (dsgId - missing persons)

 sector (hierarchical via parentId)
   → sector-disaster-record-relation (links sectors to disaster records)
   ← asset (asset.sectorIds contains comma-separated sector IDs)

 HAZARD CLASSIFICATION (required on hazardous-event, optional on disaster-record/event)
   hip-type → hip-cluster → hip-hazard
   Example: Geological → Ground Failure → Landslide

 READ-ONLY REFERENCE DATA
 ------------------------
 hip-type: Hazard types (Geological, Meteorological, etc.)
 hip-cluster: Hazard clusters (Ground Failure, Water-related, etc.)
 hip-hazard: Specific hazards (Landslide, Flood, Earthquake, etc.)
 sector: Economic sectors (Agriculture, Education, Health, etc.)
 categories: Category hierarchies for human effects

 WORKFLOW
 --------
 1. Create hazardous-event (optional): hazardous-event_add
    Required: hipHazardId, hipClusterId, hipTypeId

 2. Create disaster-event: disaster-event_add
    Optional: hazardousEventId, hipHazardId, hipClusterId, hipTypeId

 3. Create disaster-record: disaster-record_add
    Required: primaryDataSource, originatorRecorderInst, validatedBy
    Optional: disasterEventId

 4. Link sector to record: sector-disaster-record-relation_add(sectorId, disasterRecordId)
    Required before adding damages/losses/disruptions for that sector

 5. Read human effects docs first. Then add human effects: human-effects_save(recordId, table, data)
    Tables: Deaths, Injured, Missing, Affected, Displaced

 6. Add damages: damage_add(recordId, sectorId, assetId)
    Note: Use asset_list to find built-in assets first; create custom asset only if no built-in matches

 7. Add losses: losses_add(recordId, sectorId)

 8. Add disruptions: disruption_add(recordId, sectorId)

 9. Add non-economic losses: nonecolosses_add(recordId)

 KEY IDs
 -------
 recordId: disaster record ID (from disaster-record_list)
 sectorId: sector ID (from sector_list)
 assetId: asset ID (from asset_list), must belong to sector
 disasterEventId: disaster event ID (from disaster-event_list)
 hazardousEventId: hazardous event ID (from hazardous-event_list)
 hipHazardId/hipClusterId/hipTypeId: hazard classification (from hip-hazard_list, etc.)

 APPROVAL STATUS
 ---------------
 draft → waiting-for-validation → needs-revision → validated → published
 `.trim();

export const HUMAN_EFFECTS_DOCS = `
 Human Effects API - Quick Reference
 ====================================

 IMPORTANT: Column structure varies per disaster record!
 ALWAYS call human-effects_fields first to get the correct columns.

 Available Tools:
 ----------------
 - human-effects_fields(recordId, table) - Get column definitions
 - human-effects_list(recordId, table) - List existing data
 - human-effects_save(data) - Save/update/delete records
 - human-effects_clear(recordId, table) - Clear all data for a table
 - human-effects_category-presence-save(data) - Set categories or total groups

 Workflow:
 ---------
 1. Call human-effects_fields(recordId, table) to get column definitions
 2. Extract jsName from each definition to build your columns array
 3. Call human-effects_save with the correct columns and data

 Save Request Structure:
 -----------------------
 {
   "recordId": "uuid",
   "table": "Deaths|Injured|Missing|Affected|Displaced",
   "columns": ["sex", "age", "disability", ..., "custom1", "deaths"],
   "data": {
     "newRows": {
       "_temp1": [null, null, null, ..., null, TOTAL],  // Total row first!
       "_temp2": ["m", "0-14", "none", ..., null, 5],    // Disaggregations
       "_temp3": ["f", "65+", "none", ..., null, 3]
     },
     "updates": {
       "existing-uuid": ["m", "15-64", "none", ..., null, 2]
     },
     "deletes": ["uuid-to-delete"]
   }
 }

 Category Presence Save:
 -----------------------
 Enable/disable categories for a specific table.
 The table parameter determines which metrics are valid:
 - Deaths table: only "deaths" metric
 - Injured table: only "injured" metric
 - Missing table: only "missing" metric
 - Affected table: "affectedDirect" and "affectedIndirect" metrics
 - Displaced table: only "displaced" metric

 Example (Deaths table):
 {
   "recordId": "uuid",
   "table": "Deaths",
   "data": {
     "deaths": true
   }
 }

 Example (Affected table):
 {
   "recordId": "uuid",
   "table": "Affected",
   "data": {
     "affectedDirect": true,
     "affectedIndirect": false
   }
 }

 Set auto-calculation group (via save endpoint):
 {
   "recordId": "uuid",
   "table": "Deaths",
   "columns": ["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "custom1", "deaths"],
   "data": {
     "totalGroupFlags": ["sex", "age"]
   }
 }

 Key Rules:
 ----------
 - First row must have null dimensions (total row)
 - Sum of disaggregations should equal total
 - Cannot have duplicate dimension combinations
 - Use existing UUIDs from list endpoint for updates
 - Columns array must match exactly what fields endpoint returns

 Common Dimension Values:
 ------------------------
 sex: "m" (male), "f" (female), "o" (other)
 age: "0-14", "15-64", "65+"
 disability: "none" or specific disability codes
 globalPovertyLine/nationalPovertyLine: "below", "above"
 `.trim();
