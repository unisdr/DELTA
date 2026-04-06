import {
	devExample1ById,
	fieldsDefView,
} from "~/backend.server/models/dev_example1";

import { DevExample1View } from "~/frontend/dev_example1";



import { getItem2 } from "~/backend.server/handlers/view";
import { useLoaderData } from "react-router";
import { authLoaderWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";


export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {

	const { request, params } = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const item = await getItem2(params, devExample1ById);
	if (!item) {
		throw new Response("Not Found", { status: 404 });
	}
	if (item && item.countryAccountsId !== countryAccountsId) {
		throw new Response("unauthorized", { status: 401 });
	}
	return {
		item,
		def: await fieldsDefView(),
	};
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();

	if (!ld.item) {
		throw "invalid";
	}
	if (!ld.def) {
		throw "def missing";
	}
	return <DevExample1View item={ld.item} def={ld.def} />;
}
