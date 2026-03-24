import { useState } from "react";
import { Form, useActionData, useLoaderData, useNavigate, useNavigation } from "react-router";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";

import { BackendContext } from "~/backend.server/context";
import { OrganizationRepository } from "~/db/queries/organizationRepository";
import { OrganizationService } from "~/services/organizationService";
import { authActionWithPerm, authLoaderPublicOrWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession, redirectWithMessage } from "~/utils/session";
import { ViewContext } from "~/frontend/context";

export const loader = authLoaderPublicOrWithPerm(
	"ManageOrganizations",
	async (loaderArgs) => {
		const { request } = loaderArgs;
		const countryAccountsId = (await getCountryAccountsIdFromSession(request))!;
		const selectedOrganization =
			(await OrganizationRepository.getByIdAndCountryAccountsId(
				loaderArgs.params.id!,
				countryAccountsId,
			)) ?? null;

		if (!selectedOrganization) {
			throw new Response("Not Found", { status: 404 });
		}

		return { selectedOrganization };
	},
);

export const action = authActionWithPerm("ManageOrganizations", async (args) => {
	const { request } = args;
	const formData = await request.formData();
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const backendCtx = new BackendContext(args);

	formData.set("intent", "update");
	if (args.params.id) {
		formData.set("id", args.params.id);
	}

	const result = await OrganizationService.organizationAction({
		backendCtx,
		countryAccountsId,
		formData,
	});

	if (result.ok) {
		return redirectWithMessage(args, "/settings/organizations", {
			type: "success",
			text: backendCtx.t({ code: "common.changes_saved", msg: "Changes saved" }),
		});
	}

	return result;
});

export default function OrganizationsEditPage() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const actionData = useActionData<typeof action>();
	const navigate = useNavigate();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";
	const selectedItem = ld.selectedOrganization;
	const nameError = actionData && !actionData.ok ? actionData.error : "";
	const [editName, setEditName] = useState(selectedItem?.name ?? "");

	return (
		<Dialog
			header={ctx.t({ code: "organizations.edit", msg: "Edit organization" })}
			visible
			modal
			onHide={() => navigate(ctx.url("/settings/organizations/"))}
			className="w-[32rem] max-w-full"
		>
			<Form method="post" className="flex flex-col" noValidate>
				<p className="mb-3 text-red-700">* Required information</p>
				<div className="mb-3 flex flex-col gap-2">
					<label htmlFor="edit-organization-name">
						<span className="inline-flex gap-1">
							<span>{ctx.t({ code: "common.name", msg: "Name" })}</span>
							<span className="text-red-700">*</span>
						</span>
					</label>
					<InputText
						id="edit-organization-name"
						name="name"
						value={editName}
						invalid={!!nameError}
						aria-invalid={nameError ? true : false}
						onChange={(e) => {
							setEditName(e.target.value);
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