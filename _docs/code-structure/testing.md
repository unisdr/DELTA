- [Code structure](code-structure.md)

# Testing

## Test commands

- `yarn test:run1` — Node's built-in test runner (`node:test`) against real PostgreSQL (testdb1). Used for model/unit tests needing a real database.
- `yarn test:run2` — Vitest with PGlite in-memory database. Used for unit + integration tests. No PostgreSQL setup required.
- `yarn test:run3` — Vitest against real PostgreSQL (configured in `.env.test`). Used for integration tests of route loaders/actions.
- `yarn test:e2e` — Playwright end-to-end tests against a running app.

### What each command tests

**test:run1** — Model and handler tests:

- `app/backend.server/models/human_effects_test.ts` — Human effects CRUD, totals, validation
- `app/backend.server/models/disaster_event_test.ts` — Disaster event model
- `app/backend.server/models/disaster_record_test.ts` — Disaster record model
- `app/backend.server/models/event_test.ts` — Event model
- `app/backend.server/models/hip_test.ts` — HIP model
- `app/backend.server/handlers/form/form_test.ts` — Form handler
- `app/frontend/editabletable/validate_test.ts` — Editable table validation
- `app/frontend/editabletable/data_test.ts` — DataManager class
- `app/frontend/form_validate_test.ts` — Form validation
- `app/frontend/user/roles_test.ts` — User roles

**test:run2** — Unit tests with PGlite:

- `tests/unit/util/id.test.ts` — UUID validation
- `tests/unit/util/array.test.ts` — Array utilities
- `tests/unit/utils/geoValidation.test.ts` — Geography validation
- `tests/unit/routes/mcp.test.ts` — MCP route
- `tests/integration/db/queries/user.test.ts` — User repository

**test:run3** — Route integration tests:

- `disaster-record/damages/` — Damages CRUD, CSV import/export
- `disaster-record/losses/` — Losses CRUD
- `disaster-record/disruptions/` — Disruptions CRUD
- `disaster-record/human-effects/` — Human effects load/save/clear/delete
- `disaster-record/main/` — Disaster record CRUD
- `disaster-event/` — Disaster event CRUD
- `hazardous-event/` — Hazardous event CRUD
- `settings/assets/` — Assets CRUD, CSV import/export

**test:e2e** — Playwright end-to-end tests (UI flows via browser):

- `login/` — Login page: load, error on invalid credentials, redirect on success
- `disaster-event/` — CRUD: list, add, edit, delete
- `disaster-records/` — CRUD: list, add, edit, delete
- `hazardous-event/` — CRUD: list, add, edit, delete

**Selenium IDE tests**:

- `tests/selenium/browser.side` — Selenium IDE test file for UI testing

### Running specific tests

**test:run1** (node:test):

```bash
yarn test:run1
```

Uses Node's built-in test runner. Tests are in `app/backend.server/**/*_test.ts` and `app/frontend/**/*_test.ts`.

**test:run2** (Vitest):

```bash
yarn vitest run path/to/test.ts
yarn vitest run -t "test name pattern"
```

**test:run3** (Vitest + real DB):

```bash
yarn vitest run --config vitest.integration-realdb.config.ts path/to/test.ts
```

## Test locations

**test:run1** (`*_test.ts` files):

- `app/backend.server/**/*_test.ts` — Model and handler tests using real DB
- `app/frontend/**/*_test.ts` — Frontend logic tests using real DB

**test:run2** (`*.test.ts` files):

- `tests/unit/**/*.test.{ts,tsx}` — Pure unit tests, no database
- `tests/integration/**/*.test.{ts,tsx}` — Integration tests with PGlite
- `app/routes/**/*.test.{ts,tsx}` — Co-located route tests with PGlite

**test:run3** (`*.test.ts` files):

- `tests/integration-realdb/**/*.test.{ts,tsx}` — Integration tests with real PostgreSQL

**test:e2e**:

- `tests/e2e/` — Playwright end-to-end tests

## test:run1 (node:test)

Uses Node's built-in test runner (`node:test`) against a real PostgreSQL database:

- Entry point: `app/tests/all.ts`
- Imports `*_test.ts` files from `app/backend.server/` and `app/frontend/`
- Uses `node:test` and `node:assert/strict` imports
- Requires `.env.test` with `DATABASE_URL` pointing to testdb1

Example test file (`app/backend.server/models/human_effects_test.ts`):

