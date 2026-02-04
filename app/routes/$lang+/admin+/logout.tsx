import type { ActionFunction, LoaderFunctionArgs } from "react-router";
import { LangRouteParam } from "~/util/lang.backend";
import { superAdminSessionCookie } from "~/util/session";
import { redirectLangFromRoute } from "~/util/url.backend";

// Handle both GET and POST requests for logout
export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	return await handleLogout(loaderArgs);
};

export const action: ActionFunction = async (actionArgs) => {
	return await handleLogout(actionArgs);
};

async function handleLogout(routeArgs: {request: Request} & LangRouteParam ) {
	const {request} = routeArgs
	const session = await superAdminSessionCookie().getSession(
		request.headers.get("Cookie")
	);
	// Destroy ONLY the super admin session cookie, leaving regular user sessions intact
	return redirectLangFromRoute(routeArgs, "/admin/login", {
		headers: {
			"Set-Cookie": await superAdminSessionCookie().destroySession(session),
		},
	});
}

// This component won't be rendered since we always redirect
export default function SuperAdminLogout() {
	return null;
}
