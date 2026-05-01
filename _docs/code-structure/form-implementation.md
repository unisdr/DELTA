# Form Builder Implementation Details

- [Form/CSV/API pattern](form-csv-api.md)
- [Adding a new type](../creating-a-new-type-linked-to-a-form.md)

## How It Fits Together

The form system is driven by a single `FormInputDef<T>` definition. Each data type (hazard event, disaster record, etc.) defines its own `fieldsDef` function that returns an array of these definitions. That array is then used everywhere:

```
fieldsDef (defined in models/)
  ├── Web form (create/update) — validated by validateFromMap, handled by formSave/createOrUpdateAction
  ├── Web form (view) — rendered by FieldsView/ViewComponent
  ├── JSON API (add/update/upsert) — validated by validateFromJson, handled by jsonCreate/jsonUpdate/jsonUpsert
  ├── CSV import (create/update/upsert) — validated by validateFromMap, handled by csvCreate/csvUpdate/csvUpsert
  └── CSV example generation — csvImportExample
```

This means adding or changing a field only requires updating the Drizzle schema and the field definition — the change propagates automatically.

## Data Flow

**Web form submission:**

1. User submits form → React Router action
2. Action calls `createOrUpdateAction` or `formSave` directly
3. `formSave` parses form data, runs `validateFromMapFull`, checks approval permissions
4. On success: DB write inside transaction, audit log, redirect
5. On validation error: returns `{ ok: false, data, errors }` which `formScreen` picks up via `useActionData`

**JSON API:**

1. Client POSTs JSON array → route handler
2. Handler calls `jsonCreate`/`jsonUpdate`/`jsonUpsert`
3. Each item is validated via `validateFromJsonFull`, then created/updated in a single DB transaction
4. Entire batch succeeds or rolls back together

**CSV import:**

1. Client uploads CSV → route handler parses to 2D string array
2. Handler calls `csvCreate`/`csvUpdate`/`csvUpsert`
3. Each row is validated and processed in a DB transaction
4. First error stops the entire batch

## Key Concepts

### `FormInputDef` and field types

Defined in `app/frontend/form.tsx`. Each field has a `type` that determines how it's rendered, validated, and coerced:

- `text`, `textarea`, `uuid` — string inputs
- `number`, `money` — numeric inputs (money validates no commas)
- `date`, `datetime` — date inputs
- `date_optional_precision` — compound widget (year-only, year-month, or full date)
- `bool` — checkbox with hidden "off" value
- `enum`, `approval_status` — select dropdowns (approval_status has role-based restrictions)
- `enum-flex` — select that allows values not in the predefined list
- `json` — textarea with JSON validation
- `other` — generic passthrough (used for spatialFootprint)
- `temp_hidden` — custom ui dialog fields which are not actually saved (needs confirmatino)

Layout is controlled by `uiRow` (group fields in a row), `uiRowNew` (start a new row), and `repeatable` (field groups that can repeat).

### Result pattern

All create/update/delete operations return a discriminated union: `{ ok: true, ... }` or `{ ok: false, errors }`. The `errors` object uses the `Errors<T>` shape with `form`-level and `fields`-level error lists. This is consistent across web forms, JSON API, and CSV handlers.

### Approval status enforcement

`formSave` enforces that data-collectors can only set certain approval statuses. Validators and admins have full access. This is checked in `adjustApprovalStatsBasedOnUserRole` before any DB write.

### Audit logging

`createOrUpdateAction` and `formDelete` automatically log audit entries (who changed what, old/new values) via `logAudit`. The `createViewLoaderPublicApprovedWithAuditLog` variant also loads audit logs for the view page.

### Tenant isolation

Most handlers accept or derive a `countryAccountsId` to scope operations to the current tenant. Variants like `createActionWithCountryAccountsId` and `formDeleteWithCountryAccounts` enforce this at the handler level.

## Files

### Backend handlers

- **`backend.server/handlers/form/form.ts`** — Core web form handlers: create, update, save, delete, view loaders, action wrappers with auth and audit
- **`backend.server/handlers/form/form_api.ts`** — JSON API handlers: bulk create, update, upsert, and auto-generated API docs. Also contains spatialFootprint post-processing and damage asset-sector validation
- **`backend.server/handlers/form/form_csv.ts`** — CSV import handlers: create, update, upsert from 2D string arrays, plus example CSV generation
- **`backend.server/handlers/form/csv_import.ts`** — Route-level CSV import action: parses uploaded file, calls `csvCreate`/`csvUpdate`/`csvUpsert` based on `import_type` param. Also provides `createExampleLoader` for downloading example CSVs
- **`backend.server/handlers/form/csv_export.ts`** — Route-level CSV export loader: fetches data, converts to CSV, returns as downloadable file
- **`backend.server/handlers/form/form_utils.ts`** — Error construction helpers and predefined error constants
- **`backend.server/handlers/view.ts`** — View-related helpers: `getItem2` for fetching single records by ID, `createPaginatedLoader` and `createApiListLoader` for list views with pagination

### Frontend

- **`frontend/form.tsx`** — Form rendering: `Form`, `Inputs`, `Input` (per-type widgets), `FormView`, `FieldView`, `FieldsView`, `ViewComponent`, `ViewComponentMainDataCollection` (with approval workflow), `FormScreen`/`formScreen` (action data wiring), error display components
- **`frontend/form_validate.ts`** — Validation engine: `validateFromMap` (for form/CSV string data), `validateFromJson` (for JSON API data), date range validation, all type coercion and error helpers
- **`frontend/context.ts`** — `ViewContext` class: provides `ctx.t()` translator and `ctx.url()` URL builder for frontend components. Pulls `lang` and `user` from root loader data
- **`frontend/approval.ts`** — Approval status definitions: `approvalStatusIds` type, `approvalStatusField` for form definitions, `approvalStatusKeyToLabel` for display
- **`frontend/components/delete-dialog.tsx`** — `DeleteButton` component with confirmation dialog, plus `HazardousEventDeleteButton` variant with specific messaging
- **`frontend/components/repeatablefields.ts`** — Client-side JS for showing/hiding repeatable field groups based on which fields have values

### Context classes

- **`backend.server/context.ts`** — `BackendContext` class for handlers: provides `ctx.t()` translator, `ctx.lang`, `ctx.url()`, and `ctx.fullUrl()` for absolute URLs. Used in API docs generation and server-side rendering
- **`frontend/context.ts`** — `ViewContext` class for components (see above)

### Roles and permissions

- **`frontend/user/roles.ts`** — Role definitions (`data-viewer`, `data-collector`, `data-validator`, `admin`, `super_admin`), permission IDs, and helper functions (`roleHasPermission`, `canEditRecord`, `canAddNewRecord`). Used by `approval_status` field type to restrict status transitions based on user role

### Tests

- **`backend.server/handlers/form/form_test.ts`** — Unit tests for `formSave`, `jsonCreate`, `jsonUpdate`, `jsonUpsert`, `csvCreate`, `csvUpdate`, `csvUpsert`, `csvImportExample`

### Model example

Refer to any active production model (e.g. `backend.server/models/organization.ts`) as a reference implementation for `fieldsDef`, `fieldsDefApi`, `fieldsDefView`, `validate`, CRUD functions, and ID lookup by import ID.

## Related documentation

- [Handlers](handlers.md) — Overview of all handler files
- [Frontend](frontend.md) — Overview of frontend structure
- [Models](models.md) — Database access layer patterns
