# Human direct effects

2025-09-12

## Overview

Human direct effects track the impact of disasters on people. Data is stored across multiple tables with a shared disaggregation structure.

### Tables

There are 5 effect types, each with its own table:

- Deaths
- Injured
- Missing
- Affected
- Displaced

## Table-specific columns

Each table has its own metric columns:

- Deaths: `deaths` (number)
- Injured: `injured` (number)
- Missing: `as_of` (date), `missing` (number)
- Affected: `direct` (number), `indirect` (number)
- Displaced: `assisted` (enum), `timing` (enum), `duration` (enum), `as_of` (date), `displaced` (number)

## Data storage

Here are a few examples how different data points are stored.

### No custom disaggregations

`sex:m age:65+ injured:100`

This row only has disaggregations that are shared between all tables (One of: sex,age,disability,globalPovertyLine,nationalPovertyLine).

There will be a row with disaggregation values in human_dsg table.
`id:ex1 record_id:x sex:m age:65+`

The injured number will be stored in injured table linking to human_dsg table.
`id:x dsg_id:ex1 injured:100`

### Custom disaggregation.

Using the following as an example:
`custom_flag:t/f`

`sex:m age:65+ injured:100 custom_flag:f`

The custom disaggregation values are stored in json in human_dsg table.

`id:ex1 record_id:x sex:m age:65+ custom:{"custom_flag":"f"}`

### Totals

The totals for each table are stored in two places:

Using this as an example:
`id:ex1 record_id:x injured:100`

It will be stored as a row in disaggregation table with all fields set to null.

But we also store a copy of this value in human_category_presence table for easier querying.

## Shared disaggregation columns

All effect tables share the same disaggregation columns stored in `human_dsg` table:

- `sex` (enum): `m` (male), `f` (female), `o` (other)
- `age` (enum): `0-14` (children), `15-64` (adults), `65+` (elderly)
- `disability` (enum): Multiple values (physical, sensorial, psychosocial, intellectual, multiple, others)
- `global_poverty_line` (enum): `below`, `above`
- `national_poverty_line` (enum): `below`, `above`

These can be hidden per country account via configuration.

## Custom disaggregations

Country accounts can define additional custom disaggregation columns. Values are stored in the `custom` jsonb column in `human_dsg`:

```
id:ex1 record_id:x sex:m age:65+ custom:{"custom_flag":"f"}
```

Custom column definitions are stored in `human_dsg_config.custom.config` as an array of `{dbName, uiName, uiColWidth, enum}`.

## Totals storage

Totals are stored in two places:

- human_dsg + effect table: A row with all disaggregation columns set to NULL (and custom empty)
- human_category_presence: Copies of totals for faster queries (e.g., `deaths_total`, `injured_total`)

## Category presence

The `human_category_presence` table tracks:

- Which metrics are present for each record (e.g., `deaths: true`, `injured: null`)
- Total group column names for each table (e.g., `deathsTotalGroupColumnNames: ["sex", "age"]`)

## Configuration

The `human_dsg_config` table stores per-country configuration:

- `hidden.cols`: Array of disaggregation column names to hide
- `custom.config`: Custom disaggregation column definitions

Columns with existing data cannot be hidden or deleted (enforced by the code).

## Querying data

If you are only interested in totals it's better to use human_category_presence table, since the query is simpler and faster.

```sql
SELECT
	dr.id,
	hcp.deaths,
	hcp.deaths_total,
	hcp.injured,
	hcp.injured_total
FROM human_category_presence hcp
JOIN disaster_records dr ON dr.id = hcp.record_id
JOIN disaster_event de ON de.id = dr.disaster_event_id
```

If you need to show data by a disaggregation, you will have to use the source tables. Here is an example where the data is disaggregated by sex, ignoring rows which have any other fields set. We also need to check that custom fields are not set.

