import { assetById, fieldsDefView } from "~/backend.server/models/asset";

import { AssetView } from "~/frontend/asset";

import { dr } from "~/db.server";
import { contentPickerConfigSector } from "~/frontend/asset-content-picker-config";
import { getCountryAccountsIdFromSession } from "~/util/session";

import { ViewContext } from "~/frontend/context";


import { getItem2 } from "~/backend.server/handlers/view";
import { useLoaderData } from "react-router";
import { authLoaderWithPerm } from "~/util/auth";
import { BackendContext } from "~/backend.server/context";


export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const ctx = new BackendContext(loaderArgs);
	const { request, params } = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const item = await getItem2(ctx, params, assetById);
	if (!item) {
		throw new Response("Not Found", { status: 404 });
	}
	const selectedDisplay = await contentPickerConfigSector(ctx).selectedDisplay(
		dr,
		item?.sectorIds || ""
	);

	// Allow built-in assets globally; enforce tenant on instance-owned assets
	if (item && item.isBuiltIn !== true && item.countryAccountsId !== countryAccountsId) {
		throw new Response("Unauthorized access", { status: 401 });
	}
	return {
		item,
		def: await fieldsDefView(ctx),
		selectedDisplay
	}
})

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
		<AssetView
			ctx={ctx}
			item={ld.item}
			def={ld.def}
		/>
	);
}

