import { assetById, fieldsDefView } from "~/backend.server/models/asset";

import { AssetView } from "~/frontend/asset";

import { dr } from "~/db.server";
import { contentPickerConfigSector } from "~/frontend/asset-content-picker-config";
import { getCountryAccountsIdFromSession } from "~/utils/session";

import { ViewContext } from "~/frontend/context";

import { getItem2 } from "~/backend.server/handlers/view";
import { useLoaderData } from "react-router";
import { authLoaderWithPerm } from "~/utils/auth";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const ctx = new BackendContext(loaderArgs);
	const { request, params } = loaderArgs;
	const countryAccountId = await getCountryAccountsIdFromSession(request);

	const item = await getItem2(ctx, params, assetById);

	// Built-in assets are accessible to all tenants; instance-owned assets require tenant match
	if (item.isBuiltIn !== true && item.countryAccountsId !== countryAccountId) {
		throw new Response("Asset not accessible for this tenant", { status: 403 });
	}

	const selectedDisplay = await contentPickerConfigSector(ctx).selectedDisplay(
		dr,
		item.sectorIds || "",
	);

	return {
		item,
		def: await fieldsDefView(ctx),
		selectedDisplay,
	};
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	if (!ld.item) {
		throw new Error("Asset data missing");
	}
	if (!ld.def) {
		throw new Error("Field definitions missing");
	}
	return <AssetView ctx={ctx} item={ld.item} def={ld.def} />;
}
