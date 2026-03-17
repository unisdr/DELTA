import { useState } from "react";
import { Form, useActionData, useNavigate, useNavigation } from "react-router";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";

import { BackendContext } from "~/backend.server/context";
import { OrganizationService } from "~/services/organizationService";
import { authActionWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession, redirectWithMessage } from "~/utils/session";
import { ViewContext } from "~/frontend/context";

export const action = authActionWithPerm("ManageOrganizations", async (args) => {
	const { request } = args;
	const formData = await request.formData();
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const backendCtx = new BackendContext(args);

	formData.set("intent", "create");

	const result = await OrganizationService.organizationAction({
		backendCtx,
		countryAccountsId,
		formData,
	});

	if (result.ok) {
		return redirectWithMessage(args, "/settings/organizations", {
			type: "success",
			text: backendCtx.t({ code: "common.new_record_created", msg: "New record created" }),
		});
	}

	return result;
});

export default function OrganizationsNewPage() {
	const ctx = new ViewContext();
	const actionData = useActionData<typeof action>();
	const navigate = useNavigate();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";
	const nameError = actionData && !actionData.ok ? actionData.error : "";
	const [newName, setNewName] = useState("");

	return (
		<Dialog
			header={ctx.t({ code: "organizations.add", msg: "Add organization" })}
			visible
			modal
			onHide={() => navigate(ctx.url("/settings/organizations/"))}
			className="w-[32rem] max-w-full"
		>
			<Form method="post" className="flex flex-col" noValidate>
				<p className="mb-3 text-red-700">* Required information</p>
				<div className="mb-3 flex flex-col gap-2">
					<label htmlFor="create-organization-name">
						<span className="inline-flex gap-1">
							<span>{ctx.t({ code: "common.name", msg: "Name" })}</span>
							<span className="text-red-700">*</span>
						</span>
					</label>
					<InputText
						id="create-organization-name"
						name="name"
						value={newName}
						invalid={!!nameError}
						aria-invalid={nameError ? true : false}
						onChange={(e) => {
							setNewName(e.target.value);
						}}
					/>
					{nameError ? <small className="text-red-700">{nameError}</small> : null}
				</div>
				<div className="mt-4 flex justify-end gap-2">
					<Button
						type="button"
						outlined
						label={ctx.t({ code: "common.cancel", msg: "Cancel" })}
						onClick={() => navigate(ctx.url("/settings/organizations/"))}
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