import { MetaFunction, useNavigation } from "react-router";

import { useLoaderData, useActionData, Form } from "react-router";
import { useState } from "react";

import { getCountryRole, getCountryRoles } from "~/frontend/user/roles";

import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";

import {
	getCountrySettingsFromSession,
	getCountryAccountsIdFromSession,
	getUserFromSession,
	redirectWithMessage,
} from "~/utils/session";

import { MainContainer } from "~/frontend/container";

import "react-toastify/dist/ReactToastify.css";
import { getCountryAccountById } from "~/db/queries/countryAccounts";
import { LangLink } from "~/utils/link";

import { ViewContext } from "~/frontend/context";
import { BackendContext } from "~/backend.server/context";
import { htmlTitle } from "~/utils/htmlmeta";
import { OrganizationRepository } from "~/db/queries/organizationRepository";
import { Dropdown } from "primereact/dropdown";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { isValidEmail } from "~/utils/email";
import { UserRepository } from "~/db/queries/UserRepository";
import { doesUserCountryAccountExistByEmailAndCountryAccountsId, UserCountryAccountRepository } from "~/db/queries/userCountryAccountsRepository";
import { randomBytes } from "node:crypto";
import { addHours } from "date-fns";
import { sendInviteForExistingUser2, sendInviteForNewUser2 } from "~/utils/emailUtil";
import { dr } from "~/db.server";

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(
				ctx,
				ctx.t({
					code: "meta.adding_new_user",
					msg: "Adding New User",
				}),
			),
		},
		{
			name: "description",
			content: ctx.t({
				code: "meta.invite_user",
				msg: "Invite User",
			}),
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

	const errors: Record<string, string> = {};
	const formData = await request.formData();
	const email = formData.get("email") as string;
	let organization = formData.get("organization") as string | null;
	const role = formData.get("role") as string;

	organization = organization && organization.trim() !== ""
		? organization
		: null;

	if (!email || email.trim() === "") {
		errors.email = "Email is required";
	} else if (!isValidEmail(email)) {
		errors.email = "Invalid email format.";
	} else if (email.toLowerCase() === loggedInUser?.user.email.toLowerCase()) {
		errors.email = "You cannot use your own email."
	}

	if (!role || role.trim() === "") {
		errors.role = "Role is required"
	}

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const emailAlreadyAssignedToCountryAccount = await doesUserCountryAccountExistByEmailAndCountryAccountsId(email, countryAccountsId);
	let user = await UserRepository.getByEmail(email);
	if (emailAlreadyAssignedToCountryAccount &&
		!user?.emailVerified &&
		user?.inviteExpiresAt &&
		user.inviteExpiresAt < new Date()) {
		errors.email = "Email already invited."
	}
	if (emailAlreadyAssignedToCountryAccount &&
		user?.emailVerified) {
		errors.email = "Email already invited."
	}

	if (Object.keys(errors).length > 0) {
		return { ok: false, errors }
	}

	const ctx = new BackendContext(actionArgs);
	const countrySettings = await getCountrySettingsFromSession(request);
	const countryAccount = await getCountryAccountById(countryAccountsId);
	const countryAccountType = countryAccount?.type || "[null]"

	//Add new user if not exist
	await dr.transaction(async (tx) => {
		const inviteCode = randomBytes(32).toString("hex");
		const expirationTime = addHours(new Date(), 14 * 24);
		if (!user) {

			user = await UserRepository.create(
				{
					email,
				},
			);
			UserRepository.updateById(user.id, {
				inviteSentAt: new Date(),
				inviteCode: inviteCode,
				inviteExpiresAt: expirationTime,
			},
				tx)

			await UserCountryAccountRepository.create({
				userId: user.id,
				countryAccountsId,
				role,
				isPrimaryAdmin: false,
				organizationId: organization
			},
				tx
			);
			sendInviteForNewUser2(ctx, user, countrySettings.websiteName, role, countrySettings.countryName, countryAccountType, inviteCode);

		} else {
			if (!emailAlreadyAssignedToCountryAccount) {
				await UserCountryAccountRepository.create({
					userId: user.id,
					countryAccountsId,
					role,
					isPrimaryAdmin: false,
					organizationId: organization
				});
				sendInviteForExistingUser2(ctx, user, countrySettings.websiteName, role, countrySettings.countryName, countryAccountType);
			} else {
				if (user.inviteExpiresAt > new Date()) {
					//update exp date 14 days
					UserRepository.updateById(user.id, {
						inviteExpiresAt: expirationTime,
					}, tx)
					sendInviteForExistingUser2(ctx, user, countrySettings.websiteName, role, countrySettings.countryName, countryAccountType);
				}

			}
		}
	});

	return redirectWithMessage(actionArgs, "/settings/access-mgmnt/", {
		type: "info",
		text: ctx.t({
			code: "settings.access_mgmnt.user_added_successfully",
			msg: "User has been successfully added!",
		}),
	});
});

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors;
	const roles = getCountryRoles(ctx);

	const navigation = useNavigation();
	const isSubmitting =
		navigation.state === "submitting";

	const [selectedRole, setSelectedRole] = useState("");
	const [selectedOrganization, setSelectedOrganization] = useState("");

	const roleObj = getCountryRole(ctx, selectedRole);

	return (
		<MainContainer
			title={ctx.t({ code: "settings.access_mgmnt.add_user", msg: "Add user" })}
		>
			<Card className="w-full rounded-2xl shadow-xl p-6">
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
							className="w-full max-w-sm"
							placeholder={ctx.t({
								code: "common.enter_email",
								msg: "Enter Email",
							})}
							required
							invalid={!!errors?.email}
						/>

						{errors?.email && (
							<small className="text-sm text-red-500">
								{errors.email}
							</small>
						)}
					</div>

					{/* Organization */}
					<div className="flex flex-col gap-2">
						<label htmlFor="organization" className="font-semibold text-gray-800">
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
							className="w-full max-w-sm"
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
							className="w-full max-w-sm"
							invalid={!!errors?.role}
						/>

						{errors?.role && (
							<small className="text-sm text-red-500">
								{errors.role}
							</small>
						)}
					</div>

					{/* Submit */}
					<Button
						type="submit"
						label={ctx.t({
							code: "common.inviteUser",
							msg: "Invite user",
						})}
						icon="pi pi-sign-in"
						loading={isSubmitting}
						disabled={!!isSubmitting}
						className="w-full max-w-sm"
					/>

					{/* Back */}
					<div>
						<LangLink
							lang={ctx.lang}
							to="/settings/access-mgmnt/"
							className="text-sm text-blue-600 underline hover:text-blue-800"
						>
							{ctx.t({ code: "common.back", msg: "Back" })}
						</LangLink>
					</div>
				</Form>
			</Card>

			{/* Role Summary */}
			<div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
				<div className="text-lg font-semibold text-gray-800">
					{ctx.t(
						{
							code: "settings.access_mgmnt.selected_role",
							msg: "You have selected [{role}]",
						},
						{
							role:
								selectedRole || ctx.t({ code: "common.role", msg: "Role" }),
						}
					)}
				</div>

				{roleObj?.desc && (
					<div className="mt-4 text-gray-700">
						{ctx.t(
							{
								code: "user.role.can_do",
								msg: "A {label} is able to:",
							},
							{ label: roleObj.label }
						)}
						<br />
						<span className="italic text-gray-600">
							{roleObj.desc}
						</span>
					</div>
				)}
			</div>
		</MainContainer >
	);
}
