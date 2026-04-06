import { useState } from "react";
import { Form, useActionData, useNavigate, useNavigation } from "react-router";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";


import { OrganizationService } from "~/services/organizationService";
import { authActionWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession, redirectWithMessage } from "~/utils/session";


export const action = authActionWithPerm("ManageOrganizations", async (args) => {
	const { request } = args;
	const formData = await request.formData();
	const countryAccountsId = await getCountryAccountsIdFromSession(request);


	formData.set("intent", "create");

	const result = await OrganizationService.organizationAction({

		countryAccountsId,
		formData,
	});

	if (result.ok) {
		return redirectWithMessage(args, "/settings/organizations", {
			type: "success",
			text: "New record created",
		});
	}

	return result;
});

export default function OrganizationsNewPage() {

	const actionData = useActionData<typeof action>();
	const navigate = useNavigate();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";
	const nameError = actionData && !actionData.ok ? actionData.error : "";
	const [newName, setNewName] = useState("");

	return (
		<Dialog
			header={"Add organization"}
			visible
			modal
			onHide={() => navigate("/settings/organizations/")}
			className="w-[32rem] max-w-full"
		>
			<Form method="post" className="flex flex-col" noValidate>
				<p className="mb-3 text-red-700">* Required information</p>
				<div className="mb-3 flex flex-col gap-2">
					<label htmlFor="create-organization-name">
						<span className="inline-flex gap-1">
							<span>{"Name"}</span>
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
						label={"Cancel"}
						onClick={() => navigate("/settings/organizations/")}
					/>
					<Button
						type="submit"
						label={"Save"}
						icon="pi pi-check"
						loading={isSubmitting}
						disabled={isSubmitting}
					/>
				</div>
			</Form>
		</Dialog>
	);
}