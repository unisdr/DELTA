import { Form, MetaFunction, useNavigate, useNavigation } from "react-router";
import { useLoaderData, useActionData } from "react-router";
import { getCountryRoles } from "~/frontend/user/roles";
import { authLoaderWithPerm, authActionWithPerm } from "~/utils/auth";
import {
	redirectWithMessage,
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/utils/session";
import { addHours, format } from "date-fns";
import { useState } from "react";
import {
	getUserCountryAccountsByUserIdAndCountryAccountsId,
	updateUserCountryAccountsById,
} from "~/db/queries/userCountryAccountsRepository";

import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";
import { htmlTitle } from "~/utils/htmlmeta";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { UserRepository } from "~/db/queries/UserRepository";
import { OrganizationRepository } from "~/db/queries/organizationRepository";
import { dr } from "~/db.server";
import { Dialog } from "primereact/dialog";
import {
	sendInviteForExistingUser,
	sendInviteForNewUser,
} from "~/utils/emailUtil";
import { getCountryAccountById } from "~/db/queries/countryAccounts";

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(
				ctx,
				ctx.t({
					code: "meta.edit_user",
					msg: "Edit User",
				}),
			),
		},
		{
			name: "description",
			content: ctx.t({
				code: "meta.edit_user",
				msg: "Edit User",
			}),
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
	const ctx = new BackendContext(actionArgs);
	const { request, params } = actionArgs;
	const countrySettings = await getCountrySettingsFromSession(request);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const countryAccount = await getCountryAccountById(countryAccountsId);
	const id = params.id;
	const errors: Record<string, string> = {};

	if (!id) {
		throw new Response("Missing ID", { status: 400 });
	}
	//check if user exist
	const user = await UserRepository.getById(id);
	if (!user) {
		throw new Response(`User not found with id: ${id}`);
	}
	//check if user id belongs to this instance
	const userCountryAccount =
		await getUserCountryAccountsByUserIdAndCountryAccountsId(
			id,
			countryAccountsId,
		);
	if (!userCountryAccount) {
		throw new Response(`User not found with id: ${id}`, { status: 400 });
	}
	const countryAccountType = countryAccount?.type || "[null]";

	const formData = await request.formData();
	const role = formData.get("role") as string;
	const intent = formData.get("intent") as string;

	if (intent === "resend_email") {
		// todo: implement email sending and remove this mock
		const expirationTime = addHours(new Date(), 14 * 24);
		// is user already verified?
		if (!user.emailVerified) {
			const existingInviteCode = user.inviteCode;
			if (!existingInviteCode) {
				throw new Error("Missing invitation code for unverified user.");
			}

			await UserRepository.updateById(user.id, {
				inviteSentAt: new Date(),
				inviteExpiresAt: expirationTime,
			});

			await sendInviteForNewUser(
				ctx,
				user,
				countrySettings.websiteName,
				role,
				countrySettings.countryName,
				countryAccountType,
				existingInviteCode,
			);
		} else {
			await sendInviteForExistingUser(
				ctx,
				user,
				countrySettings.websiteName,
				role,
				countrySettings.countryName,
				countryAccountType,
			);
		}

		return redirectWithMessage(actionArgs, "/settings/access-mgmnt/", {
			type: "success",
			text: ctx.t({
				code: "admin.invitation_resent",
				msg: "Invitation email sent successfully",
			}),
		});
	} else {
		if (userCountryAccount.isPrimaryAdmin) {
			errors.email = "Cannot update primary admin account data";
		}

		let organization = formData.get("organization") as string | null;
		const role = formData.get("role") as string;

		organization =
			organization && organization.trim() !== "" ? organization : null;

		if (!role || role.trim() === "") {
			errors.role = "Role is required";
		}
		if (Object.keys(errors).length > 0) {
			return { ok: false, errors };
		}
		await dr.transaction(async (tx) => {
			await updateUserCountryAccountsById(
				userCountryAccount.id,
				{
					role,
					organizationId: organization,
				},
				tx,
			);
		});

		return redirectWithMessage(actionArgs, "/settings/access-mgmnt/", {
			type: "success",
			text: ctx.t({
				code: "common.changes_saved",
				msg: "Changes saved",
			}),
		});
	}
});

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const ctx = new ViewContext();
	const errors = actionData?.errors;
	const [selectedRole, setSelectedRole] = useState(loaderData.role);
	const [selectedOrganization, setSelectedOrganization] = useState(
		loaderData.organization,
	);
	const roles = getCountryRoles(ctx);

	const navigation = useNavigation();

	const isSubmitting = navigation.state === "submitting";

	const navigate = useNavigate();

	return (
		<Dialog
			visible
			modal
			header={ctx.t({
				code: "user.edit_user",
				msg: "Edit User",
			})}
			onHide={() => navigate(ctx.url("/settings/access-mgmnt/"))}
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
								className={`status-dot ${
									loaderData.emailVerified ? "activated" : "pending"
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
								? ctx.t({
										code: "settings.access_mgmnt.account_activated",
										msg: "Account activated",
									})
								: ctx.t({
										code: "settings.access_mgmnt.account_activation_pending",
										msg: "Account activation pending",
									})}
						</p>
						<p className="mb-2">
							<strong>
								{ctx.t({
									code: "settings.access_mgmnt.date_added",
									msg: "Date added",
								})}
								:
							</strong>{" "}
							{loaderData.dateAdded
								? format(new Date(loaderData.dateAdded), "dd-MM-yyyy")
								: "N/A"}
						</p>
						<p>
							<strong>
								{ctx.t({
									code: "settings.access_mgmnt.added_by",
									msg: "Added by",
								})}
								:
							</strong>{" "}
							{ctx.t({
								code: "settings.access_mgmnt.system_admin",
								msg: "System Admin",
							})}
						</p>
					</div>
				</div>

				<Form method="post" className="flex flex-col gap-6" noValidate>
					{/* Email */}
					<div className="flex flex-col gap-2">
						<label htmlFor="email" className="font-semibold text-gray-800">
							{ctx.t({
								code: "user_login.email_address",
								msg: "Email address",
							})}
							<span className="text-red-500"> *</span>
						</label>

						<InputText
							id="email"
							type="email"
							name="email"
							className="w-full"
							placeholder={ctx.t({
								code: "common.enter_email",
								msg: "Enter Email",
							})}
							disabled
							required
							defaultValue={loaderData.email}
						/>

						{errors?.email && (
							<small className="text-sm text-red-500">{errors.email}</small>
						)}
					</div>

					{/* Resend email */}
					<div className="flex flex-col gap-2">
						<button
							type="submit"
							name="intent"
							value="resend_email"
							className="p-button p-component p-button-outlined p-button-centered justify-center items-center "
						>
							{ctx.t({
								code: "admin.resend_email",
								msg: "Resend invitation email",
							})}
						</button>
						<input type="hidden" name="email" value={loaderData.email} />
					</div>

					{/* Organization */}
					<div className="flex flex-col gap-2">
						<label
							htmlFor="organization"
							className="font-semibold text-gray-800"
						>
							{ctx.t({ code: "common.organization", msg: "Organization" })}
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
							{ctx.t({ code: "common.role", msg: "Role" })}
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
							label={ctx.t({ code: "common.cancel", msg: "Cancel" })}
							onClick={() => navigate(ctx.url("/settings/access-mgmnt/"))}
						/>
						<Button
							type="submit"
							label={ctx.t({
								code: "common.save_changes",
								msg: "Save changes",
							})}
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
