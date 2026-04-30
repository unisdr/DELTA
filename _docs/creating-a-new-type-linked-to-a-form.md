# Adding a new type linked to a form

- [Form/CSV/API pattern](code-structure/form-csv-api.md)
- [Implementation details](code-structure/form-implementation.md)

This pattern supports form UI, API, and CSV import/export using shared fieldDefs.

Use an existing production entity (e.g. `organization`) as a reference implementation.

## Database table

`app/drizzle/schema/`
Define database schema by adding a new file following the same pattern as other tables. Run `yarn dbsync` after adding.

## Database access layer

`app/backend.server/models/{yourEntity}.ts`
Create a new model file. This includes the form field definitions, all database queries, and record validation.

## Form definition

`app/frontend/{yourEntity}.tsx`
Create a form definition file including the form and view components.

## Routes

`app/routes/$lang+/{yourfeature}+/`
Create the route folder with:

- edit.$id.tsx - Create and update form (/edit/new for creating a new record).
- $id.tsx - View record.
- \_index.tsx - List records.
- delete.$id.tsx - Delete a record.

CSV handling related files

- csv-import.tsx
- csv-export.tsx

## API

`app/routes/$lang+/api+/{yourfeature}+/`

- \_index.tsx - Documentation for the API

Adding/modifying records

- add.ts
- update.ts
- upsert.ts

Getting the records

- list.ts

CSV

- csv-import-example.ts - Returns a csv file that can be used as an example to import data
