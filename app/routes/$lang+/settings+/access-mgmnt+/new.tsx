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
import { CountryAccountsRepository } from "~/db/queries/countryAccountsRepository";
import { ViewContext } from "~/frontend/context";
import { BackendContext } from "~/backend.server/context";
import { htmlTitle } from "~/utils/htmlmeta";
import { OrganizationRepository } from "~/db/queries/organizationRepository";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { isValidEmail } from "~/utils/email";
import { UserRepository } from "~/db/queries/UserRepository";
import { doesUserCountryAccountExistByEmailAndCountryAccountsId, UserCountryAccountRepository } from "~/db/queries/userCountryAccountsRepository";
import { randomBytes } from "node:crypto";
import { addHours } from "date-fns";
import { sendInviteForExistingUser, sendInviteForNewUser } from "~/utils/emailUtil";
import { dr } from "~/db.server";
import { Dialog } from "primereact/dialog";

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
	const now = new Date();
	if (emailAlreadyAssignedToCountryAccount && user) {
		const hasActiveInvite = !!user.inviteExpiresAt && user.inviteExpiresAt > now;
		const isUnverifiedAndExpired =
			!user.emailVerified && (!user.inviteExpiresAt || user.inviteExpiresAt <= now);

		if (user.emailVerified || hasActiveInvite) {
			errors.email = "Email already invited.";
		}

		// For unverified users with expired invite in the same instance,
		// allow processing so expiration can be extended and invite resent.
		if (isUnverifiedAndExpired) {
			delete errors.email;
		}
	}

	if (Object.keys(errors).length > 0) {
		return { ok: false, errors }
	}

	const ctx = new BackendContext(actionArgs);
	const countrySettings = await getCountrySettingsFromSession(request);
	const countryAccount = await CountryAccountsRepository.getById(countryAccountsId);
	const countryAccountType = countryAccount?.type || "[null]"

	//Add new user if not exist
	await dr.transaction(async (tx) => {
		const expirationTime = addHours(new Date(), 14 * 24);
		if (!user) {
			const inviteCode = randomBytes(32).toString("hex");

			user = await UserRepository.create(
				{
					email,
				},
			);
			await UserRepository.updateById(user.id, {
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
			await sendInviteForNewUser(ctx, user, countrySettings.websiteName, role, countrySettings.countryName, countryAccountType, inviteCode);

		} else {
			if (!emailAlreadyAssignedToCountryAccount) {
				await UserCountryAccountRepository.create({
					userId: user.id,
					countryAccountsId,
					role,
					isPrimaryAdmin: false,
					organizationId: organization
				});

				if (!user.emailVerified) {
					const existingInviteCode = user.inviteCode;
					if (!existingInviteCode) {
						throw new Error("Missing invitation code for unverified user.");
					}

					await UserRepository.updateById(
						user.id,
						{
							inviteSentAt: new Date(),
							inviteExpiresAt: expirationTime,
						},
						tx,
					);

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
			} else {
				const existingInviteCode = user.inviteCode;
				if (!existingInviteCode) {
					throw new Error("Missing invitation code for unverified user.");
				}

				await UserRepository.updateById(
					user.id,
					{
						inviteSentAt: new Date(),
						inviteExpiresAt: expirationTime,
					},
					tx,
				);

				await sendInviteForNewUser(
					ctx,
					user,
					countrySettings.websiteName,
					role,
					countrySettings.countryName,
					countryAccountType,
					existingInviteCode,
				);

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
	const navigate = useNavigate();

	const navigation = useNavigation();
	const isSubmitting =
		navigation.state === "submitting";

	const [selectedRole, setSelectedRole] = useState("");
	const [selectedOrganization, setSelectedOrganization] = useState("");

	const roleObj = getCountryRole(ctx, selectedRole);

	return (
		<Dialog
			visible
			modal
			header={ctx.t({ code: "settings.access_mgmnt.add_user", msg: "Add user" })}
			onHide={() => navigate(ctx.url("/settings/access-mgmnt/"))}
			className="w-[42rem] max-w-full"
		>
			<Form method="post" className="flex flex-col gap-6" noValidate>
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
						{ctx.t({ code: "common.organization", msg: "Organization" })}
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
						{ctx.t({ code: "common.role", msg: "Role" })}
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
						{ctx.t(
							{
								code: "settings.access_mgmnt.selected_role",
								msg: "You have selected [{role}]",
							},
							{
								role:
									selectedRole || ctx.t({ code: "common.role", msg: "Role" }),
							},
						)}
					</div>

					{roleObj?.desc && (
						<div className="mt-4 text-gray-700">
							{ctx.t(
								{
									code: "user.role.can_do",
									msg: "A {label} is able to:",
								},
								{ label: roleObj.label },
							)}
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
						label={ctx.t({ code: "common.cancel", msg: "Cancel" })}
						onClick={() => navigate(ctx.url("/settings/access-mgmnt/"))}
					/>
					<Button
						type="submit"
						label={ctx.t({
							code: "common.inviteUser",
							msg: "Invite user",
						})}
						icon="pi pi-sign-in"
						loading={isSubmitting}
						disabled={isSubmitting}
					/>
				</div>
			</Form>
		</Dialog>
	);
}
