import { useLoaderData } from "react-router";

import { authLoaderWithPerm } from "~/utils/auth";
import { PERMISSIONS } from "~/frontend/user/roles";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import {
	makeGetAssetByIdUseCase,
} from "~/modules/assets/assets-module.server";
import { contentPickerConfigSector } from "~/modules/assets/presentation/sector-picker-config";
import { dr } from "~/db.server";
import { AssetView } from "~/modules/assets/presentation/asset-view";

export const loader = authLoaderWithPerm(
	PERMISSIONS.ASSETS_LIST,
	async (loaderArgs) => {
		const { request, params } = loaderArgs;
		const countryAccountsId = await getCountryAccountsIdFromSession(request);

		const item = await makeGetAssetByIdUseCase().execute({
			id: params.id ?? "",
		});
		if (!item) {
			throw new Response("Asset not found", { status: 404 });
		}

		if (item.isBuiltIn !== true && item.countryAccountsId !== countryAccountsId) {
			throw new Response("Asset not accessible for this tenant", {
				status: 403,
			});
		}

		const sectorDisplay = await contentPickerConfigSector().selectedDisplay(
			dr,
			item.sectorIds || "",
		);

		return { item, sectorDisplay };
	},
);

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	return <AssetView item={ld.item} sectorDisplay={ld.sectorDisplay} />;
}
