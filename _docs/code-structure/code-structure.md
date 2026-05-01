# Code Structure

## Important concepts

- [Form CSV API pattern](form-csv-api.md)
- [Form implementation details](form-implementation.md)

## Folder Structure

See [Project structure in the README](../../readme.md#project-structure) for the top-level annotated directory tree. The sections below describe the `app/` subdirectory in more detail.

## Server only code

`app/backend.server`

### Database Access

`app/backend.server/models`

- [Models](models.md) - Database models (or database access layer). Most files map to a table in the database.

### Request Handlers

`app/backend.server/handlers`

- [Handlers](handlers.md) - Code that is shared between multiple React Router routes.

### Services

`app/backend.server/services`

- Server-side services (e.g. MCP integration, email validation workflow)

### Routes

- [Routes](routes.md)
  `app/routes`

### Frontend

- [Frontend](frontend.md)
  `app/frontend`

### Shared UI Components

`app/components`

- Shared React components used across routes (e.g. MainMenuBar, ContentPicker, ContentRepeater, ErrorState)

### Pages

`app/pages`

- Full-page components for settings views (e.g. AccessManagementPage, OrganizationManagementPage)

### Application Services

`app/services`

- Application-level service layer (e.g. countryAccountService, organizationService, settingsService)

### Utilities

`app/utils`

- Shared utility functions (auth, email, session, logging)

### Database schema

- [Drizzle](drizzle.md)
  `app/drizzle`

### Database Queries

`app/db/queries`

- Repository-pattern query files for database access (e.g. `countryAccountsRepository.ts`, `UserRepository.ts`)

### Types

`app/types`

- Global types and declarations for dependencies not in ts (or without builtin type definitions)

### Content Override

`information-pages-override`

- User-placed markdown files
- Content loaded via loadMarkdownContent.tsx
- Follow consistent naming conventions for files
- This directory is created at runtime and is not committed to the repository
