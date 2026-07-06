/**
 * PinoLogger — production ILogger adapter backed by Pino (ADR-004).
 */
import pino from "pino";
import type { ILogger } from "~/shared/logging/ILogger";
import { getRequestContext } from "~/utils/requestContext.server";

export class PinoLogger implements ILogger {
	constructor(private readonly logger: pino.Logger) {}

	info(data: Record<string, unknown>): void {
		this.withContext().info(data);
	}

	warn(data: Record<string, unknown>): void {
		this.withContext().warn(data);
	}

	error(data: Record<string, unknown>): void {
		this.withContext().error(data);
	}

	debug(data: Record<string, unknown>): void {
		this.withContext().debug(data);
	}

	/**
	 * Returns a logger enriched with the active request's traceId/tenantId/userId,
	 * or the base logger unchanged when no request scope is active.
	 */
	private withContext(): pino.Logger {
		const ctx = getRequestContext();
		if (!ctx) {
			return this.logger;
		}
		return this.logger.child({
			traceId: ctx.traceId,
			tenantId: ctx.tenantId,
			userId: ctx.userId,
		});
	}
}

/**
 * Redact paths exported so tests assert against this exact array.
 *
 * WHY these wildcards only redact one level deep: Pino's `redact` option is
 * backed by `fast-redact`, which does not support a recursive/glob wildcard 
 */
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
