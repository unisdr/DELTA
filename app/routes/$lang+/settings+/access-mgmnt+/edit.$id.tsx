import { Form, MetaFunction, useNavigate, useNavigation } from "react-router";
import {
	useLoaderData,
	useActionData,
	useFetcher,
} from "react-router";
import { getCountryRoles } from "~/frontend/user/roles";
import { authLoaderWithPerm, authActionWithPerm } from "~/utils/auth";
import { MainContainer } from "~/frontend/container";
import {
	redirectWithMessage,
	getCountryAccountsIdFromSession,
} from "~/utils/session";
import { format } from "date-fns";
// import { ConfirmDialog } from "~/frontend/components/ConfirmDialog";
import { useEffect, useRef, useState } from "react";
import { getUserCountryAccountsByUserIdAndCountryAccountsId, updateUserCountryAccountsById } from "~/db/queries/userCountryAccountsRepository";

import { ViewContext } from "~/frontend/context";

import { LangLink } from "~/utils/link";
import { Toast } from "primereact/toast";
import { BackendContext } from "~/backend.server/context";
import { htmlTitle } from "~/utils/htmlmeta";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { UserRepository } from "~/db/queries/UserRepository";
import { OrganizationRepository } from "~/db/queries/organizationRepository";
import { dr } from "~/db.server";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";

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
		throw new Response(`User not found with id :${id}`)
	}
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const userCountryAccount = await getUserCountryAccountsByUserIdAndCountryAccountsId(
		id,
		countryAccountsId,
	);
	const organizations = await OrganizationRepository.getByCountryAccountsId(countryAccountsId);

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
		organizations
	};
});

export const action = authActionWithPerm("EditUsers", async (actionArgs) => {
	const ctx = new BackendContext(actionArgs);
	const { request, params } = actionArgs;
	const id = params.id;
	const errors: Record<string, string> = {};

	if (!id) {
		throw new Response("Missing ID", { status: 400 });
	}
	//check if user exist
	const user = await UserRepository.getById(id);
	if (!user) {
		throw new Response(`User not found with id: ${id}`)
	}
	//check if user id belongs to this instance
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const userCountryAccount = await getUserCountryAccountsByUserIdAndCountryAccountsId(id, countryAccountsId)
	if (!userCountryAccount) {
		throw new Response(`User not found with id: ${id}`, { status: 400 })
	}
	if (userCountryAccount.isPrimaryAdmin) {
		errors.email = "Cannot update primary admin account data";
	}

	const formData = await request.formData();
	let organization = formData.get("organization") as string | null;
	const role = formData.get("role") as string;

	organization = organization && organization.trim() !== ""
		? organization
		: null;

	if (!role || role.trim() === "") {
		errors.role = "Role is required"
	}
	if (Object.keys(errors).length > 0) {
		return { ok: false, errors }
	}
	await dr.transaction(async (tx) => {
		await updateUserCountryAccountsById(userCountryAccount.id, {
			role,
			organizationId: organization
		}, tx)
	});

	return redirectWithMessage(actionArgs, "/settings/access-mgmnt/", {
		type: "success",
		text: ctx.t({
			code: "common.changes_saved",
			msg: "Changes saved",
		}),
	});
});

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const ctx = new ViewContext();
	const fetcher = useFetcher();
	const toast = useRef<Toast>(null);
	const errors = actionData?.errors;
	const [selectedRole, setSelectedRole] = useState(loaderData.role);
	const [selectedOrganization, setSelectedOrganization] = useState(loaderData.organization);
	const roles = getCountryRoles(ctx);

	const navigation = useNavigation();

	const isSubmitting =
		navigation.state === "submitting";

	const handleDeleteClick = () => {
		confirmDialog({
			message: ctx.t({
				code: "settings.access_mgmnt.delete_user_confirmation",
				msg: "This data cannot be recovered after being deleted.",
			}),
			header: ctx.t({
				code: "settings.access_mgmnt.delete_user_title",
				msg: "Are you sure you want to delete this user?",
			}),
			icon: 'pi pi-exclamation-triangle',
			defaultFocus: 'reject',
			acceptClassName: 'p-button-danger p-button-outlined ml-2',
			rejectClassName: 'p-button-outlined ml-2',
			acceptIcon: 'pi pi-trash',
			acceptLabel: ctx.t({
				code: "user.delete_user",
				msg: "Delete user",
			}),
			rejectLabel: ctx.t({
				code: "common.do_not_delete",
				msg: "Do not delete",
			}),
			accept: handleConfirmDelete,
			pt: {
				footer: {
					className: 'flex justify-end gap-x-3 sm:gap-x-4'
				}
			},
		});
	};

	const handleConfirmDelete = () => {
		fetcher.submit(
			{},
			{
				method: "post",
				action: ctx.url(
					`/settings/access-mgmnt/delete/${loaderData.id}`,
				),
			},
		);
	};

	const navigate = useNavigate();
	useEffect(() => {
		if (fetcher.data && fetcher.state === "idle") {
			const data = fetcher.data as any;
			if (!data.ok) {
				toast.current?.show({
					severity: "error",
					summary: "Error",
					detail: data.error || "Something went wrong while deleting the user.",
					life: 3000,
				});
			}
		}
	}, [fetcher.data, fetcher.state, navigate]);

	return (
		<MainContainer
			title={ctx.t({
				code: "user.edit_user",
				msg: "Edit User",
			})}
		>
			<Toast ref={toast} position="top-right" />
			<>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "20px",
					}}
				>
					<div style={{ lineHeight: "1.5em" }}>
						<h2>
							{loaderData.firstName} {loaderData.lastName}
						</h2>
						<p
							style={{
								marginBottom: "0.5em",
								display: "flex",
								alignItems: "center",
							}}
						>
							<span
								className={`status-dot ${loaderData.emailVerified ? "activated" : "pending"
									}`}
								style={{
									height: "10px",
									width: "10px",
									borderRadius: "50%",
									backgroundColor: loaderData.emailVerified ? "#007bff" : "#ccc",
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
						<p style={{ marginBottom: "0.5em" }}>
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
					<Button
						onClick={handleDeleteClick}
						severity="danger"
						outlined
						icon="pi pi-trash"
						label={ctx.t({
							code: "settings.access_mgmnt.delete_user",
							msg: "Delete User",
						})} />
				</div>

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
								disabled
								required
								defaultValue={loaderData.email}
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
								code: "common.save_changes",
								msg: "Save changes",
							})}
							icon="pi pi-check"
							loading={isSubmitting}
							disabled={!!isSubmitting}
							className="w-full max-w-sm"
						/>

						{/* Back Link */}
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

				<ConfirmDialog />
			</>
		</MainContainer>
	);
}
