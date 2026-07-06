import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock ~/utils/session — the middleware's only external dependency besides
// requestContext.server itself.
// ---------------------------------------------------------------------------
const { getUserFromSessionMock, getCountryAccountsIdFromSessionMock } =
	vi.hoisted(() => ({
		getUserFromSessionMock: vi.fn(),
		getCountryAccountsIdFromSessionMock: vi.fn(),
	}));

vi.mock("~/utils/session", () => ({
	getUserFromSession: getUserFromSessionMock,
	getCountryAccountsIdFromSession: getCountryAccountsIdFromSessionMock,
}));

// ---------------------------------------------------------------------------
// Mock ~/infrastructure/logging/PinoLogger.server so tests can spy on the
// singleton's error() method directly.
// ---------------------------------------------------------------------------
const { pinoErrorMock } = vi.hoisted(() => ({
	pinoErrorMock: vi.fn(),
}));

vi.mock("~/infrastructure/logging/PinoLogger.server", () => ({
	getPinoLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: pinoErrorMock,
		debug: vi.fn(),
	}),
}));

import { requestContextMiddleware } from "~/middleware/requestContext.server";
import { getRequestContext } from "~/utils/requestContext.server";
import type { Route } from "../../../app/+types/root";

function makeArgs(): Route.MiddlewareFunction extends (
	args: infer A,
	next: infer _N,
) => unknown
	? A
	: never {
	return { request: new Request("http://localhost/") } as ReturnType<
		typeof makeArgs
	>;
}

describe("requestContextMiddleware", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		pinoErrorMock.mockClear();
	});

	it("makes traceId/tenantId/userId visible via getRequestContext() from inside the next stub", async () => {
		getUserFromSessionMock.mockResolvedValue({ user: { id: "user-1" } });
		getCountryAccountsIdFromSessionMock.mockResolvedValue("tenant-1");

		let captured: ReturnType<typeof getRequestContext>;
		const next = vi.fn(async () => {
			captured = getRequestContext();
			return new Response();
		});

		await requestContextMiddleware(makeArgs(), next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(captured).not.toBeUndefined();
		expect(typeof captured!.traceId).toBe("string");
		expect(captured!.traceId.length).toBeGreaterThan(0);
		expect(captured!.userId).toBe("user-1");
		expect(captured!.tenantId).toBe("tenant-1");
	});

	it("produces a different traceId on two separate invocations", async () => {
		getUserFromSessionMock.mockResolvedValue(undefined);
		getCountryAccountsIdFromSessionMock.mockResolvedValue(undefined);

		let traceId1: string | undefined;
		let traceId2: string | undefined;

		await requestContextMiddleware(makeArgs(), async () => {
			traceId1 = getRequestContext()!.traceId;
			return new Response();
		});
		await requestContextMiddleware(makeArgs(), async () => {
			traceId2 = getRequestContext()!.traceId;
			return new Response();
		});

		expect(traceId1).toBeDefined();
		expect(traceId2).toBeDefined();
		expect(traceId1).not.toBe(traceId2);
	});

	it("resolves non-null userId/tenantId for an authenticated request", async () => {
		getUserFromSessionMock.mockResolvedValue({ user: { id: "user-42" } });
		getCountryAccountsIdFromSessionMock.mockResolvedValue("tenant-42");

		let captured: ReturnType<typeof getRequestContext>;
		await requestContextMiddleware(makeArgs(), async () => {
			captured = getRequestContext();
			return new Response();
		});

		expect(captured!.userId).toBe("user-42");
		expect(captured!.tenantId).toBe("tenant-42");
	});

	it("results in userId: null / tenantId: null for an unauthenticated request and still calls next()", async () => {
		getUserFromSessionMock.mockResolvedValue(undefined);
		getCountryAccountsIdFromSessionMock.mockResolvedValue(undefined);

		let captured: ReturnType<typeof getRequestContext>;
		const next = vi.fn(async () => {
			captured = getRequestContext();
			return new Response();
		});

		await requestContextMiddleware(makeArgs(), next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(captured!.userId).toBeNull();
		expect(captured!.tenantId).toBeNull();
	});

	it("does not propagate a rejected getUserFromSession/getCountryAccountsIdFromSession promise, falls back to null, and still calls next()", async () => {
		getUserFromSessionMock.mockRejectedValue(new Error("transient DB error"));
		getCountryAccountsIdFromSessionMock.mockRejectedValue(
			new Error("transient DB error"),
		);

		let captured: ReturnType<typeof getRequestContext>;
		const next = vi.fn(async () => {
			captured = getRequestContext();
			return new Response();
		});

		await expect(
			requestContextMiddleware(makeArgs(), next),
		).resolves.not.toThrow();

		expect(next).toHaveBeenCalledTimes(1);
		expect(captured!.userId).toBeNull();
		expect(captured!.tenantId).toBeNull();
	});

	it("logs a rejected getUserFromSession via getPinoLogger().error, not console.error", async () => {
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		const rejectionError = new Error("transient DB error");
		getUserFromSessionMock.mockRejectedValue(rejectionError);
		getCountryAccountsIdFromSessionMock.mockResolvedValue("tenant-1");

		await requestContextMiddleware(makeArgs(), async () => new Response());

		// Asserts on both `err` and `reason`
		expect(pinoErrorMock).toHaveBeenCalledWith(
			expect.objectContaining({ err: rejectionError, reason: rejectionError }),
		);
		expect(consoleErrorSpy).not.toHaveBeenCalled();

		consoleErrorSpy.mockRestore();
	});

	it("logs a rejected getCountryAccountsIdFromSession via getPinoLogger().error, not console.error", async () => {
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		const rejectionError = new Error("transient DB error");
		getUserFromSessionMock.mockResolvedValue({ user: { id: "user-1" } });
		getCountryAccountsIdFromSessionMock.mockRejectedValue(rejectionError);

		await requestContextMiddleware(makeArgs(), async () => new Response());

		expect(pinoErrorMock).toHaveBeenCalledWith(
			expect.objectContaining({ err: rejectionError, reason: rejectionError }),
		);
		expect(consoleErrorSpy).not.toHaveBeenCalled();

		consoleErrorSpy.mockRestore();
	});
});
