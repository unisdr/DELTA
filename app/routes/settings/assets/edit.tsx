import { useLoaderData } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { PERMISSIONS } from "~/frontend/user/roles";
import {
	authActionWithPerm,
	requirePermission,
} from "~/utils/auth";
import {
	getCountryAccountsIdFromSession,
	redirectWithMessage,
} from "~/utils/session";
import {
	makeGetAssetByIdUseCase,
	makeSaveAssetUseCase,
} from "~/modules/assets/assets-module.server";
import { contentPickerConfigSector } from "~/modules/assets/presentation/sector-picker-config";
import { dr } from "~/db.server";
import { AssetForm, ASSETS_ROUTE } from "~/modules/assets/presentation/asset-form";
import { formScreen } from "~/frontend/form";

const fieldsDef = [
	{ key: "sectorIds" as const, label: "Sector", type: "other" as const },
	{ key: "name" as const, label: "Name", type: "text" as const, required: true },
	{ key: "category" as const, label: "Category", type: "text" as const },
	{ key: "nationalId" as const, label: "National ID", type: "text" as const },
	{ key: "notes" as const, label: "Notes", type: "textarea" as const },
];

export const loader = async (args: LoaderFunctionArgs) => {
	const { request, params } = args;
	await requirePermission(
		request,
		params.id === "new" ? PERMISSIONS.ASSETS_CREATE : PERMISSIONS.ASSETS_UPDATE,
	);

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (params.id === "new") {
		return { item: null, fieldsDef, selectedDisplay: {} };
	}

	const item = await makeGetAssetByIdUseCase().execute({ id: params.id! });
	if (!item) {
		throw new Response("Asset not found", { status: 404 });
	}
	if (item.isBuiltIn || item.countryAccountsId !== countryAccountsId) {
		throw new Response("Asset not accessible for editing", { status: 403 });
	}

	const selectedDisplay = await contentPickerConfigSector().selectedDisplay(
		dr,
		item.sectorIds || "",
	);

	return { item, fieldsDef, selectedDisplay };
};

export const action = authActionWithPerm(
	PERMISSIONS.ASSETS_CREATE,
	async (actionArgs: ActionFunctionArgs) => {
		const { request, params } = actionArgs;
		const countryAccountsId = await getCountryAccountsIdFromSession(request);
		if (!countryAccountsId) {
			throw new Response("Unauthorized", { status: 401 });
		}

		const formData = await request.formData();
		const id = params.id ?? null;
		const isNew = !id || id === "new";

		if (!isNew) {
			await requirePermission(request, PERMISSIONS.ASSETS_UPDATE);
		}

		const result = await makeSaveAssetUseCase().execute({
			id,
			countryAccountsId,
			name: String(formData.get("name") || "").trim(),
			category: String(formData.get("category") || "").trim(),
			notes: String(formData.get("notes") || "").trim(),
			sectorIds: String(formData.get("sectorIds") || "").trim(),
			nationalId:
				String(formData.get("nationalId") || "").trim() || null,
		});

		return redirectWithMessage(
			actionArgs,
			`${ASSETS_ROUTE}/${result.id}`,
			{ type: "success", text: isNew ? "Asset created" : "Asset updated" },
		);
	},
);

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const selectedDisplay = ld.selectedDisplay || {};

	return formScreen({
		extraData: { fieldDef: ld.fieldsDef, selectedDisplay },
		fieldsInitial: ld.item ? { ...ld.item } : {},
		form: AssetForm,
		edit: !!ld.item,
		id: ld.item?.id || undefined,
	});
}