```typescript
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { dr } from "~/db.server";

describe("HumanEffects", () => {
	it("should create record", async () => {
		const result = await create(data);
		assert.strictEqual(result.id, expectedId);
	});
});
```

## test:run2 (Vitest + PGlite)

Uses Vitest with an in-memory PGlite database:

- Setup: `tests/integration/db/setup.ts`
- Includes: `tests/unit/**/*.test.{ts,tsx}`, `tests/integration/**/*.test.{ts,tsx}`, `app/routes/**/*.test.{ts,tsx}`
- Mocks `~/db.server` via `vi.mock`, replacing Drizzle client with PGlite
- No `.env` or running PostgreSQL required

Example test file (`tests/unit/util/id.test.ts`):

```typescript
import { describe, it, expect } from "vitest";
import { isValidUUID } from "~/utils/id";

describe("isValidUUID", () => {
	it("should return true if valid UUID", () => {
		expect(isValidUUID("50a3b7c1-8f2d-4d9a-9e1c-3b8f4e6a2d1c")).toBe(true);
	});
});
```

## test:run3 (Vitest + real PostgreSQL)

Uses Vitest against a real PostgreSQL instance:

- Setup: `tests/integration-realdb/setup.ts`
- Includes: `tests/integration-realdb/**/*.test.{ts,tsx}`
- Requires `.env.test` with `DATABASE_URL`
- Tests route loaders/actions directly (not via HTTP requests)
- Mocks session/auth but uses real database operations
- Supports PostGIS and database extensions

Test structure:

```
tests/integration-realdb/routes/
├── disaster-record/
│   ├── damages/        # CRUD, CSV import/export tests
│   ├── losses/         # CRUD tests
│   ├── disruptions/    # CRUD tests
│   └── human-effects/  # Load, save, clear, delete tests
├── disaster-event/     # Event CRUD tests
├── hazardous-event/   # Hazardous event tests
└── settings/
    └── assets/         # Asset CRUD, CSV tests
```

Each test module typically includes:

- `$id.test.ts` - GET by ID endpoint
- `_index.test.ts` - List endpoint
- `edit.$id.test.ts` - Update endpoint
- `delete.$id.test.ts` - Delete endpoint
- `csv-import.test.ts` - CSV import (if applicable)
- `csv-export.test.ts` - CSV export (if applicable)
- `test-helpers.ts` - Shared test utilities

## E2E tests

Playwright tests in `tests/e2e/`. They expect the app running on port 4000:

```bash
# Set port in .env.test
PORT=4000

# Run tests
yarn test:e2e
yarn test:e2e:ui      # Playwright UI mode
yarn test:e2e:headed  # Run with visible browser
```

## Writing tests

### test:run1 (node:test)

Uses `node:test` and `node:assert/strict`. Files must end with `_test.ts`:

```typescript
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { dr } from "~/db.server";

describe("MyModel", () => {
	beforeEach(async () => {
		// setup
	});

	it("should do something", async () => {
		const result = await myFunction();
		assert.strictEqual(result, expected);
	});
});
```

### test:run2 (Vitest + PGlite)

Uses Vitest with `describe`, `it`, `expect` imports. Files must end with `.test.ts` or `.test.tsx`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("MyComponent", () => {
	it("should work", async () => {
		const result = await myFunction();
		expect(result).toBe(expected);
	});
});
```

### test:run3 (Vitest + real PostgreSQL)

Same Vitest imports as test:run2. Tests call route loaders/actions directly with mocked sessions. Files must end with `.test.ts` or `.test.tsx`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loader } from "~/routes/path/to/route";
import {
	setupSessionMocks,
	createTestIds,
	createTestUser,
	cleanupTestUser,
} from "./test-helpers";

const testIds = createTestIds();
setupSessionMocks();

describe("route loader", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		await createTestUser(testIds);
	});

	afterEach(async () => {
		await cleanupTestUser(testIds);
	});

	it("should return data", async () => {
		const request = new Request("http://localhost:3000/en/path");
		const response = await loader({ request, params: {}, context: {} });
		expect(response.data).toBeDefined();
	});
});
```

## Test database requirements

### test:run1 and test:run3

Both require a PostgreSQL database. Configure in `.env.test`:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/testdb1
```

The database should be created before running tests. Tests will create/cleanup data within transactions where possible.

### test:run2

No setup required - uses in-memory PGlite.
