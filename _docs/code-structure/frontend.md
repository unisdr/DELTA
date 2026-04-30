- [Code structure](code-structure.md)

# Frontend

`app/frontend`
Contains UI logic shared between server and browser. No direct DB access here.

## Form, CSV, API code

See [Form implementation details](form-implementation.md) for comprehensive documentation.

- **`form.tsx`** — Shared code for form rendering and viewing: `FormInputDef` type, `Inputs`, `Input`, `FieldView`, `FormScreen`/`formScreen`, `ViewScreen` variants
- **`form_validate.ts`** — Type checks data against `fieldsDef`, ensures required fields are present. All other validation is in models instead.

## Supporting files

- **`context.ts`** — `ViewContext` class providing `ctx.t()` translator and `ctx.url()` for components
- **`approval.ts`** — Approval status definitions and label mappings
- **`components/delete-dialog.tsx`** — Delete button with confirmation dialog
- **`components/repeatablefields.ts`** — Client-side visibility control for repeatable field groups

## Dev example

- **`dev_example1.tsx`** — Example of form and view using field definitions. Use as a reference when adding a new data type.

## Editable Table: Human effects

Implements an editable table where each row maps to a DB row. Edits are stored in `localStorage` until the user clicks Save.

- `view.tsx` — Table UI
- `data.ts`, `data_test.ts` — Manages data and local state

```
// Local state format
// map<id, map<field, value>
private updates: Map<string, Map<number, any>>
// set<id>
private deletes: Set<string>
// map<id, data>
private newRows: Map<string, any[]>

```
