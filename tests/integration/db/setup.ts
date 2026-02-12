import { afterAll, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./testSchema/";

const { createRequire } = await import("node:module");
const require = createRequire(import.meta.url);
const { pushSchema } = require("drizzle-kit/api");

let testDb: any;

vi.mock("~/db.server", async (importOriginal) => {
	const original = await importOriginal<any>();

	if (testDb) {
		return { ...original, dr: testDb };
	}

	const client = new PGlite(); // in-memory, auto-created
	testDb = drizzle(client, { schema });

	// Push schema directly (no migrations needed)
	const result = await pushSchema(schema, testDb);
	await result.apply(); // executes the SQL to create tables

	return {
		...original,
		dr: testDb,
		// If you export other things like pool, override them too if needed
	};
});

// PGlite cleans up automatically on process exit, but optional:
afterAll(async () => {
	if (testDb?.$client) {
		await testDb.$client.close();
	}
});