```sql
SELECT
	hd.sex,
	SUM(d.deaths)
FROM human_category_presence hcp
JOIN human_dsg hd ON hcp.record_id = hd.record_id
JOIN deaths d ON hd.id = d.dsg_id
JOIN disaster_records dr ON dr.id = hcp.record_id
JOIN disaster_event de ON de.id = dr.disaster_event_id
WHERE hcp.deaths IS TRUE
	AND hd.sex IS NOT NULL
	AND hd.age IS NULL
	AND hd.disability IS NULL
	AND hd.global_poverty_line IS NULL
	AND hd.national_poverty_line IS NULL
	AND (hd.custom IS NULL
		OR hd.custom = '{}'::jsonb
		OR (
			SELECT COUNT(*)
			FROM jsonb_each(hd.custom)
			WHERE jsonb_typeof(value) != 'null'
		) = 0
	)
GROUP BY hd.sex
```

## Implementation files

```
app/
├── backend.server/
│   ├── models/
│   │   └── human_effects.ts        # DB operations (CRUD, queries, validation)
│   └── handlers/
│       └── human_effects.ts        # Request handlers for routes
├── frontend/
│   ├── editabletable/              # Editable table component (used only for human effects)
│   │   ├── view.tsx                # React table component
│   │   ├── base.ts                 # Base types (Def, ColWidth, etc.)
│   │   ├── data.ts                 # Data transformation utilities
│   │   ├── validate.ts             # Validation logic
│   │   └── styles.css              # Table styles
│   └── human_effects/
│       ├── defs.ts                 # Types (HumanEffectsTable, HumanEffectsCustomDef)
│       └── custom_editor.tsx       # React component for custom disaggregation config
└── routes/
    ├── $lang+/disaster-record+/edit-sub.$disRecId+/human-effects+/
    │   ├── _index.tsx              # Main edit page
    │   ├── load.ts                 # Load data endpoint
    │   ├── save.ts                 # Save data endpoint
    │   ├── clear.ts                # Clear single table endpoint
    │   ├── delete-all-data.ts      # Delete all tables endpoint
    │   ├── csv-import.tsx          # CSV import
    │   └── csv-export.ts           # CSV export
    ├── $lang+/settings+/human-effects-dsg+/
    │   ├── _index.tsx              # Settings page (hide/show columns)
    │   └── custom.tsx              # Custom disaggregation config
    └── $lang+/api+/human-effects+/
        ├── _index.tsx              # API index
        ├── list.tsx                # List API
        ├── save.tsx                # Save API
        └── category-presence-save.tsx
```

### Test files

```
app/backend.server/models/
└── human_effects_test.ts           # Unit tests for model functions

app/frontend/editabletable/
├── validate_test.ts                # Tests for validation logic
└── data_test.ts                    # Tests for data transformation

tests/integration-realdb/routes/disaster-record/human-effects/
├── test-helpers.ts                 # Test utilities
├── index.test.ts                   # Tests for main page
├── load.test.ts                    # Tests for load endpoint
├── save.test.ts                    # Tests for save endpoint
├── clear.test.ts                   # Tests for clear endpoint
└── delete-all-data.test.ts         # Tests for delete all endpoint
```

### Data flow

1. Frontend (`_index.tsx`) displays editable table with disaggregation columns
2. Load (`load.ts`) fetches data via `handlers/human_effects.ts` → `models/human_effects.ts`
3. Save (`save.ts`) persists changes via handler → model (validates, updates DB tables)
4. Settings (`human-effects-dsg+/`) allows hiding columns and adding custom disaggregations
5. Model handles all DB operations: creates/updates across `human_dsg` + effect table, maintains totals in `human_category_presence`

## Implementation overview

### Architecture

