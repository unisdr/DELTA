import { describe, expect, it, vi } from "vitest";
import type { ILogger } from "~/shared/logging";
import { NoOpLogger } from "~/shared/logging";

// ---------------------------------------------------------------------------
// ilogger-port — structural type check via NoOpLogger assignment
// ---------------------------------------------------------------------------
describe("ILogger interface (structural type check via NoOpLogger)", () => {
	it("NoOpLogger is assignable to ILogger", () => {
		// TypeScript structural typing: if this compiles, ILogger shape is satisfied.
		const logger: ILogger = new NoOpLogger();
		expect(logger).toBeDefined();
	});

	it("ILogger variable holds a NoOpLogger instance", () => {
		const logger: ILogger = new NoOpLogger();
		expect(logger instanceof NoOpLogger).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// noop-logger — all four methods callable, no throw, no output
// ---------------------------------------------------------------------------
describe("NoOpLogger", () => {
	describe("constructibility", () => {
		it("constructs with no arguments without throwing", () => {
			expect(() => new NoOpLogger()).not.toThrow();
		});
	});

	describe("info method", () => {
		it("does not throw when called with a populated record", () => {
			const logger = new NoOpLogger();
			expect(() => logger.info({ msg: "test", value: 42 })).not.toThrow();
		});

		it("does not throw when called with an empty record", () => {
			const logger = new NoOpLogger();
			expect(() => logger.info({})).not.toThrow();
		});

		it("produces no console output", () => {
			const spy = vi.spyOn(console, "log").mockImplementation(() => {});
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const logger = new NoOpLogger();
			logger.info({ msg: "test" });
			expect(spy).not.toHaveBeenCalled();
			expect(warnSpy).not.toHaveBeenCalled();
			expect(errorSpy).not.toHaveBeenCalled();
			spy.mockRestore();
			warnSpy.mockRestore();
			errorSpy.mockRestore();
		});
	});

	describe("warn method", () => {
		it("does not throw when called with a populated record", () => {
			const logger = new NoOpLogger();
			expect(() => logger.warn({ msg: "test", code: "W001" })).not.toThrow();
		});

		it("does not throw when called with an empty record", () => {
			const logger = new NoOpLogger();
			expect(() => logger.warn({})).not.toThrow();
		});
	});

	describe("error method", () => {
		it("does not throw when called with a populated record", () => {
			const logger = new NoOpLogger();
			expect(() =>
				logger.error({ msg: "test", err: "something failed" }),
			).not.toThrow();
		});

		it("does not throw when called with an empty record", () => {
			const logger = new NoOpLogger();
			expect(() => logger.error({})).not.toThrow();
		});

		it("produces no console output on error call", () => {
			const spy = vi.spyOn(console, "error").mockImplementation(() => {});
			const logger = new NoOpLogger();
			logger.error({ msg: "catastrophic", err: "oops" });
			expect(spy).not.toHaveBeenCalled();
			spy.mockRestore();
		});
	});

	describe("debug method", () => {
		it("does not throw when called with a populated record", () => {
			const logger = new NoOpLogger();
			expect(() => logger.debug({ msg: "test", detail: true })).not.toThrow();
		});

		it("does not throw when called with an empty record", () => {
			const logger = new NoOpLogger();
			expect(() => logger.debug({})).not.toThrow();
		});
	});
});

// ---------------------------------------------------------------------------
// logging-barrel — named imports resolve at runtime
// ---------------------------------------------------------------------------
describe("Barrel export (~/shared/logging)", () => {
	it("exports ILogger (resolvable as a type — verified by the import above)", () => {
		// If the import at the top of this file compiled and resolved, ILogger is exported.
		// We verify NoOpLogger (the only runtime value) here; ILogger is type-only.
		expect(NoOpLogger).toBeDefined();
	});

	it("exports NoOpLogger as a constructible class", () => {
		expect(typeof NoOpLogger).toBe("function");
	});

	it("NoOpLogger imported from barrel satisfies ILogger", () => {
		const logger: ILogger = new NoOpLogger();
		expect(logger).toBeInstanceOf(NoOpLogger);
	});
});
