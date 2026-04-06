import { ActionFunctionArgs } from "react-router";

import { logout } from "~/utils/auth";
import { redirectLangFromRoute } from "~/utils/url.backend";

export const action = async (actionArgs: ActionFunctionArgs) => {
	const { request } = actionArgs;

	try {
		const headers = await logout(request);
		const url = new URL(request.url);
		const redirectTo = url.searchParams.get("redirectTo");
		if (redirectTo && redirectTo.startsWith("/")) {
			return redirectLangFromRoute(actionArgs, redirectTo, { headers });
		}
		return redirectLangFromRoute(actionArgs, "/", { headers });
	} catch (error) {
		return redirectLangFromRoute(actionArgs, "/user/login/");
	}
};
