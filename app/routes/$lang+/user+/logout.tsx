import {
	LoaderFunctionArgs,
} from "@remix-run/node";

import {logout} from "~/util/auth";
import { redirectLangFromRoute } from "~/util/url.backend";

export const loader = async (loaderArgs:LoaderFunctionArgs) => {
	const {request} = loaderArgs;
	const headers = await logout(request);
	return redirectLangFromRoute(loaderArgs, "/", { headers });
};

