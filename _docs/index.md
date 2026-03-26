# Developer documentation

DELTA Resilience (**D**isaster & Hazardous **E**vents, **L**osses and Damages **T**racking & **A**nalysis) is a full-stack TypeScript application built on React Router v7, Vite, and PostgreSQL/PostGIS. See the [README](../readme.md) for quick start and the [CONTRIBUTING guide](../CONTRIBUTING.md) for branch/PR conventions.

## General

- [Code structure](code-structure/code-structure.md)
  - [Models](code-structure/models.md)
  - [Handlers](code-structure/handlers.md)
  - [Routes](code-structure/routes.md)
  - [Frontend](code-structure/frontend.md)
- [Form CSV API](code-structure/form-csv-api.md)
- [Creating a new type linked to a form](creating-a-new-type-linked-to-a-form.md) - step-by-step guide for adding a new entity type

- [Dependencies](dependencies.md)

- [Human direct effects](human-direct-effects.md)
- [Translations](translations/index.md)
- [MCP](mcp.md)

## Requirements

- [IDs](ids.md) - Document IDs used for hazardous, disaster events and disaster records

## Database

- [Database options](database-options.md) - Decision document on picking the database access or ORM library
- [Drizzle](code-structure/drizzle.md) - notes on using drizzle

## API docs for data import

- [API for Desinventar import](api-for-desinventar-import.md)

## Geographic divisions

- [Division import guide](division/division_import_guide.md)
- [Division technical implementation](division/division_technical_implementation.md)
- [Bundled GeoJSON assessment](division/division_bundled_geojson_assessment.md)

## Installation

- [Shared instance installation](installation/shared-instance-installation.md)
- [Health check best practices](installation/health-check-best-practices.md)

## Security

- [API key – user relationship guide](security/api-key-user-relationship-guide.md)
- [API key – user assignment developer guide](security/api-key-user-assignment-developer-guide.md)
- [Tenant isolation file storage testing guide](tenant-isolation-file-storage-testing-guide.md)

## Maps & dashboards

- [Custom map integration guide](custom-map/custom-map-integration-guide.md)
- [Sectors dashboard user guide](dashboards/sectors/user-guide.md)
- [Sectors dashboard developer guide](dashboards/sectors/developer-guide.md)

## High availability

- [HA analysis report](<High Availability (HA)/01-HA-Analysis-Report.md>)

## Assessments & proposals

- [Google Analytics integration assessment](google-analytics-integration-assessment.md)

## LICENSE

- [License](License/INDEX.md)
