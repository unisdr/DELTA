import { Form, MetaFunction, useNavigate, useNavigation } from "react-router";
import { useLoaderData, useActionData } from "react-router";
import { getCountryRoles } from "~/frontend/user/roles";
import { authLoaderWithPerm, authActionWithPerm } from "~/utils/auth";
import {
	redirectWithMessage,
	getCountryAccountsIdFromSession,
} from "~/utils/session";
import { format } from "date-fns";
import { useState } from "react";
import {
	getUserCountryAccountsByUserIdAndCountryAccountsId,
} from "~/db/queries/userCountryAccountsRepository";

import { htmlTitle } from "~/utils/htmlmeta";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { UserRepository } from "~/db/queries/UserRepository";
import { OrganizationRepository } from "~/db/queries/organizationRepository";
import { Dialog } from "primereact/dialog";
import { AccessManagementService, AccessManagementServiceError } from "~/services/accessManagementService";

export const meta: MetaFunction = () => {
	return [
		{
			title: htmlTitle(
				"Edit User",
			),
		},
		{
			name: "description",
			content: "Edit User",
		},
	];
};

export const loader = authLoaderWithPerm("EditUsers", async (loaderArgs) => {
	const { request, params } = loaderArgs;
	const { id } = params;
	if (!id) {
		throw new Response("Missing user ID", { status: 404 });
	}
	const user = await UserRepository.getById(id);
	if (!user) {
		throw new Response(`User not found with id :${id}`);
	}
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const userCountryAccount =
		await getUserCountryAccountsByUserIdAndCountryAccountsId(
			id,
			countryAccountsId,
		);
	const organizations =
		await OrganizationRepository.getByCountryAccountsId(countryAccountsId);

	if (!userCountryAccount) {
		throw new Response(
			`User with id: ${id} is not assigned to the current instance.`,
			{ status: 404 },
		);
	}

	return {
		id: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		organization: userCountryAccount.organizationId,
		role: userCountryAccount.role,
		emailVerified: user.emailVerified,
		dateAdded: userCountryAccount.addedAt,
		organizations,
	};
});

export const action = authActionWithPerm("EditUsers", async (actionArgs) => {
	const { request, params } = actionArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const id = params.id;

	if (!id) {
		throw new Response("Missing ID", { status: 400 });
	}

	const formData = await request.formData();
	let organization = formData.get("organization") as string | null;
	const role = formData.get("role") as string;

	organization = organization && organization.trim() !== "" ? organization : null;

	try {
		await AccessManagementService.updateUser({
			id,
			countryAccountsId,
			role,
			organization,
		});
	} catch (error) {
		if (error instanceof AccessManagementServiceError) {
			if (error.fieldErrors) {
				return { ok: false, errors: error.fieldErrors };
			}
			throw new Response(error.message, { status: error.status });
		}
		throw error;
	}

	return redirectWithMessage(actionArgs, "/settings/access-mgmnt/", {
		type: "success",
		text: "Changes saved",
	});
});

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors;
	const [selectedRole, setSelectedRole] = useState(loaderData.role);
	const [selectedOrganization, setSelectedOrganization] = useState(
		loaderData.organization,
	);
	const roles = getCountryRoles();

	const navigation = useNavigation();

	const isSubmitting = navigation.state === "submitting";

	const navigate = useNavigate();

	return (
		<Dialog
			visible
			modal
			header={"Edit User"}
			onHide={() => navigate("/settings/access-mgmnt/")}
			className="w-[44rem] max-w-full"
		>
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div className="leading-6">
						<h2 className="text-xl font-semibold text-gray-900">
							{loaderData.firstName} {loaderData.lastName}
						</h2>
						<p className="mb-2 flex items-center">
							<span
								className={`status-dot ${loaderData.emailVerified ? "activated" : "pending"
									}`}
								style={{
									height: "10px",
									width: "10px",
									borderRadius: "50%",
									backgroundColor: loaderData.emailVerified
										? "#007bff"
										: "#ccc",
									marginRight: "8px",
								}}
							></span>
							{loaderData.emailVerified
								? "Account activated"
								: "Account activation pending"}
						</p>
						<p className="mb-2">
							<strong>
								{"Date added"}
								:
							</strong>{" "}
							{loaderData.dateAdded
								? format(new Date(loaderData.dateAdded), "dd-MM-yyyy")
								: "N/A"}
						</p>
						<p>
							<strong>
								{"Added by"}
								:
							</strong>{" "}
							{"System Admin"}
						</p>
					</div>
				</div>

				<Form method="post" className="flex flex-col gap-6" noValidate>
					{/* Email */}
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
							disabled
							required
							defaultValue={loaderData.email}
						/>

						{errors?.email && (
							<small className="text-sm text-red-500">{errors.email}</small>
						)}
					</div>

					{/* Organization */}
					<div className="flex flex-col gap-2">
						<label
							htmlFor="organization"
							className="font-semibold text-gray-800"
						>
							{"Organization"}
						</label>

						<Dropdown
							value={selectedOrganization}
							name="organization"
							onChange={(e) => setSelectedOrganization(e.value)}
							options={loaderData.organizations}
							optionLabel="name"
							optionValue="id"
							placeholder="Select an organization"
							showClear
							className="w-full"
						/>
					</div>

					{/* Role */}
					<div className="flex flex-col gap-2">
						<label htmlFor="role" className="font-semibold text-gray-800">
							{"Role"}
							<span className="text-red-500"> *</span>
						</label>

						<Dropdown
							value={selectedRole}
							name="role"
							onChange={(e) => setSelectedRole(e.value)}
							options={roles}
							optionLabel="label"
							optionValue="id"
							showClear
							placeholder="Select a role"
							className="w-full"
							invalid={!!errors?.role}
						/>

						{errors?.role && (
							<small className="text-sm text-red-500">{errors.role}</small>
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
							label={"Save changes"}
							icon="pi pi-check"
							loading={isSubmitting}
							disabled={!!isSubmitting}
						/>
					</div>
				</Form>
			</div>
		</Dialog>
	);
}
