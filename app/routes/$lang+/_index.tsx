import { LoaderFunctionArgs } from "@remix-run/node";
import { redirectLangFromRoute } from "~/util/url.backend";

export const loader = async (args: LoaderFunctionArgs) => {
	return redirectLangFromRoute(args, "/hazardous-event")
};


