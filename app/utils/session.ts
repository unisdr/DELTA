import {
	createCookieSessionStorage,
	Session,
	SessionStorage,
	SessionData,
} from "react-router";
import { dr } from "~/db.server";
import { getRequestContext } from "~/utils/requestContext.server";

import { InferSelectModel, eq, and } from "drizzle-orm";
import { sessionActivityTimeoutMinutes } from "~/utils/session-activity-config";
import { LangRouteParam } from "./lang.backend";
import { redirectLangFromRoute } from "./url.backend";
import { sessionTable } from "~/drizzle/schema/sessionTable";
import { userTable, userCountryAccountsTable } from "~/drizzle/schema";

export let _sessionCookie: SessionStorage<SessionData, SessionData> | null =
	null;
export let _superAdminSessionCookie: SessionStorage<
	SessionData,
	SessionData
> | null = null;

export function initCookieStorage() {
	// we also store session activity time in the database, so this can be much longer
	const cookieSessionExpiration = 60 * 60 * 1; // 1 hour
	if (!process.env.SESSION_SECRET) {
		throw "no SESSION_SECRET in .env";
	}

	// Regular user session cookie
	_sessionCookie = createCookieSessionStorage({
		cookie: {
			// Using __ in front of a name is a common pattern
			name: "__session",
			httpOnly: true,
			secure: process.env.NODE_ENV === "production", // Only send cookie over HTTPS in production
			// lax allows cookie on get request originating from other sites, so users would still be logged in
			sameSite: "lax",
			path: "/",
			secrets: [process.env.SESSION_SECRET],
			maxAge: cookieSessionExpiration,
		},
	});

	// Super admin session cookie - separate from regular user sessions
	_superAdminSessionCookie = createCookieSessionStorage({
		cookie: {
			name: "__super_admin_session",
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			secrets: [process.env.SESSION_SECRET],
			maxAge: cookieSessionExpiration,
		},
	});
}

export function sessionCookie(): SessionStorage<SessionData, SessionData> {
	if (!_sessionCookie) {
		throw "initCookieStorage was not called";
	}
	return _sessionCookie;
}

export function superAdminSessionCookie(): SessionStorage<
	SessionData,
	SessionData
> {
	if (!_superAdminSessionCookie) {
		throw "initCookieStorage was not called";
	}
	return _superAdminSessionCookie;
}

export async function createSuperAdminSession(superAdminId: string) {
	const session = await superAdminSessionCookie().getSession();
	session.set("superAdminId", superAdminId);
	const setCookie = await superAdminSessionCookie().commitSession(session);
	return {
		"Set-Cookie": setCookie,
	};
}

export async function getSuperAdminSession(
	request: Request,
): Promise<SuperAdminSession | undefined> {
	const session = await superAdminSessionCookie().getSession(
		request.headers.get("Cookie"),
	);
	const superAdminId = session.get("superAdminId");

	if (!superAdminId) return;

	if (typeof superAdminId != "string") return;

	return {
		superAdminId: superAdminId,
	};
}

export async function createUserSession(userId: string) {
	const sessionRow: typeof sessionTable.$inferInsert = {
		userId,
		lastActiveAt: new Date(),
	};

	const res = await dr.insert(sessionTable).values(sessionRow).returning();
	const sessionId = res[0].id;

	const session = await sessionCookie().getSession();
	session.set("sessionId", sessionId);

	const setCookie = await sessionCookie().commitSession(session);
	return {
		"Set-Cookie": setCookie,
	};
}

export type SetCookieResult = {
	"Set-Cookie": string;
};

export async function destroyUserSession(
	request: Request,
): Promise<SetCookieResult> {
	const cookieHeader = request.headers.get("Cookie");
	const session = await sessionCookie().getSession(cookieHeader);
	const sessionId = session.get("sessionId");

	// Keep logout idempotent: missing/invalid sessionId should still clear cookie.
	if (typeof sessionId === "string") {
		await dr.delete(sessionTable).where(eq(sessionTable.id, sessionId));
	}

	const setCookie = await sessionCookie().destroySession(session);
	return {
		"Set-Cookie": setCookie,
	};
}

export async function sessionMarkTotpAuthed(sessionId: string) {
	if (!sessionId) {
		return;
	}

	await dr
		.update(sessionTable)
		.set({ totpAuthed: true })
		.where(eq(sessionTable.id, sessionId));
}

export interface UserSession {
	user: InferSelectModel<typeof userTable>;
	sessionId: string;
	session: InferSelectModel<typeof sessionTable>;
}
export interface SuperAdminSession {
	superAdminId: string;
}