The human effects system follows a layered architecture:

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (React)                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  editabletable/view.tsx - Reusable table component          │    │
│  │  ├── Displays rows with disaggregation columns              │    │
│  │  ├── Inline editing (add/update/delete rows)                │    │
│  │  ├── Total row calculation                                  │    │
│  │  └── Validation feedback                                    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  human_effects/custom_editor.tsx - Column configuration     │    │
│  │  └── Admin UI for custom disaggregation columns             │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Routes (React Router)                         │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  human-effects+/        │  │  human-effects-dsg+/            │   │
│  │  ├── _index.tsx (page)  │  │  ├── _index.tsx (hide columns)  │   │
│  │  ├── load.ts            │  │  └── custom.tsx (custom columns)│   │
│  │  ├── save.ts            │  └─────────────────────────────────┘   │
│  │  ├── clear.ts           │                                        │
│  │  └── csv-import/export  │                                        │
│  └─────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Handler Layer                                  │
│  handlers/human_effects.ts                                          │
│  ├── loadData() - Fetch table data + defs + category presence       │
│  ├── saveHumanEffectsData() - Transactional save with validation    │
│  ├── clear() - Clear single table                                   │
│  └── deleteAllData() - Clear all tables for a record                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Model Layer                                   │
│  models/human_effects.ts                                            │
│  ├── CRUD operations (create, update, deleteRows, get)              │
│  ├── Defs management (sharedDefs, defsForTable, defsCustom)         │
│  ├── Totals (setTotal, getTotal, calcTotalForGroup)                 │
│  ├── Category presence (categoryPresenceGet/Set)                    │
│  ├── Validation (validate, validateRow)                             │
│  └── Column protection (getUsedBuiltinColumns, getUsedCustomColumns)│
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Database Tables                               │
│  ┌─────────────────────┐  ┌──────────────────────────────────────┐  │
│  │  human_dsg          │  │  deaths / injured / missing /        │  │
│  │  ├── id             │  │  affected / displaced                │  │
│  │  ├── record_id      │  │  ├── id                              │  │
│  │  ├── sex            │  │  ├── dsg_id ──► human_dsg.id         │  │
│  │  ├── age            │  │  └── [table-specific columns]        │  │
│  │  ├── disability     │  └──────────────────────────────────────┘  │
│  │  ├── custom (jsonb) │                                            │
│  │  └── ...            │  ┌──────────────────────────────────────┐  │
│  └─────────────────────┘  │  human_category_presence             │  │
│                           │  ├── record_id                       │  │
│  ┌─────────────────────┐  │  ├── deaths (bool)                   │  │
│  │  human_dsg_config   │  │  ├── deaths_total (int)              │  │
│  │  ├── country_acct_id│  │  └── ...                             │  │
│  │  ├── hidden.cols    │  └──────────────────────────────────────┘  │
│  │  └── custom.config  │                                            │
│  └─────────────────────┘                                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Key concepts

**Disaggregation structure**: Each data row has shared dimensions (sex, age, disability, poverty lines) stored in `human_dsg`, and table-specific metrics stored in the respective effect table. Custom disaggregations are stored as JSONB in `human_dsg.custom`.

**Column definitions (Defs)**: The `defsForTable()` function returns column definitions for each table, combining:

- Shared columns from `sharedDefs()`
- Custom columns from `defsCustom()` (per-country)
- Table-specific columns from `defsForTableGlobal()`

**Totals handling**: When disaggregations are grouped (e.g., by sex), totals are automatically calculated and stored. The `totalGroupSet()` function stores which columns are grouped, and `calcTotalForGroup()` computes the sum.

**Data protection**: Before hiding a built-in column or deleting a custom column, the system checks if data exists using `getUsedBuiltinColumns()` and `getUsedCustomColumnsAndValues()`.

### Save transaction

When saving data (`saveHumanEffectsData`), the handler performs these steps in a transaction:

1. Validate column definitions match expected columns
2. Delete removed rows
3. Update modified rows
4. Insert new rows
5. Calculate and store totals
6. Validate totals match disaggregated data
7. Update category presence flags

If any step fails, the entire transaction rolls back.

## Running tests

### `yarn test:run1`

Runs tests with node's built-in test runner (`node:test`) against testdb1 database:

- `app/backend.server/models/human_effects_test.ts` - CRUD operations, totals calculation, category presence, custom column validation
- `app/frontend/editabletable/validate_test.ts` - Validation logic: duplicate dimensions, subtotals vs totals, empty rows, missing metrics
- `app/frontend/editabletable/data_test.ts` - DataManager class: tracking updates/deletes/new rows, sorting, grouping, totals handling

### `yarn test:run3`

Runs tests with vitest against testdb1 database:

- `tests/integration-realdb/routes/disaster-record/human-effects/` - HTTP endpoint tests (load, save, clear, delete)

Note: Both use testdb1 database. Running in parallel causes deadlocks. Run sequentially.
