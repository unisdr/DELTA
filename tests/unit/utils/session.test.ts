import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock ~/db.server — intercept all Drizzle calls so no real DB is needed.
// vi.hoisted() ensures these references are available at module-eval time.
// ---------------------------------------------------------------------------
const { findFirstMock, updateWhereMock } = vi.hoisted(() => ({
	findFirstMock: vi.fn(),
	updateWhereMock: vi.fn(),
}));

vi.mock("~/db.server", () => ({
	dr: {
		query: {
			sessionTable: {
				findFirst: findFirstMock,
			},
		},
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: updateWhereMock,
			})),
		})),
	},
}));

// ---------------------------------------------------------------------------
// Mock react-router's createCookieSessionStorage so initCookieStorage()
// works without a real SESSION_SECRET and returns our fake session object.
// ---------------------------------------------------------------------------
const SESSION_ID = "test-session-id";

const fakeSession = {
	get: (key: string) => (key === "sessionId" ? SESSION_ID : undefined),
	set: vi.fn(),
	flash: vi.fn(),
	unset: vi.fn(),
	has: vi.fn(() => false),
	id: "fake",
	data: {},
};

vi.mock("react-router", async (importOriginal) => {
	const original = await importOriginal<typeof import("react-router")>();
	return {
		...original,
		createCookieSessionStorage: vi.fn(() => ({
			getSession: vi.fn().mockResolvedValue(fakeSession),
			commitSession: vi.fn().mockResolvedValue("Set-Cookie: fake"),
			destroySession: vi.fn().mockResolvedValue("Set-Cookie: cleared"),
		})),
	};
});

// ---------------------------------------------------------------------------
// Imports under test (after mocks are registered)
// ---------------------------------------------------------------------------
import { getUserFromSession, initCookieStorage } from "~/utils/session";
import { withRequestContext } from "~/utils/requestContext.server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal mock session row matching the UserSession shape.
 * lastActiveAt is set to `now` so the 40-minute activity timeout passes.
 */
function makeMockSessionData() {
	return {
		id: SESSION_ID,
		userId: "user-1",
		lastActiveAt: new Date(),
		totpAuthed: false,
		user: {
			id: "user-1",
			email: "test@example.com",
			name: "Test User",
		},
	};
}

function makeRequest(): Request {
	return new Request("http://localhost/", {
		headers: { Cookie: "__session=fake" },
	});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("getUserFromSession — session memoization", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Re-initialise cookie storage after clearAllMocks resets the mocks.
		// SESSION_SECRET is not validated by our mock of createCookieSessionStorage.
		process.env.SESSION_SECRET = "test-secret";
		initCookieStorage();

		// Default: findFirst returns a valid session row
		findFirstMock.mockResolvedValue(makeMockSessionData());
		// Default: the update chain resolves silently
		updateWhereMock.mockResolvedValue(undefined);
	});

	// Task 2.1 — two calls inside same scope → exactly one DB query
	it("hits the DB exactly once when called twice inside the same withRequestContext scope", async () => {
		const request = makeRequest();

		let result1: Awaited<ReturnType<typeof getUserFromSession>>;
		let result2: Awaited<ReturnType<typeof getUserFromSession>>;

		await withRequestContext(async () => {
			result1 = await getUserFromSession(request);
			result2 = await getUserFromSession(request);
		});

		// Both calls return a valid UserSession
		expect(result1).toBeDefined();
		expect(result2).toBeDefined();
		expect(result1!.sessionId).toBe(SESSION_ID);
		expect(result2!.sessionId).toBe(SESSION_ID);

		// The underlying Drizzle query must have fired exactly once
		expect(findFirstMock).toHaveBeenCalledTimes(1);
	});

	// Task 2.2 — unauthenticated result (null from DB) is also cached
	it("caches unauthenticated result: findFirst returns null → both calls return undefined, DB queried once", async () => {
		findFirstMock.mockResolvedValue(null);

		const request = makeRequest();
		let result1: Awaited<ReturnType<typeof getUserFromSession>>;
		let result2: Awaited<ReturnType<typeof getUserFromSession>>;

		await withRequestContext(async () => {
			result1 = await getUserFromSession(request);
			result2 = await getUserFromSession(request);
		});

		expect(result1).toBeUndefined();
		expect(result2).toBeUndefined();

		// DB queried only once even though both calls returned undefined
		expect(findFirstMock).toHaveBeenCalledTimes(1);
	});

	// Task 2.3 — no context active → each call hits the DB independently
	it("falls back to DB on every call when no withRequestContext scope is active", async () => {
		const request = makeRequest();

		// Two sequential calls with no withRequestContext wrapper
		const r1 = await getUserFromSession(request);
		const r2 = await getUserFromSession(request);

		expect(r1).toBeDefined();
		expect(r2).toBeDefined();

		// No cache — DB must be called twice
		expect(findFirstMock).toHaveBeenCalledTimes(2);
	});

	// Task 2.4 — lastActiveAt UPDATE fires exactly once per request scope
	it("executes the lastActiveAt UPDATE exactly once even when called twice inside a scope", async () => {
		const request = makeRequest();

		await withRequestContext(async () => {
			await getUserFromSession(request);
			await getUserFromSession(request);
		});

		// The where() terminator of the update chain fires exactly once
		expect(updateWhereMock).toHaveBeenCalledTimes(1);
	});

	// Concurrent callers — parallel loaders firing simultaneously within the same scope.
	// These tests would fail without the sessionCachePromise in-flight guard.
	it("hits the DB exactly once when two callers fire concurrently inside the same scope", async () => {
		const request = makeRequest();

		let result1: Awaited<ReturnType<typeof getUserFromSession>>;
		let result2: Awaited<ReturnType<typeof getUserFromSession>>;

		await withRequestContext(async () => {
			[result1, result2] = await Promise.all([
				getUserFromSession(request),
				getUserFromSession(request),
			]);
		});

		expect(result1).toBeDefined();
		expect(result2).toBeDefined();
		expect(result1!.sessionId).toBe(SESSION_ID);
		expect(result2!.sessionId).toBe(SESSION_ID);
		expect(findFirstMock).toHaveBeenCalledTimes(1);
	});

	it("caches unauthenticated result for concurrent callers: findFirst called once, both return undefined", async () => {
		findFirstMock.mockResolvedValue(null);
		const request = makeRequest();

		let result1: Awaited<ReturnType<typeof getUserFromSession>>;
		let result2: Awaited<ReturnType<typeof getUserFromSession>>;

		await withRequestContext(async () => {
			[result1, result2] = await Promise.all([
				getUserFromSession(request),
				getUserFromSession(request),
			]);
		});

		expect(result1).toBeUndefined();
		expect(result2).toBeUndefined();
		expect(findFirstMock).toHaveBeenCalledTimes(1);
	});
});
