import {
	lossesByIdAndCountryAccountsId,
	fieldsDefView,
} from "~/backend.server/models/losses";

import { LossesView } from "~/frontend/losses";

import { useLoaderData } from "react-router";
import { authLoaderWithPerm } from "~/utils/auth";




import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/utils/session";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {

	const { params, request } = loaderArgs;
	const settings = await getCountrySettingsFromSession(request);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	let currencies = [""];
	if (settings) {
		currencies = [settings.currencyCode];
	}
	if (!params.id) {
		throw new Response("Missing item ID", { status: 400 });
	}
	const item = await lossesByIdAndCountryAccountsId(params.id, countryAccountsId);
	if (!item) {
		throw new Response("Not Found", { status: 404 });
	}
	return {
		item,
		fieldDef: await fieldsDefView(currencies),
	};
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	if (!ld.item) {
		throw "invalid";
	}

	return <LossesView fieldDef={ld.fieldDef} item={ld.item} />;
}
