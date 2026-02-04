import { LoaderFunctionArgs } from "react-router";

import {logout} from "~/util/auth";
import { redirectLangFromRoute } from "~/util/url.backend";

export const loader = async (loaderArgs:LoaderFunctionArgs) => {
	const {request} = loaderArgs;

	try {
		const headers = await logout(request);
		return redirectLangFromRoute(loaderArgs, "/", { headers });
	} catch (error) {
		return redirectLangFromRoute(loaderArgs, "/user/login/");
	}
};

