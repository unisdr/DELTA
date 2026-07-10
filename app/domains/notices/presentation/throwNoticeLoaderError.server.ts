import { DomainError } from "~/shared/errors/DomainError";
import type { ErrorResponse } from "~/shared/errors/ErrorResponse";
import { getRequestContext } from "~/utils/requestContext.server";
import { getPinoLogger } from "~/infrastructure/logging/PinoLogger.server";

/**
 * Shared error handling for the notices loaders 
 */
export function throwNoticeLoaderError(
	err: unknown,
	context: { logMsg: string; url: string },
): never {
	if (err instanceof DomainError) {
		throw Response.json(
			{
				success: false,
				error: {
					code: err.code,
					message: err.message,
					...(err.context !== undefined ? { details: err.context } : {}),
					traceId: getRequestContext()?.traceId ?? crypto.randomUUID(),
					timestamp: new Date().toISOString(),
				},
			} satisfies ErrorResponse,
			{ status: err.statusHint },
		);
	}
	getPinoLogger().error({ msg: context.logMsg, err, url: context.url });
	throw err;
}
