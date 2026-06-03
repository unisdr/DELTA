## ADDED Requirements

### Requirement: PageProps generic type is exported from a shared module

`app/frontend/page-props.ts` SHALL export a generic type `PageProps<T>` with the
shape `{ data: T }`. This type MUST be the single canonical contract used by all
page-level components in the Clean Architecture migration. No page-level component
SHALL declare its own ad-hoc `data` field type outside of this contract.

#### Scenario: Type is importable and carries data field

- **GIVEN** a TypeScript file imports `PageProps` from `~/frontend/page-props`
- **WHEN** the import is resolved by `tsc`
- **THEN** `PageProps<SomeLoaderData>` SHALL resolve to `{ data: SomeLoaderData }`
  without type errors

#### Scenario: Type does not carry render-control props

- **GIVEN** `PageProps<T>` is defined
- **WHEN** a component declares `type MyPageProps = PageProps<MyData> & { isPublic: boolean }`
- **THEN** `MyPageProps` SHALL include both `data: MyData` and `isPublic: boolean`
  as distinct fields, confirming the generic is only responsible for the data slot
  and render-control props are added via intersection

#### Scenario: Zero TypeScript errors after introducing the type

- **GIVEN** `app/frontend/page-props.ts` is created
- **WHEN** `yarn tsc` is executed
- **THEN** the compiler SHALL report zero type errors in this file and in all files
  that import from it
