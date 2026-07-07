/**
 * PinoLogger — production ILogger adapter backed by Pino (ADR-004).
 */
import pino from "pino";
import type { ILogger } from "~/shared/logging/ILogger";
import { getRequestContext } from "~/utils/requestContext.server";

export class PinoLogger implements ILogger {
	constructor(private readonly logger: pino.Logger) {}

	info(data: Record<string, unknown>): void {
		this.logger.info(data);
	}

	warn(data: Record<string, unknown>): void {
		this.logger.warn(data);
	}

	error(data: Record<string, unknown>): void {
		this.logger.error(data);
	}

	debug(data: Record<string, unknown>): void {
		this.logger.debug(data);
	}
}

/** Pino `mixin` — merges request context into each log line; exported so tests reuse it. */
export function contextMixin(): Record<string, unknown> {
	const ctx = getRequestContext();
	return ctx
		? { traceId: ctx.traceId, tenantId: ctx.tenantId, userId: ctx.userId }
		: {};
}

/** Exported so tests assert this exact array. Wildcards only redact one level deep (fast-redact has no recursive glob) — see design.md Risks. */
export const REDACT_PATHS = [
	"req.headers.authorization",
	"req.headers.cookie",
	"*.password",
	"*.token",
	"*.secret",
];

/**
 * Module-level base Pino instance — constructed exactly once at module load.
 */
const basePinoInstance = pino({
	level: process.env.NODE_ENV === "production" ? "info" : "debug",
	transport:
		process.env.NODE_ENV !== "production"
			? { target: "pino-pretty" }
			: undefined,
	timestamp: () => `,"time":"${new Date().toISOString()}"`,
	redact: REDACT_PATHS,
	mixin: contextMixin,
});

// Memoized wrapper around basePinoInstance — constructed once, returned by
// every getPinoLogger() call (see the ILogger export below).
const pinoLoggerSingleton: ILogger = new PinoLogger(basePinoInstance);

/**
 * Singleton accessor for code that runs before any NestJS DI container exists
 * for the request.
 */
export function getPinoLogger(): ILogger {
	return pinoLoggerSingleton;
}

/**
 * Test-only accessor for the module-level base Pino instance.
 */
export function __getBasePinoInstanceForTest(): pino.Logger {
	return basePinoInstance;
}
