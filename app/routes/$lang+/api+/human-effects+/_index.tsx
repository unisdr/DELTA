// API documentation index for human effects endpoints.
// See _docs/human-direct-effects.md for overview.
import { authLoaderWithPerm } from "~/utils/auth";

export const loader = authLoaderWithPerm("ViewApiDocs", async () => {
	let docs = `
Human effects API
=================

IMPORTANT: Field Structures Vary Per Country Instance
-----------------------------------------------------

Each disaster record can have different field structures based on:
- Custom dimension fields defined in the human effects custom disaggregations

ALWAYS fetch the actual field structure for your specific disaster record before saving data.

How to Get Field Definitions
-----------------------------

Use the list endpoint to retrieve the actual field definitions for your disaster record:

    curl -X GET "http://localhost:3000/api/human-effects/list?recordId={DISASTER_RECORD_UUID}&table=Deaths" \
      -H "X-Auth: {YOUR_API_KEY_SECRET}"

The response will contain a defs array with all field definitions. Extract the jsName from each definition to build your columns array.

Base Field Structure (Without Custom Fields)
--------------------------------------------

The following are the base fields that are always present, but additional custom fields may be added:

Deaths Table
  Base fields: [sex, age, disability, globalPovertyLine, nationalPovertyLine, deaths]

Injured Table
  Base fields: [sex, age, disability, globalPovertyLine, nationalPovertyLine, injured]

Missing Table
  Base fields: [sex, age, disability, globalPovertyLine, nationalPovertyLine, asOf, missing]
  Note: Missing table includes an asOf date field for tracking when people went missing.

Affected Table
  Base fields: [sex, age, disability, globalPovertyLine, nationalPovertyLine, direct, indirect]
  Note: Affected table has TWO metric fields: direct (Directly Affected) and indirect (Indirectly Affected).

Displaced Table
  Base fields: [sex, age, disability, globalPovertyLine, nationalPovertyLine, assisted, timing, duration, asOf, displaced]
  Note: Displaced table has additional dimension fields for displacement characteristics and an asOf date field.


Data Entry Pattern - Total First Structure
-------------------------------------------

IMPORTANT: All tables follow a specific data entry pattern where the total row must be entered first, followed by disaggregated data.

Universal Pattern
-----------------
{
  "newRows": {
    "_temp1": [null, null, null, ..., TOTAL_VALUE],     // TOTAL ROW (all dimensions null)
    "_temp2": [sex, age, disability, ..., COUNT_1], 
    "_temp3": [sex, age, disability, ..., COUNT_2], 
  }
}

Pattern Rules
-------------
1. Total row first: Always use null values for all dimension fields
2. Disaggregations follow: Specific demographic breakdowns

List Human effects Data
-----------------------
GET /api/human-effects/list?recordId={DISASTER_RECORD_UUID}&table=[TABLE]

Where [TABLE] can be one of: Deaths, Injured, Missing, Affected, Displaced

Example Request
--------------

    curl -X GET "http://localhost:3000/api/human-effects/list?recordId={DISASTER_RECORD_UUID}&table=Deaths" \
      -H "X-Auth: {YOUR_API_KEY_SECRET}"

Actual Response Structure
-------------------------

    {
      "tblId": "Deaths",
      "tbl": {"id": "Deaths", "label": "Deaths"},
      "recordId": "{DISASTER_RECORD_UUID}",
      "defs": [
        {
          "uiName": "Sex",
          "jsName": "sex", 
          "dbName": "sex",
          "uiColWidth": "medium",
          "format": "enum",
          "role": "dimension",
          "data": [
            {"key": "m", "label": "M-Male"},
            {"key": "f", "label": "F-Female"},
            {"key": "o", "label": "O-Other Non-binary"}
          ],
          "shared": true
        }
        // ... more field definitions
      ],
      "ids": ["uuid1", "uuid2", "uuid3"],
      "data": [
        [null, null, null, null, null, null, 8],
        ["f", "0-14", "physical_dwarfism", "below", "below", null, 2],
        ["f", "65+", "none", "above", "above", null, 1],
        ["m", "65+", "none", "below", "below", null, 2]
      ],
      "categoryPresence": {"deaths": true},
      "totalGroupFlags": null,
      "totals": {"deaths": 8}
    }

Response Fields Explained
-------------------------
- defs: Field definitions including UI names, data types, and available enum options
- ids: UUIDs for each record (same order as data array) 
- data: Actual records as arrays following the field order from defs. First row with null dimensions is the total.
- categoryPresence: Shows which categories are enabled for this disaster record
- totalGroupFlags: Array of dimension fields used for automatic total calculation (null if manually calculated)
- totals: Object containing the total values for each metric field in the table

Save Human effects Data
-----------------------
POST /api/human-effects/save?recordId={DISASTER_RECORD_UUID}

Step 1: Get Field Definitions
------------------------------

Before saving, always fetch the field definitions for your specific disaster record:

    curl -X GET "http://localhost:3000/api/human-effects/list?recordId={DISASTER_RECORD_UUID}&table=Deaths" \
      -H "X-Auth: {YOUR_API_KEY_SECRET}"

Extract the jsName values from the defs array to build your columns array. For example, if the response shows:

{
  "defs": [
    {"jsName": "sex", ...},
    {"jsName": "age", ...},
    {"jsName": "disability", ...},
    {"jsName": "globalPovertyLine", ...},
    {"jsName": "nationalPovertyLine", ...},
    {"jsName": "custom1", ...},
    {"jsName": "deaths", ...}
  ]
}

Your columns array should be: ["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "custom1", "deaths"]

Step 2: Save Data with Correct Columns
--------------------------------------

    curl -X POST "http://localhost:3000/api/human-effects/save?recordId={DISASTER_RECORD_UUID}" \
      -H "X-Auth: {YOUR_API_KEY_SECRET}" \
      -H "Content-Type: application/json" \
      -d '{
        "table": "Deaths",
        "columns": ["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "custom1", "deaths"],
        "data": {
          "newRows": {
            "_temp1": [null, null, null, null, null, null, 8],
            "_temp2": ["o", "0-14", null, null, null, null, 1],
            "_temp3": ["o", "15-64", null, null, null, null, 1],
            "_temp4": ["o", "65+", null, null, null, null, 1]
          },
          "updates": {
            "existing-uuid": ["f", "0-14", "none", "below", "below", null, 6]
          },
          "deletes": ["uuid-to-delete"]
        }
      }'

Success Response
----------------

    {
      "ok": true
    }

Validation Error Response
-------------------------

    {
      "ok": false,
      "errors": [
        {
          "code": "duplicate_dimension",
          "message": "Two or more rows have the same disaggregation values.",
          "rowId": "_temp1"
        }
      ]
    }

Important Notes for Save Endpoint
---------------------------------
- Follow total-first pattern: First row must have null dimensions and contain total value
- The columns array must exactly match the expected columns for the table type
- Column values must use valid enum values as shown in the list endpoint response
- Array values must match the exact order specified in columns
- Cannot save records with identical dimension combinations (duplicate prevention)
- Use existing record UUIDs from the ids array for updates
- The recordId must belong to the country instance associated with the API key

Clear Human effects Data
------------------------
POST /api/human-effects/clear?recordId={DISASTER_RECORD_UUID}&table=[TABLE]

Where [TABLE] can be one of: Deaths, Injured, Missing, Affected, Displaced

Example Request
--------------

    curl -X POST "http://localhost:3000/api/human-effects/clear?recordId={DISASTER_RECORD_UUID}&table=Deaths" \
      -H "X-Auth: {YOUR_API_KEY_SECRET}"

Example Response
---------------

    {
      "ok": true
    }

Effect: Removes ALL data from the specified table for the given disaster record.

Set Category Presence
---------------------
POST /api/human-effects/category-presence-save?recordId={DISASTER_RECORD_UUID}

The table parameter determines which metrics are valid:
- Deaths table: only "deaths" metric
- Injured table: only "injured" metric
- Missing table: only "missing" metric
- Affected table: "affectedDirect" and "affectedIndirect" metrics
- Displaced table: only "displaced" metric

Example Request (Deaths table)
--------------

    curl -X POST "http://localhost:3000/api/human-effects/category-presence-save?recordId={DISASTER_RECORD_UUID}" \
      -H "X-Auth: {YOUR_API_KEY_SECRET}" \
      -H "Content-Type: application/json" \
      -d '{
        "table": "Deaths",
        "data": {
          "deaths": true
        }
      }'

Example Request (Affected table)
--------------

    curl -X POST "http://localhost:3000/api/human-effects/category-presence-save?recordId={DISASTER_RECORD_UUID}" \
      -H "X-Auth: {YOUR_API_KEY_SECRET}" \
      -H "Content-Type: application/json" \
      -d '{
        "table": "Affected",
        "data": {
          "affectedDirect": true,
          "affectedIndirect": false
        }
      }'

Example Response
---------------

    {
      "ok": true
    }

Important Notes for Category Presence
-------------------------------------
- The table field must be specified
- The data object contains boolean flags for metrics specific to that table
- Only metrics defined for the specified table are allowed
- Invalid metric names will result in an error

Set the total to auto-calculated group
--------------------------------------

POST /api/human-effects/save?recordId={DISASTER_RECORD_UUID}

Use the save endpoint with totalGroupFlags in the data object to set which dimensions should be used for auto-calculating totals.

Example Request
--------------

    curl -X POST "http://localhost:3000/api/human-effects/save?recordId={DISASTER_RECORD_UUID}" \
      -H "X-Auth: {YOUR_API_KEY_SECRET}" \
      -H "Content-Type: application/json" \
      -d '{
        "table": "Deaths",
        "columns": ["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "custom1", "deaths"],
        "data": {
          "totalGroupFlags": ["sex", "age"]
        }
      }'

Example Response
---------------

    {
      "ok": true
    }

Error Responses
---------------

Validation Errors
-----------------
If the request format is invalid or contains duplicate dimension combinations:

    {
      "ok": false,
      "errors": [
        {
          "code": "duplicate_dimension",
          "message": "Two or more rows have the same disaggregation values.",
          "rowId": "_temp1"
        }
      ]
    }


Table-Specific Request Examples
--------------------------------

Deaths Table Example
-------------------
NOTE: This example shows BASE fields only. Your actual columns may include custom fields like "custom1". Always check the field definitions for your specific disaster record.

{
	"table": "Deaths",
	"columns": ["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "deaths"],
	"data": {
		"newRows": {
			"_temp1": [null, null, null, null, null, 8],
			"_temp2": ["f", "0-14", "none", "below", "below", 3],
			"_temp3": ["m", "0-14", "none", "below", "below", 2],
			"_temp4": ["f", "15-64", "none", "above", "above", 2],
			"_temp5": ["m", "65+", "physical_dwarfism", "above", "above", 1]
		},
		"updates": {},
		"deletes": []
	}
}
`;
	return new Response(docs, {
		status: 200,
		headers: { "Content-Type": "text/plain" },
	});
});