// Performs the full cookie + DB lookup and returns UserSession or null.
// null represents "no valid session" so the caller can distinguish
// "not yet fetched" (undefined in the cache) from "fetched, unauthenticated" (null).
async function resolveSession(request: Request): Promise<UserSession | null> {
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie"),
	);
	const sessionId = session.get("sessionId");

	if (!sessionId || typeof sessionId !== "string") {
		return null;
	}

	// TODO: currently sessions are not deleted when users are deleted, fix this

	const sessionData = await dr.query.sessionTable.findFirst({
		where: eq(sessionTable.id, sessionId),
		with: {
			user: true,
		},
	});

	if (!sessionData) {
		return null;
	}

	const now = new Date();
	const minutesSinceLastActivity =
		(now.getTime() - sessionData.lastActiveAt.getTime()) / (1000 * 60);

	if (minutesSinceLastActivity > sessionActivityTimeoutMinutes) {
		return null;
	}

	await dr
		.update(sessionTable)
		.set({ lastActiveAt: now })
		.where(eq(sessionTable.id, sessionId));

	return {
		user: sessionData.user,
		sessionId: sessionId,
		session: sessionData,
	};
}

export async function getUserFromSession(
	request: Request,
): Promise<UserSession | undefined> {
	// Check the per-request cache before hitting the DB. Within a single
	// withRequestContext() scope this avoids redundant session queries — e.g.
	// authLoaderWithPerm calls getUserFromSession twice per request (once via
	// requireUser and again via getUserRoleFromSession). See ADR-004 for the
	// broader request-context strategy.
	const ctx = getRequestContext();

	// Fast path: resolved cache (sequential second+ call within the same scope).
	if (ctx !== undefined && ctx.sessionCache !== undefined) {
		// ctx.sessionCache is UserSession | null here; convert null → undefined
		// because this function's return type is Promise<UserSession | undefined>.
		return ctx.sessionCache ?? undefined;
	}

	// Concurrent path: a parallel loader already started the DB lookup.
	// Await the same promise instead of issuing a second query.
	if (ctx !== undefined && ctx.sessionCachePromise !== undefined) {
		return (await ctx.sessionCachePromise) ?? undefined;
	}

	// No resolved cache and no in-flight lookup. Store the promise before
	// awaiting it so any concurrent caller that arrives now waits on this
	// promise rather than starting another DB round-trip.
	const lookupPromise = resolveSession(request);
	if (ctx !== undefined) {
		ctx.sessionCachePromise = lookupPromise;
	}

	try {
		const result = await lookupPromise;
		if (ctx !== undefined) {
			ctx.sessionCache = result;
		}
		return result ?? undefined;
	} finally {
		// Always clear the in-flight marker so a rejection doesn't leave a
		// permanently-stale rejected Promise in the store.
		if (ctx !== undefined) {
			ctx.sessionCachePromise = undefined;
		}
	}
}

export function flashMessage(session: Session, message: FlashMessage) {
	session.flash("flashMessageText", message.text);
	session.flash("flashMessageType", message.type);
}

type FlashMessageType =
	| "info"
	| "error"
	| "success"
	| "warn"
	| "secondary"
	| "contrast";

export interface FlashMessage {
	type: FlashMessageType;
	text: string;
}

export function getFlashMessage(session: Session): FlashMessage | undefined {
	const text = session.get("flashMessageText");
	if (!text) {
		return;
	}
	const type = session.get("flashMessageType");
	return {
		text: text,
		type: type,
	};
}

export async function redirectWithMessage(
	routeArgs: { request: Request } & LangRouteParam,
	url: string,
	message: FlashMessage,
) {
	const { request } = routeArgs;
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie"),
	);
	flashMessage(session, message);
	return redirectLangFromRoute(routeArgs, url, {
		headers: {
			"Set-Cookie": await sessionCookie().commitSession(session),
		},
	});
}

export async function getCountrySettingsFromSession(request: Request) {
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie"),
	);
	return session.get("countrySettings");
}

export async function getUserRoleFromSession(request: Request) {
	const userSession = await getUserFromSession(request);
	if (!userSession) return;

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) return;

	const userCountryAccount = await dr.query.userCountryAccountsTable.findFirst({
		where: and(
			eq(userCountryAccountsTable.userId, userSession.user.id),
			eq(userCountryAccountsTable.countryAccountsId, countryAccountsId),
		),
	});

	return userCountryAccount?.role;
}

export async function getCountryAccountsIdFromSession(request: Request) {
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie"),
	);
	return session.get("countryAccountsId");
}

export async function getUserIdFromSession(request: Request) {
	const userSession = await getUserFromSession(request);
	return userSession?.user?.id;
}
