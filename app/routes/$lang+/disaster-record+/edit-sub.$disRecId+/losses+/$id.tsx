import {
	lossesByIdAndCountryAccountsId,
	fieldsDefView,
} from "~/backend.server/models/losses";

import { LossesView } from "~/frontend/losses";

import { useLoaderData } from "react-router";
import { authLoaderWithPerm } from "~/utils/auth";

import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/utils/session";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const ctx = new BackendContext(loaderArgs);
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
	const item = await lossesByIdAndCountryAccountsId(ctx, params.id, countryAccountsId);
	if (!item) {
		throw new Response("Not Found", { status: 404 });
	}
	return {
		item,
		fieldDef: await fieldsDefView(ctx, currencies),
	};
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	if (!ld.item) {
		throw "invalid";
	}
	const ctx = new ViewContext();
	return <LossesView ctx={ctx} fieldDef={ld.fieldDef} item={ld.item} />;
}
