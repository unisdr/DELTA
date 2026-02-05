import { LoaderFunctionArgs } from "react-router";
import { redirectLangFromRoute } from "~/util/url.backend";

export const loader = async (args: LoaderFunctionArgs) => {
	return redirectLangFromRoute(args, "/hazardous-event")
};


