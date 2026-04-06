import { Form, MetaFunction, useActionData, useLoaderData, useNavigate, useNavigation } from "react-router";
import { useState } from "react";
import { getCountryRole, getCountryRoles } from "~/frontend/user/roles";
import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import {
	getCountrySettingsFromSession,
	getCountryAccountsIdFromSession,
	getUserFromSession,
	redirectWithMessage,
} from "~/utils/session";
import "react-toastify/dist/ReactToastify.css";
import { htmlTitle } from "~/utils/htmlmeta";
import { OrganizationRepository } from "~/db/queries/organizationRepository";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { AccessManagementService, AccessManagementServiceError } from "~/services/accessManagementService";

export const meta: MetaFunction = () => {
	return [
		{
			title: htmlTitle("Adding New User"),
		},
		{
			name: "description",
			content: "Invite User",
		},
	];
};

export const loader = authLoaderWithPerm("InviteUsers", async (args) => {
	const { request } = args;

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const organizations = await OrganizationRepository.getByCountryAccountsId(countryAccountsId);

	return {
		organizations
	};
});

export const action = authActionWithPerm("InviteUsers", async (actionArgs) => {
	const { request } = actionArgs;
	const loggedInUser = await getUserFromSession(request);
	const formData = await request.formData();
	const email = (formData.get("email") as string) || "";
	let organization = formData.get("organization") as string | null;
	const role = (formData.get("role") as string) || "";

	organization = organization && organization.trim() !== ""
		? organization
		: null;

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const countrySettings = await getCountrySettingsFromSession(request);

	try {
		await AccessManagementService.inviteUser({
			email,
			organization,
			role,
			countryAccountsId,
			countrySettings,
			loggedInUserEmail: loggedInUser?.user.email,
		});
	} catch (error) {
		if (error instanceof AccessManagementServiceError && error.fieldErrors) {
			return { ok: false, errors: error.fieldErrors };
		}
		throw error;
	}

	return redirectWithMessage(actionArgs, "/settings/access-mgmnt/", {
		type: "info",
		text: "User has been successfully added!",
	});
});

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors;
	const roles = getCountryRoles();
	const navigate = useNavigate();

	const navigation = useNavigation();
	const isSubmitting =
		navigation.state === "submitting";

	const [selectedRole, setSelectedRole] = useState("");
	const [selectedOrganization, setSelectedOrganization] = useState("");

	const roleObj = getCountryRole(selectedRole);

	return (
		<Dialog
			visible
			modal
			header={"Add user"}
			onHide={() => navigate("/settings/access-mgmnt/")}
			className="w-[42rem] max-w-full"
		>
			<Form method="post" className="flex flex-col gap-6" noValidate>
				<div className="flex flex-col gap-2">
					<label htmlFor="email" className="font-semibold text-gray-800">
						{"Email address"}
						<span className="text-red-500"> *</span>
					</label>

					<InputText
						id="email"
						type="email"
						name="email"
						className="w-full"
						placeholder={"Enter Email"}
						required
						invalid={!!errors?.email}
					/>

					{errors?.email && (
						<small className="text-sm text-red-500">
							{errors.email}
						</small>
					)}
				</div>

				<div className="flex flex-col gap-2">
					<label htmlFor="organization" className="font-semibold text-gray-800">
						{"Organization"}
					</label>

					<Dropdown
						inputId="organization"
						value={selectedOrganization}
						name="organization"
						onChange={(e) => setSelectedOrganization(e.value ?? "")}
						options={loaderData.organizations}
						optionLabel="name"
						optionValue="id"
						placeholder="Select an organization"
						showClear
						className="w-full"
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label htmlFor="role" className="font-semibold text-gray-800">
						{"Role"}
						<span className="text-red-500"> *</span>
					</label>

					<Dropdown
						inputId="role"
						value={selectedRole}
						name="role"
						onChange={(e) => setSelectedRole(e.value ?? "")}
						options={roles}
						optionLabel="label"
						optionValue="id"
						showClear
						placeholder="Select a role"
						className="w-full"
						invalid={!!errors?.role}
					/>

					{errors?.role && (
						<small className="text-sm text-red-500">
							{errors.role}
						</small>
					)}
				</div>

				<div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
					<div className="text-lg font-semibold text-gray-800">
						{"You have selected [{role}]"}
					</div>

					{roleObj?.desc && (
						<div className="mt-4 text-gray-700">
							{"A {label} is able to:"}
							<br />
							<span className="italic text-gray-600">
								{roleObj.desc}
							</span>
						</div>
					)}
				</div>

				<div className="flex justify-end gap-2">
					<Button
						type="button"
						outlined
						label={"Cancel"}
						onClick={() => navigate("/settings/access-mgmnt/")}
					/>
					<Button
						type="submit"
						label={"Invite user"}
						icon="pi pi-sign-in"
						loading={isSubmitting}
						disabled={isSubmitting}
					/>
				</div>
			</Form>
		</Dialog>
	);
}
