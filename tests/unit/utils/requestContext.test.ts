import { describe, expect, it } from "vitest";
import {
	withRequestContext,
	getRequestContext,
} from "~/utils/requestContext.server";

describe("requestContext", () => {
	// Task 1.1 — store is initialised with sessionCache === undefined inside a scope
	it("getRequestContext() inside withRequestContext scope returns a store with sessionCache undefined", async () => {
		let capturedStore: ReturnType<typeof getRequestContext>;

		await withRequestContext(async () => {
			capturedStore = getRequestContext();
		});

		expect(capturedStore).not.toBeUndefined();
		expect(capturedStore!.sessionCache).toBeUndefined();
	});

	// Task 1.2 — no store active outside a scope
	it("getRequestContext() outside any withRequestContext scope returns undefined", () => {
		const result = getRequestContext();
		expect(result).toBeUndefined();
	});

	// Task 1.3 — mutation in one withRequestContext call is NOT visible in the next
	it("stores from separate withRequestContext calls do not bleed", async () => {
		// First scope: mutate sessionCache to a sentinel value
		await withRequestContext(async () => {
			const ctx = getRequestContext()!;
			// Use null to represent "fetched but no session" — one of the valid stored states
			ctx.sessionCache = null;
		});

		// Second scope: the mutation from the first scope MUST NOT be visible
		let secondStore: ReturnType<typeof getRequestContext>;
		await withRequestContext(async () => {
			secondStore = getRequestContext();
		});

		expect(secondStore).not.toBeUndefined();
		expect(secondStore!.sessionCache).toBeUndefined();
	});

	// Task 1.4 — mutation made inside a scope persists within that same scope
	it("mutation persists within the same withRequestContext scope", async () => {
		const sentinelValue = null; // null = fetched, unauthenticated
		let secondRead: ReturnType<typeof getRequestContext>;

		await withRequestContext(async () => {
			const ctx = getRequestContext()!;
			ctx.sessionCache = sentinelValue;

			// Read again later in the same async chain
			secondRead = getRequestContext();
		});

		expect(secondRead).not.toBeUndefined();
		expect(secondRead!.sessionCache).toBe(sentinelValue);
	});
});
