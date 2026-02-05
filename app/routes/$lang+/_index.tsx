import { LoaderFunctionArgs } from "react-router";
import { redirectLangFromRoute } from "~/utils/url.backend";

export const loader = async (args: LoaderFunctionArgs) => {
	return redirectLangFromRoute(args, "/hazardous-event")
};


