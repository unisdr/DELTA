// reflect-metadata MUST be the very first import so that the Reflect polyfill
// is in place before any NestJS decorator metadata is evaluated.
import "reflect-metadata";

import { Test, type TestingModule } from "@nestjs/testing";
import { describe, it, expect, afterEach } from "vitest";

import {
	DRIZZLE_CLIENT,
	DrizzleProvider,
} from "~/infrastructure/DrizzleProvider.server";
import { CoreModule } from "~/infrastructure/CoreModule.server";
import { getAppContext } from "~/init.server";
import { dr } from "~/db.server";

describe("getAppContext", () => {
	it("throws before initServer() has been called", () => {
		// Verifies nestjs-bootstrap spec: getAppContext throws before bootstrap.
		// In the test environment, initServer() is never called, so appContext is
		// undefined. The guard must throw a descriptive Error — not return undefined.
		expect(() => getAppContext()).toThrow(
			"NestJS application context has not been initialised",
		);
	});
});

describe("CoreModule", () => {
	const modulesToClose: TestingModule[] = [];

	afterEach(async () => {
		await Promise.all(modulesToClose.map((m) => m.close()));
		modulesToClose.length = 0;
	});

	it("compiles without error", async () => {
		// Verifies core-module spec: CoreModule compiles.
		const module = await Test.createTestingModule({
			imports: [CoreModule],
		}).compile();
		modulesToClose.push(module);

		expect(module).toBeDefined();
	});

	it("resolves DRIZZLE_CLIENT to the dr singleton", async () => {
		// Verifies drizzle-provider spec: Provider resolves to the dr singleton.
		// The PGlite test double is injected by tests/integration/db/setup.ts via
		// vi.mock("~/db.server"), so `dr` here is the same mock that DrizzleProvider
		// reads through its useFactory.
		const module = await Test.createTestingModule({
			imports: [CoreModule],
		}).compile();
		modulesToClose.push(module);

		const resolvedDr = module.get(DRIZZLE_CLIENT);
		expect(resolvedDr).toBe(dr);
	});

	it("resolves DRIZZLE_CLIENT to the same object reference on repeated gets", async () => {
		// Verifies drizzle-provider concurrent resolution spec: NestJS singleton scope
		// guarantees a single provider instance across the lifetime of the context.
		const module = await Test.createTestingModule({
			imports: [CoreModule],
		}).compile();
		modulesToClose.push(module);

		const first = module.get(DRIZZLE_CLIENT);
		const second = module.get(DRIZZLE_CLIENT);
		expect(first).toBe(second);
	});

	it("DrizzleProvider descriptor has the correct provide key and a useFactory function", () => {
		// Verifies drizzle-provider spec: Provider descriptor has the correct provide key.
		// No module created — descriptor is a plain object, no lifecycle to close.
		expect(DrizzleProvider.provide).toBe(DRIZZLE_CLIENT);
		expect(typeof DrizzleProvider.useFactory).toBe("function");
	});

	it("concurrent TestingModule instances both resolve DRIZZLE_CLIENT to the same underlying dr singleton", async () => {
		// Verifies that concurrent resolution of the same module does not produce
		// divergent DRIZZLE_CLIENT values — both callers must get the same singleton.
		// NestJS TestingModule isolation means each compile() creates a fresh container,
		// but within a single module the token must resolve identically.
		const [moduleA, moduleB] = await Promise.all([
			Test.createTestingModule({ imports: [CoreModule] }).compile(),
			Test.createTestingModule({ imports: [CoreModule] }).compile(),
		]);
		modulesToClose.push(moduleA, moduleB);

		const drA = moduleA.get(DRIZZLE_CLIENT);
		const drB = moduleB.get(DRIZZLE_CLIENT);
		// Both resolve to the same underlying dr singleton (the PGlite test double).
		expect(drA).toBe(drB);
	});
});
