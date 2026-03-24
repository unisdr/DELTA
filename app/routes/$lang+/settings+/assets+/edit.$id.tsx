import {
	assetCreate,
	assetUpdateByIdAndCountryAccountsId,
	assetById,
	assetByIdTx,
	fieldsDef,
} from "~/backend.server/models/asset";

import { AssetForm, route } from "~/frontend/asset";

import { formScreen } from "~/frontend/form";

import { createOrUpdateAction } from "~/backend.server/handlers/form/form";
import { getTableName } from "drizzle-orm";
import { assetTable } from "~/drizzle/schema/assetTable";
import { useLoaderData } from "react-router";
import { authLoaderWithPerm } from "~/utils/auth";

import { dr } from "~/db.server";
import { contentPickerConfigSector } from "~/frontend/asset-content-picker-config";
import { ActionFunctionArgs } from "react-router";
import { getCountryAccountsIdFromSession } from "~/utils/session";

import { ViewContext } from "~/frontend/context";
import { BackendContext } from "~/backend.server/context";

export const action = async (args: ActionFunctionArgs) => {
	const ctx = new BackendContext(args);
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	return createOrUpdateAction({
		fieldsDef: async () => await fieldsDef(ctx),
		create: assetCreate,
		update: (ctx, tx, id, data, countryAccountsId) =>
			assetUpdateByIdAndCountryAccountsId(ctx, tx, id, countryAccountsId, data),
		getById: assetByIdTx,
		redirectTo: (id) => `${route}/${id}`,
		tableName: getTableName(assetTable),
		action: (isCreate) => (isCreate ? "Create asset" : "Update asset"),
		countryAccountsId,
	})(args);
};

export const loader = authLoaderWithPerm("EditData", async (args) => {
	const ctx = new BackendContext(args);
	const { request, params } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const url = new URL(request.url);
	const sectorId = url.searchParams.get("sectorId") || null;
	const extra = {
		fieldsDef: await fieldsDef(ctx),
		sectorId,
	};

	if (params.id === "new") {
		return {
			item: null,
			...extra,
		};
	}

	const item = await assetById(ctx, params.id!);

	// Built-in assets cannot be edited; enforce tenant ownership
	if (item.isBuiltIn === true || item.countryAccountsId !== countryAccountsId) {
		throw new Response("Asset not accessible for editing", { status: 403 });
	}

	const selectedDisplay = await contentPickerConfigSector(ctx).selectedDisplay(
		dr,
		item.sectorIds || "",
	);

	return {
		item,
		...extra,
		selectedDisplay,
	};
});

export default function Screen() {
	let ld = useLoaderData<typeof loader>();
	let ctx = new ViewContext();

	let fieldsInitial = ld.item ? { ...ld.item } : {};
	if ("sectorId" in fieldsInitial && !fieldsInitial.sectorId && ld.sectorId) {
		fieldsInitial.sectorId = ld.sectorId;
	}

	// @ts-ignore
	const selectedDisplay = ld?.selectedDisplay || {};

	return formScreen({
		ctx,
		extraData: {
			fieldDef: ld.fieldsDef,
			selectedDisplay,
		},
		fieldsInitial,
		form: AssetForm,
		edit: !!ld.item,
		id: ld.item?.id || undefined,
	});
}
