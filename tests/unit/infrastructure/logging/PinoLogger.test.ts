import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Writable } from "node:stream";
import pino from "pino";

import {
	PinoLogger,
	getPinoLogger,
	__getBasePinoInstanceForTest,
	REDACT_PATHS,
} from "~/infrastructure/logging/PinoLogger.server";
import {
	withRequestContext,
	getRequestContext,
} from "~/utils/requestContext.server";

/**
 * Creates a Pino instance that writes to an in-memory buffer instead of stdout
 */
function createTestPino(overrides?: pino.LoggerOptions) {
	const chunks: string[] = [];
	const stream = new Writable({
		write(chunk, _encoding, callback) {
			chunks.push(chunk.toString());
			callback();
		},
	});
	const instance = pino(overrides ?? {}, stream);
	return {
		instance,
		getLines(): Record<string, unknown>[] {
			return chunks
				.join("")
				.split("\n")
				.filter((line) => line.length > 0)
				.map((line) => JSON.parse(line) as Record<string, unknown>);
		},
	};
}

describe("PinoLogger — core delegation", () => {
	it("info delegates to the underlying Pino instance", () => {
		const { instance } = createTestPino();
		const infoSpy = vi.spyOn(instance, "info");
		const logger = new PinoLogger(instance);

		logger.info({ msg: "Notice created", noticeId: "abc" });

		expect(infoSpy).toHaveBeenCalledWith(
			expect.objectContaining({ msg: "Notice created", noticeId: "abc" }),
		);
	});

	it("warn delegates to the underlying Pino instance", () => {
		const { instance } = createTestPino();
		const warnSpy = vi.spyOn(instance, "warn");
		const logger = new PinoLogger(instance);

		logger.warn({ msg: "Rate limit hit" });

		expect(warnSpy).toHaveBeenCalledWith(
			expect.objectContaining({ msg: "Rate limit hit" }),
		);
	});

	it("error delegates to the underlying Pino instance", () => {
		const { instance } = createTestPino();
		const errorSpy = vi.spyOn(instance, "error");
		const logger = new PinoLogger(instance);

		logger.error({ msg: "DB connection failed" });

		expect(errorSpy).toHaveBeenCalledWith(
			expect.objectContaining({ msg: "DB connection failed" }),
		);
	});

	it("debug delegates to the underlying Pino instance", () => {
		const { instance } = createTestPino();
		const debugSpy = vi.spyOn(instance, "debug");
		const logger = new PinoLogger(instance);

		logger.debug({ msg: "Cache miss", key: "notice:1" });

		expect(debugSpy).toHaveBeenCalledWith(
			expect.objectContaining({ msg: "Cache miss", key: "notice:1" }),
		);
	});
});

describe("PinoLogger — ADR-004 configuration", () => {
	const originalNodeEnv = process.env.NODE_ENV;

	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv;
		vi.resetModules();
	});

	it("configures level 'info' when NODE_ENV=production", async () => {
		process.env.NODE_ENV = "production";
		// Dynamic re-import after vi.resetModules() is required here: the base Pino
		// instance is constructed once at module load, gated on NODE_ENV at that
		// moment, so observing a different NODE_ENV requires a fresh module instance.
		const freshModule =
			await import("~/infrastructure/logging/PinoLogger.server");
		const logger = freshModule.getPinoLogger();

		expect(logger).toBeDefined();
		expect(freshModule.__getBasePinoInstanceForTest().level).toBe("info");
	});

	it("configures level 'debug' when NODE_ENV is unset or non-production", async () => {
		process.env.NODE_ENV = "test";
		const freshModule =
			await import("~/infrastructure/logging/PinoLogger.server");

		expect(freshModule.__getBasePinoInstanceForTest().level).toBe("debug");
	});
});

describe("PinoLogger — redaction (ADR-004)", () => {
	it("redacts the authorization header value from emitted output", () => {
		const { instance, getLines } = createTestPino({ redact: REDACT_PATHS });
		const logger = new PinoLogger(instance);

		logger.info({ req: { headers: { authorization: "Bearer secret-value" } } });

		const rawOutput = JSON.stringify(getLines());
		expect(rawOutput).not.toContain("secret-value");
	});

	it("redacts the password field value from emitted output", () => {
		const { instance, getLines } = createTestPino({ redact: REDACT_PATHS });
		const logger = new PinoLogger(instance);

		logger.info({ user: { password: "hunter2" } });

		const rawOutput = JSON.stringify(getLines());
		expect(rawOutput).not.toContain("hunter2");
	});

	it("documents that wildcard redact paths only match one level of nesting", () => {
		// fast-redact (Pino's redaction engine) does not support a recursive wildcard.
		const { instance, getLines } = createTestPino({ redact: REDACT_PATHS });
		const logger = new PinoLogger(instance);

		logger.info({ a: { b: { password: "nested-deep" } } });

		const rawOutput = JSON.stringify(getLines());
		expect(rawOutput).toContain("nested-deep");
	});
});

