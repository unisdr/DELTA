import { damagesById, fieldsDefView } from "~/backend.server/models/damages";

import { DamagesView } from "~/frontend/damages";

import { getCountrySettingsFromSession } from "~/util/session";

import { ViewContext } from "~/frontend/context";


import { getItem2 } from "~/backend.server/handlers/view";
import { authLoaderWithPerm } from "~/util/auth";
import { useLoaderData } from "@remix-run/react";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const ctx = new BackendContext(loaderArgs);
	const { params, request } = loaderArgs;
	const settings = await getCountrySettingsFromSession(request);

	if (!settings) {
		throw new Response("Unauthorized access", { status: 401 });
	}
	const currencies = settings.currencyCode ? [settings.currencyCode] : ["USD"];

	const item = await getItem2(ctx, params, damagesById);
	if (!item) {
		throw new Response("Not Found", { status: 404 });
	}
	return {
		
		item,
		def: await fieldsDefView(ctx, currencies)
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
	return (
		<DamagesView
			ctx={ctx}
			item={ld.item}
			def={ld.def}
		/>
	);
}
