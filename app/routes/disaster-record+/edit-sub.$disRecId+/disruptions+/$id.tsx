import {
	disruptionByIdAndCountryAccountsId,
	getFieldsDefView,
} from "~/backend.server/models/disruption";

import { DisruptionView } from "~/frontend/disruption";

import { useLoaderData } from "react-router";
import { authLoaderWithPerm } from "~/utils/auth";




import { getCountryAccountsIdFromSession } from "~/utils/session";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {

	const { params, request } = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!params.id) {
		throw new Response("Missing item ID", { status: 400 });
	}
	const item = await disruptionByIdAndCountryAccountsId(params.id, countryAccountsId);
	if (!item) {
		throw new Response("Not Found", { status: 404 });
	}
	return {
		item,
		fieldDef: await getFieldsDefView(),
	};
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	if (!ld.item) {
		throw "invalid";
	}

	return <DisruptionView fieldDef={ld.fieldDef} item={ld.item} />;
}
