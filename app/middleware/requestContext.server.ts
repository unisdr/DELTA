/**
 * Root-level React Router v7 middleware that opens exactly one `withRequestContext` scope per HTTP request
 * Registered from `app/root.tsx`'s `middleware` export so it runs for every request
 */

import type { Route } from "../+types/root";
import {
	withRequestContext,
	getRequestContext,
} from "~/utils/requestContext.server";
import {
	getUserFromSession,
	getCountryAccountsIdFromSession,
} from "~/utils/session";
import { getPinoLogger } from "~/infrastructure/logging/PinoLogger.server";

export const requestContextMiddleware: Route.MiddlewareFunction = (
	{ request },
	next,
) => {
	const traceId = crypto.randomUUID();

	return withRequestContext(
		async () => {
			// Promise.allSettled, allSettled ensures a failure in one (e.g. a transient DB error)
			// never prevents the other from populating and never rejects this callback
			const [userResult, tenantIdResult] = await Promise.allSettled([
				getUserFromSession(request),
				getCountryAccountsIdFromSession(request),
			]);

			// Log rejections so recurring session-lookup failures are visible,
			// without letting them block the request
			if (userResult.status === "rejected") {
				getPinoLogger().error({
					msg: "requestContextMiddleware: getUserFromSession failed",
					err: userResult.reason,
					reason: userResult.reason,
				});
			}
			if (tenantIdResult.status === "rejected") {
				getPinoLogger().error({
					msg: "requestContextMiddleware: getCountryAccountsIdFromSession failed",
					err: tenantIdResult.reason,
					reason: tenantIdResult.reason,
				});
			}

			// Mutate the live store (not a second als.run()) so tenantId/userId land
			// on the same store instance traceId was seeded into.
			const ctx = getRequestContext();
			if (ctx) {
				ctx.userId =
					userResult.status === "fulfilled"
						? (userResult.value?.user.id ?? null)
						: null;
				ctx.tenantId =
					tenantIdResult.status === "fulfilled"
						? (tenantIdResult.value ?? null)
						: null;
			}

			return next();
		},
		{ traceId },
	);
};