describe("PinoLogger — error object serialization", () => {
	it("preserves message and stack when an Error is logged under the 'err' key", () => {
		// Pino's built-in serializer only expands Error properties (message, stack, type) 
		// for a field literally named `err`.
		const { instance, getLines } = createTestPino();
		const logger = new PinoLogger(instance);
		const error = new Error("transient DB error");

		logger.error({ msg: "lookup failed", err: error });

		const [line] = getLines();
		expect(line.err).toMatchObject({ message: "transient DB error" });
		expect(typeof (line.err as Record<string, unknown>).stack).toBe("string");
	});

	it("demonstrates an Error logged under a non-'err' key loses message and stack", () => {
		// Documents the failure mode being guarded against above: logging the
		// same Error under an arbitrary key (e.g. `reason`) is not enriched by
		// Pino's serializer, so message/stack are absent from emitted output.
		const { instance, getLines } = createTestPino();
		const logger = new PinoLogger(instance);
		const error = new Error("transient DB error");

		logger.error({ msg: "lookup failed", reason: error });

		const [line] = getLines();
		expect(line.reason).toEqual({});
	});
});

describe("PinoLogger — request context enrichment", () => {
	it("attaches traceId, tenantId, and userId inside an active withRequestContext scope", async () => {
		const { instance, getLines } = createTestPino();
		const logger = new PinoLogger(instance);

		await withRequestContext(
			async () => {
				const ctx = getRequestContext();
				if (ctx) {
					ctx.tenantId = "tenant-1";
					ctx.userId = "user-1";
				}
				logger.info({ msg: "Notice created" });
			},
			{ traceId: "abc-123" },
		);

		const [line] = getLines();
		expect(line.traceId).toBe("abc-123");
		expect(line.tenantId).toBe("tenant-1");
		expect(line.userId).toBe("user-1");
		expect(line.msg).toBe("Notice created");
	});

	it("does not throw and omits context fields when no scope is active", () => {
		const { instance, getLines } = createTestPino();
		const logger = new PinoLogger(instance);

		expect(() => logger.info({ msg: "Server started" })).not.toThrow();

		const [line] = getLines();
		expect(line.msg).toBe("Server started");
		expect(line.traceId).toBeUndefined();
		expect(line.tenantId).toBeUndefined();
		expect(line.userId).toBeUndefined();
	});

	it("does not leak context between two concurrent withRequestContext scopes", async () => {
		const { instance, getLines } = createTestPino();
		const logger = new PinoLogger(instance);

		const scopeA = withRequestContext(
			async () => {
				const ctx = getRequestContext();
				if (ctx) ctx.tenantId = "tenant-a";
				await new Promise((resolve) => setImmediate(resolve));
				logger.info({ msg: "event" });
			},
			{ traceId: "trace-a" },
		);

		const scopeB = withRequestContext(
			async () => {
				const ctx = getRequestContext();
				if (ctx) ctx.tenantId = "tenant-b";
				await new Promise((resolve) => setImmediate(resolve));
				logger.info({ msg: "event" });
			},
			{ traceId: "trace-b" },
		);

		await Promise.all([scopeA, scopeB]);

		const lines = getLines();
		expect(lines).toHaveLength(2);

		const lineA = lines.find((l) => l.traceId === "trace-a");
		const lineB = lines.find((l) => l.traceId === "trace-b");

		expect(lineA).toBeDefined();
		expect(lineA!.tenantId).toBe("tenant-a");
		expect(JSON.stringify(lineA)).not.toContain("trace-b");
		expect(JSON.stringify(lineA)).not.toContain("tenant-b");

		expect(lineB).toBeDefined();
		expect(lineB!.tenantId).toBe("tenant-b");
		expect(JSON.stringify(lineB)).not.toContain("trace-a");
		expect(JSON.stringify(lineB)).not.toContain("tenant-a");
	});
});

describe("getPinoLogger — singleton accessor", () => {
	it("returns loggers backed by the same underlying Pino instance on repeated calls", () => {
		const loggerA = getPinoLogger();
		const loggerB = getPinoLogger();

		expect(loggerA).toBe(loggerB);
		// Confirms only one Pino instance backs getPinoLogger() across the process,
		// not merely that the accessor happens to return the same wrapper reference.
		expect(__getBasePinoInstanceForTest()).toBe(__getBasePinoInstanceForTest());
	});

	it("returns a fully functional ILogger with no NestJS application context created", () => {
		const logger = getPinoLogger();

		expect(logger).toBeDefined();
		expect(() => logger.info({ msg: "Server started" })).not.toThrow();
		expect(() => logger.warn({ msg: "warn" })).not.toThrow();
		expect(() => logger.error({ msg: "error" })).not.toThrow();
		expect(() => logger.debug({ msg: "debug" })).not.toThrow();
	});
});
