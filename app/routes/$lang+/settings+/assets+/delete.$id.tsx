import { useCallback } from "react";
import { redirect } from "react-router";
import {
	useLoaderData,
	useActionData,
	useNavigation,
	useNavigate,
	Form as RRForm,
} from "react-router";
import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { BackendContext } from "~/backend.server/context";
import { AssetRepository } from "~/db/queries/assetRepository";
import { ViewContext } from "~/frontend/context";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Message } from "primereact/message";

// ── Loader ───────────────────────────────────────────────────────────────────

export const loader = authLoaderWithPerm("EditData", async (args) => {
	const { request, params } = args;
	const id = params.id;
	if (!id) throw new Response("Missing ID", { status: 400 });

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const ctx = new BackendContext(args);

	const item = await AssetRepository.findById(id, countryAccountsId, ctx.lang);
	if (!item) throw new Response("Asset not found", { status: 404 });
	if (item.isBuiltIn)
		throw new Response("Built-in assets cannot be deleted", { status: 403 });

	return { item };
});

// ── Action ───────────────────────────────────────────────────────────────────

type ActionResult = {
	ok: boolean;
	error?: string;
};

export const action = authActionWithPerm("EditData", async (args) => {
	const { request, params } = args;
	const id = params.id;
	if (!id) throw new Response("Missing ID", { status: 400 });

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const lang = params.lang as string;

	const result = await AssetRepository.deleteById(id, countryAccountsId);

	if (!result.ok) {
		return { ok: false, error: result.error } satisfies ActionResult;
	}

	return redirect(`/${lang}/settings/assets`);
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function DeleteAssetPage() {
	const { item } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const navigate = useNavigate();
	const ctx = new ViewContext();

	const isSubmitting = navigation.state === "submitting";
	const onHide = useCallback(
		() => navigate(`/${ctx.lang}/settings/assets`),
		[navigate, ctx.lang],
	);

	const footer = (
		<div className="flex justify-end gap-2">
			<Button
				label={ctx.t({ code: "common.cancel", msg: "Cancel" })}
				icon="pi pi-times"
				outlined
				onClick={onHide}
				disabled={isSubmitting}
			/>
			<Button
				type="submit"
				form="delete-asset-form"
				icon="pi pi-trash"
				severity="danger"
				label={ctx.t({ code: "common.delete", msg: "Delete" })}
				loading={isSubmitting}
				disabled={isSubmitting}
			/>
		</div>
	);

	return (
		<Dialog
			visible
			onHide={onHide}
			header={ctx.t({ code: "common.delete", msg: "Delete" })}
			footer={footer}
			style={{ width: "440px" }}
			closable={!isSubmitting}
		>
			{actionData && !actionData.ok && actionData.error && (
				<Message
					className="mb-4 w-full"
					severity="error"
					text={actionData.error}
				/>
			)}

			<p className="text-gray-700">
				{ctx.t({
					code: "common.confirm_delete",
					msg: "Are you sure you want to delete this asset? This action cannot be undone.",
				})}
			</p>
			<p className="mt-2 font-semibold text-gray-800">{item.name}</p>

			<RRForm method="post" id="delete-asset-form" />
		</Dialog>
	);
}
