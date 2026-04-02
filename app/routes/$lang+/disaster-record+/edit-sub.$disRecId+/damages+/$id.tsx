import {
	damagesByIdAndCountryAccountsId,
	fieldsDefView
} from "~/backend.server/models/damages";

import { DamagesView } from "~/frontend/damages";

import { getCountryAccountsIdFromSession, getCountrySettingsFromSession } from "~/utils/session";

import { ViewContext } from "~/frontend/context";

import { authLoaderWithPerm } from "~/utils/auth";
import { useLoaderData } from "react-router";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const ctx = new BackendContext(loaderArgs);
	const { params, request } = loaderArgs;
	const settings = await getCountrySettingsFromSession(request);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!settings) {
		throw new Response("Unauthorized access", { status: 401 });
	}
	const currencies = settings.currencyCode ? [settings.currencyCode] : ["USD"];
	if (!params.id) {
		throw new Response("Missing item ID", { status: 400 });
	}
	const item = await damagesByIdAndCountryAccountsId(ctx, params.id, countryAccountsId);
	if (!item) {
		throw new Response("Not Found", { status: 404 });
	}
	return {
		item,
		def: await fieldsDefView(ctx, currencies),
	};
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();

	if (!ld.item) {
		throw "invalid";
	}
	if (!ld.def) {
		throw "def missing";
	}
	return <DamagesView ctx={ctx} item={ld.item} def={ld.def} />;
}
