import { useState } from "react";
import { Form, useActionData, useLoaderData, useNavigate, useNavigation } from "react-router";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";

import { BackendContext } from "~/backend.server/context";
import { ApiKeyRepository } from "~/db/queries/apiKeyRepository";
import {
	authActionGetAuth,
	authActionWithPerm,
	authLoaderWithPerm,
} from "~/utils/auth";
import {
	getCountryAccountsIdFromSession,
	redirectWithMessage,
} from "~/utils/session";

import { ViewContext } from "~/frontend/context";

export const loader = authLoaderWithPerm("EditAPIKeys", async () => {
	return {};
});

export const action = authActionWithPerm("EditAPIKeys", async (actionArgs) => {
	const { request } = actionArgs;
	const backendCtx = new BackendContext(actionArgs);
	const auth = authActionGetAuth(actionArgs);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const formData = await request.formData();
	const name = (formData.get("name") as string | null)?.trim() ?? "";

	if (!name) {
		return { ok: false, error: backendCtx.t({ code: "common.name_required", msg: "Name is required" }) };
	}

	await ApiKeyRepository.create({
		name,
		managedByUserId: auth.user?.id,
		countryAccountsId,
	});

	return redirectWithMessage(actionArgs, "/settings/api-key", {
		type: "success",
		text: backendCtx.t({ code: "common.changes_saved", msg: "Changes saved" }),
	});
});

export default function ApiKeyNewPage() {
	useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const navigate = useNavigate();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";

	const [nameValue, setNameValue] = useState("");

	const nameError = actionData && !actionData.ok ? actionData.error : "";

	return (
		<Dialog
			header={ctx.t({
				code: "api_keys.add_new",
				msg: "Add new API key",
			})}
			visible
			modal
			onHide={() => navigate(ctx.url("/settings/api-key/"))}
			className="w-[32rem] max-w-full"
		>
			<Form method="post" className="flex flex-col" noValidate>
				<p className="mb-3 text-red-700">* Required information</p>
				<div className="mb-3 flex flex-col gap-2">
					<label htmlFor="create-api-key-name">
						<span className="inline-flex gap-1">
							<span>{ctx.t({ code: "common.name", msg: "Name" })}</span>
							<span className="text-red-700">*</span>
						</span>
					</label>
					<InputText
						id="create-api-key-name"
						name="name"
						value={nameValue}
						invalid={!!nameError}
						aria-invalid={nameError ? true : false}
						onChange={(e) => setNameValue(e.target.value)}
					/>
					{nameError ? <small className="text-red-700">{nameError}</small> : null}
				</div>
				<div className="mt-4 flex justify-end gap-2">
					<Button
						type="button"
						outlined
						label={ctx.t({ code: "common.cancel", msg: "Cancel" })}
						onClick={() => navigate(ctx.url("/settings/api-key/"))}
					/>
					<Button
						type="submit"
						label={ctx.t({ code: "common.save", msg: "Save" })}
						icon="pi pi-check"
						loading={isSubmitting}
						disabled={isSubmitting}
					/>
				</div>
			</Form>
		</Dialog>
	);
}
