import { useActionData, useLoaderData, useNavigate, useNavigation } from "react-router";
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
import EditAssetDialog from "~/modules/assets/presentation/edit-asset-dialog";

export const loader = async (args: LoaderFunctionArgs) => {
	const { request, params } = args;
	await requirePermission(
		request,
		params.id === "new" ? PERMISSIONS.ASSETS_CREATE : PERMISSIONS.ASSETS_UPDATE,
	);

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const item = await makeGetAssetByIdUseCase().execute({ id: params.id! });
	if (!item) {
		throw new Response("Asset not found", { status: 404 });
	}
	if (item.isBuiltIn || item.countryAccountsId !== countryAccountsId) {
		throw new Response("Asset not accessible for editing", { status: 403 });
	}

	return { item };

};

export const action = authActionWithPerm(
	PERMISSIONS.ASSETS_UPDATE,
	async (actionArgs: ActionFunctionArgs) => {
		const { request, params } = actionArgs;
		const countryAccountsId = await getCountryAccountsIdFromSession(request);
		if (!countryAccountsId) {
			throw new Response("Unauthorized", { status: 401 });
		}

		const formData = await request.formData();
		const id = params.id ?? null;
		await requirePermission(request, PERMISSIONS.ASSETS_UPDATE);
		const sectorIds =
			formData
				.getAll("sectorIds")
				.map((value) => String(value || "").trim())
				.filter(Boolean)
				.at(-1) || "";

		const fields = {
			name: String(formData.get("name") || "").trim(),
			category: String(formData.get("category") || "").trim(),
			notes: String(formData.get("notes") || "").trim(),
			sectorIds,
			nationalId: String(formData.get("nationalId") || "").trim() || null,
		};

		const result = await makeSaveAssetUseCase().execute({
			id,
			countryAccountsId,
			...fields,
		});

		if (!result.ok) {
			return {
				ok: false,
				data: fields,
				errors: {
					fields: {
						name: [result.error],
					},
				},
			};
		}

		return redirectWithMessage(
			actionArgs,
			`/settings/assets/${result.id}`,
			{ type: "success", text: "Asset updated" },
		);
	},
);

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigate = useNavigate();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";
	const actionNameError =
		actionData && !actionData.ok
			? actionData.errors?.fields?.name?.[0] || ""
			: "";
	const nameValue =
		actionData && !actionData.ok
			? String(actionData.data?.name || "")
			: ld.item.name;

	return (
		<EditAssetDialog
			item={ld.item}
			nameValue={nameValue}
			nameError={actionNameError}
			isSubmitting={isSubmitting}
			onHide={() => navigate(`/settings/assets`)}
		/>
	);
}
