import { useEffect, useRef, useState } from "react";
import { Form, useActionData, useLoaderData, useNavigate, useNavigation } from "react-router";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";

import { BackendContext } from "~/backend.server/context";
import { ApiKeyRepository } from "~/db/queries/apiKeyRepository";
import { authActionWithPerm, authLoaderPublicOrWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession, redirectWithMessage } from "~/utils/session";
import { ViewContext } from "~/frontend/context";

export const loader = authLoaderPublicOrWithPerm("EditAPIKeys", async (loaderArgs) => {
	const { request } = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const selectedApiKey = (await ApiKeyRepository.getById(loaderArgs.params.id!)) ?? null;

	if (!selectedApiKey || selectedApiKey.countryAccountsId !== countryAccountsId) {
		throw new Response("Not Found", { status: 404 });
	}

	return { selectedApiKey };
});

export const action = authActionWithPerm("EditAPIKeys", async (actionArgs) => {
	const { request, params } = actionArgs;
	const backendCtx = new BackendContext(actionArgs);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!params.id) {
		return { ok: false, error: "Missing ID" };
	}

	const existing = await ApiKeyRepository.getById(params.id);
	if (!existing || existing.countryAccountsId !== countryAccountsId) {
		throw new Response("Not Found", { status: 404 });
	}

	await ApiKeyRepository.delete(params.id);

	return redirectWithMessage(actionArgs, "/settings/api-key", {
		type: "success",
		text: backendCtx.t({ code: "common.record_deleted", msg: "Record deleted" }),
	});
});

export default function ApiKeyDeletePage() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const actionData = useActionData<typeof action>();
	const navigate = useNavigate();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";
	const selectedItem = ld.selectedApiKey;
	const toast = useRef<Toast>(null);
	const [dialogVisible, setDialogVisible] = useState(true);

	useEffect(() => {
		if (actionData && typeof actionData === "object" && "ok" in actionData && !actionData.ok) {
			toast.current?.show({
				severity: "error",
				summary: ctx.t({ code: "common.error", msg: "Error" }),
				detail: (actionData as any).error || "Unknown error",
				life: 6000,
			});
		}
	}, [actionData, ctx]);

	return (
		<>
			<Toast ref={toast} />
			<Dialog
				header={ctx.t({
					code: "common.record_deletion",
					msg: "Record Deletion",
				})}
				visible={dialogVisible}
				modal
				onHide={() => navigate(ctx.url("/settings/api-key/"))}
				className="w-[30rem] max-w-full"
			>
				<Form method="post" onSubmit={() => setDialogVisible(false)}>
					<p>
						{ctx.t({
							code: "common.confirm_deletion",
							msg: "Please confirm deletion.",
						})}
					</p>
					{selectedItem?.name ? <p>{selectedItem.name}</p> : null}
					<div className="mt-4 flex justify-end gap-2">
						<Button
							type="button"
							outlined
							label={ctx.t({ code: "common.cancel", msg: "Cancel" })}
							onClick={() => navigate(ctx.url("/settings/api-key/"))}
						/>
						<Button
							type="submit"
							severity="danger"
							label={ctx.t({ code: "common.delete", msg: "Delete" })}
							icon="pi pi-trash"
							loading={isSubmitting}
							disabled={isSubmitting}
						/>
					</div>
				</Form>
			</Dialog>
		</>
	);
}
