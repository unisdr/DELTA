import { LoaderFunctionArgs } from "react-router";

import { logout } from "~/utils/auth";
import { redirectLangFromRoute } from "~/utils/url.backend";

export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	const { request } = loaderArgs;

	try {
		const headers = await logout(request);
		return redirectLangFromRoute(loaderArgs, "/", { headers });
	} catch (error) {
		return redirectLangFromRoute(loaderArgs, "/user/login/");
	}
};
