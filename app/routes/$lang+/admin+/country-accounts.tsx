import type { ActionFunction } from "@remix-run/node";
import {
	Form,
	useActionData,
	useNavigate,
	MetaFunction,
	useLoaderData,
} from "@remix-run/react";
import {
	CountryAccountWithCountryAndPrimaryAdminUser,
	getCountryAccountsWithUserCountryAccountsAndUser,
} from "~/db/queries/countryAccounts";
import { MainContainer } from "~/frontend/container";
import { NavSettings } from "../settings/nav";
import { authLoaderWithPerm, authActionWithPerm } from "~/util/auth";
import { useEffect, useRef, useState } from "react";
import Dialog from "~/components/Dialog";
import { getCountries } from "~/db/queries/countries";
import {
	CountryAccountStatus,
	countryAccountStatuses,
	CountryAccountType,
	countryAccountTypes,
} from "~/drizzle/schema";
import {
	CountryAccountValidationError,
	createCountryAccountService,
	updateCountryAccountStatusService,
} from "~/services/countryAccountService";
import Messages from "~/components/Messages";
import { RadioButton } from "~/components/RadioButton";
import { Fieldset } from "~/components/FieldSet";
import Tag from "~/components/Tag";
import { Toast, ToastRef } from "~/components/Toast";
import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";
import { DContext } from "~/util/dcontext";
import { htmlTitle } from "~/util/htmlmeta";

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(ctx, ctx.t({
				"code": "meta.country_accounts_super_admin",
				"msg": "Country Accounts - Super Admin"
			})),
		},
		{
			name: "description",
			content: ctx.t({
				"code": "meta.super_admin_country_accounts_management",
				"msg": "Super Admin Country Accounts Management"
			}),
		}
	];
};

export const loader = authLoaderWithPerm(
	"manage_country_accounts",
	async () => {
		const countryAccounts = await getCountryAccountsWithUserCountryAccountsAndUser();
		const countries = await getCountries();

		return {
			countryAccounts,
			countries
		};
	}
);

export const action: ActionFunction = authActionWithPerm(
	"manage_country_accounts",
	async (actionArgs) => {
		const { request } = actionArgs;
		const ctx = new BackendContext(actionArgs);
		const formData = await request.formData();
		const countryId = formData.get("countryId") as string;
		const status = formData.get("status");
		const email = formData.get("email") as string;
		const shortDescription = formData.get("shortDescription") as string;
		const countryAccountType = formData.get("countryAccountType") as string;
		const id = formData.get("id") as string;

		try {
			if (id) {
				// Update existing account
				await updateCountryAccountStatusService(
					id,
					Number(status),
					shortDescription
				);
				return { success: true, operation: "update" };
			} else {
				// Create new account
				await createCountryAccountService(
					ctx,
					countryId,
					shortDescription,
					email,
					Number(status),
					countryAccountType
				);
				return { success: true, operation: "create" };
			}
		} catch (error) {
			let errors = {};
			if (error instanceof CountryAccountValidationError) {
				errors = { errors: error.errors };
			} else {
				errors = { errors: ["An unexpected error occured"] };
				console.log(error);
			}
			return {
				...errors,
				formValues: { id, countryId, status, email, countryAccountType },
			};
		}
	}
);

export function getCountryAccountTypeLabel(ctx: DContext, type: CountryAccountType | string) {
	switch (type) {
		case "Official":
			return ctx.t({
				"code": "admin.country_account_type.official",
				"msg": "Official"
			});
		case "Training":
			return ctx.t({
				"code": "admin.country_account_type.training",
				"msg": "Training"
			});
		default:
			return type;
	}
}

export default function CountryAccounts() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const { countryAccounts, countries } = ld;

	const actionData = useActionData<typeof action>();

	const [editingCountryAccount, setEditingCountryAccount] =
		useState<CountryAccountWithCountryAndPrimaryAdminUser | null>(null);
	const [selectedCountryId, setSelectedCountryId] = useState("-1");
	const [type, setType] = useState<CountryAccountType>(
		countryAccountTypes.OFFICIAL
	);
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<CountryAccountStatus>(
		countryAccountStatuses.ACTIVE
	);
	const [shortDescription, setShortDescription] = useState("");

	const [isAddCountryAccountDialogOpen, setIsAddCountryAccountDialogOpen] =
		useState(false);

	const formRef = useRef<HTMLFormElement>(null);
	const navigate = useNavigate();
	const toast = useRef<ToastRef>(null);

	function addCountryAccount() {
		resetForm();
		setIsAddCountryAccountDialogOpen(true);
	}

	function editCountryAccount(
		countryAccount: CountryAccountWithCountryAndPrimaryAdminUser
	) {
		if (formRef.current) {
			formRef.current.reset();
		}
		navigate(".", { replace: true });
		setEditingCountryAccount(countryAccount);
		setSelectedCountryId(countryAccount.country.id);
		setStatus(countryAccount.status as CountryAccountStatus);
		setType(countryAccount.type as CountryAccountType);
		setEmail(countryAccount.userCountryAccounts[0].user.email);
		setShortDescription(countryAccount.shortDescription);
		setIsAddCountryAccountDialogOpen(true);
	}

	function resetForm() {
		if (formRef.current) {
			formRef.current.reset();
		}
		setEditingCountryAccount(null);
		setSelectedCountryId("-1");
		setStatus(countryAccountStatuses.ACTIVE);
		setType(countryAccountTypes.OFFICIAL);
		setEmail("");
		setShortDescription("");
		navigate(".", { replace: true });
	}

	useEffect(() => {
		if (actionData?.success) {
			setIsAddCountryAccountDialogOpen(false);
			resetForm();

			if (toast.current) {
				toast.current.show({
					severity: "info",
					summary: ctx.t({
						"code": "common.success",
						"msg": "Success"
					}),
					detail: actionData.operation === "update"
						? ctx.t({
							"code": "admin.country_account_updated",
							"msg": "Country account updated successfully"
						})
						: ctx.t({
							"code": "admin.country_account_created",
							"msg": "Country account created successfully"
						})
				});
			}
		}
	}, [actionData, navigate, editingCountryAccount]);

	const footerContent = (
		<>
			<button
				type="submit"
				form="addCountryAccountForm"
				className="mg-button mg-button-primary"
			>
				{ctx.t({
					"code": "common.save",
					"msg": "Save"
				})}
			</button>
			<button
				type="button"
				className="mg-button mg-button-outline"
				onClick={() => setIsAddCountryAccountDialogOpen(false)}
			>
				{ctx.t({
					"code": "common.cancel",
					"msg": "Cancel"
				})}
			</button>
		</>
	);

	return (
		<MainContainer
			title={ctx.t({
				"code": "admin.manage_country_accounts_super_admin",
				"msg": "Manage Country Accounts - Super Admin"
			})}
			headerExtra={<NavSettings ctx={ctx} />}
		>
			<div className="card flex justify-content-center">
				<Toast ref={toast} />
			</div>
			<div className="dts-page-intro" style={{ paddingRight: 0 }}>
				<div className="dts-additional-actions">
					<button
						className="mg-button mg-button-secondary"
						onClick={() => addCountryAccount()}
					>
						{ctx.t({
							"code": "admin.add_country_account",
							"msg": "Add country account"
						})}
					</button>
				</div>
			</div>
			<table className="dts-table">
				<thead>
					<tr>
						<th>
							{ctx.t({
								"code": "common.country",
								"msg": "Country"
							})}
						</th>
						<th>
							{ctx.t({
								"code": "common.short_description",
								"msg": "Short description"
							})}
						</th>
						<th>
							{ctx.t({
								"code": "common.status",
								"msg": "Status"
							})}
						</th>
						<th>
							{ctx.t({
								"code": "common.type",
								"msg": "Type"
							})}
						</th>
						<th>
							{ctx.t({
								"code": "admin.primary_admin_email",
								"msg": "Primary admin's email"
							})}
						</th>
						<th>
							{ctx.t({
								"code": "common.created_at",
								"msg": "Created at"
							})}
						</th>
						<th>
							{ctx.t({
								"code": "common.modified_at",
								"msg": "Modified at"
							})}
						</th>
						<th>
							{ctx.t({
								"code": "common.actions",
								"msg": "Actions"
							})}
						</th>
					</tr>
				</thead>
				<tbody>
					{countryAccounts.map((countryAccount) => (
						<tr key={countryAccount.id}>
							<td>{countryAccount.country.name}</td>
							<td>{countryAccount.shortDescription}</td>
							<td>
								{countryAccount.status === countryAccountStatuses.ACTIVE
									? ctx.t({
										"code": "common.active",
										"msg": "Active"
									})
									: ctx.t({
										"code": "common.inactive",
										"msg": "Inactive"
									})
								}
							</td>
							<td>
								{countryAccount.type === countryAccountTypes.OFFICIAL ? (
									<Tag value={getCountryAccountTypeLabel(ctx, countryAccount.type)} />
								) : (
									<Tag value={getCountryAccountTypeLabel(ctx, countryAccount.type)} severity="warning" />
								)}
							</td>
							<td>{countryAccount.userCountryAccounts[0].user.email}</td>
							<td>{new Date(countryAccount.createdAt).toLocaleString()}</td>
							<td>
								{countryAccount.updatedAt
									? new Date(countryAccount.updatedAt).toLocaleString()
									: ""}
							</td>
							<td>
								<button
									onClick={() => {
										editCountryAccount(countryAccount);
									}}
									className="mg-button mg-button-table"
								>
									<svg
										aria-hidden="true"
										focusable="false"
										role="img"
										style={{ marginLeft: "4px" }}
									>
										<use href="/assets/icons/edit.svg#edit"></use>
									</svg>
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{/* Add/Edit country accounts modal */}
			<Dialog
				visible={isAddCountryAccountDialogOpen}
				header={editingCountryAccount
					? ctx.t({
						"code": "admin.edit_country_account",
						"msg": "Edit country account"
					})
					: ctx.t({
						"code": "admin.create_country_account",
						"msg": "Create country account"
					})
				}
				onClose={() => setIsAddCountryAccountDialogOpen(false)}
				footer={footerContent}
			>
				<Form
					method="post"
					id="addCountryAccountForm"
					className="dts-form"
					ref={formRef}
				>
					{/* Add error message display here */}
					{actionData?.errors && (
						<Messages
							header={ctx.t({
								"code": "common.errors",
								"msg": "Errors"
							})}
							messages={actionData.errors}
						/>
					)}
					<div className="dts-form__body">
						<input
							type="hidden"
							name="id"
							value={editingCountryAccount?.id || ""}
						/>
						<div className="dts-form-component">
							<label>
								<div className="dts-form-component__label">
									<span>
										{ctx.t({
											"code": "common.country",
											"msg": "Country"
										})}
									</span>
								</div>
								<select
									name="countryId"
									value={selectedCountryId}
									onChange={(e) => setSelectedCountryId(e.target.value)}
									disabled={editingCountryAccount?.id ? true : false}
								>
									<option key="-1" value="-1">
										{ctx.t({
											"code": "admin.select_country",
											"msg": "Select a country"
										})}
									</option>
									{countries.map((country) => (
										<option key={country.id} value={country.id}>
											{country.name}
										</option>
									))}
								</select>
							</label>
						</div>
						<div className="dts-form-component">
							<label>
								<div className="dts-form-component__label">
									<span>
										{ctx.t({
											"code": "admin.short_description",
											"msg": "Short description"
										})}
									</span>

								</div>
								<input
									type="text"
									name="shortDescription"
									aria-label="short description"
									placeholder={ctx.t({
										"code": "admin.max_n_characters",
										"desc": "Maximum character limit for input, currently set to 20",
										"msg": "Max {n} characters"
									}, { "n": 20 })}
									maxLength={20}
									value={shortDescription}
									onChange={(e) => setShortDescription(e.target.value)}
								></input>
							</label>
						</div>
						<div className="dts-form-component">
							<label>
								<div className="dts-form-component__label">
									<span>
										{ctx.t({
											"code": "common.status",
											"msg": "Status"
										})}
									</span>
								</div>
								<select
									name="status"
									value={status}
									onChange={(e) =>
										setStatus(Number(e.target.value) as CountryAccountStatus)
									}
								>
									<option
										key={countryAccountStatuses.ACTIVE}
										value={countryAccountStatuses.ACTIVE}
									>
										{ctx.t({
											"code": "common.active",
											"msg": "Active"
										})}
									</option>
									<option
										key={countryAccountStatuses.INACTIVE}
										value={countryAccountStatuses.INACTIVE}
									>
										{ctx.t({
											"code": "common.inactive",
											"msg": "Inactive"
										})}
									</option>
								</select>
							</label>
						</div>
						<div className="dts-form-component">
							<label>
								<div className="dts-form-component__label">
									<span>
										{ctx.t({
											"code": "admin.admins_email",
											"msg": "Admin's email"
										})}
									</span>
								</div>
								<input
									type="text"
									name="email"
									aria-label={ctx.t({
										"code": "admin.main_admins_email",
										"msg": "Main admin's email"
									})}
									placeholder={ctx.t({
										"code": "admin.enter_email",
										"msg": "Enter email"
									})}
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									disabled={editingCountryAccount?.id ? true : false}
								></input>
							</label>
						</div>
						<div className="dts-form-component">
							<Fieldset
								legend={ctx.t({
									"code": "admin.choose_instance_type",
									"msg": "Choose instance type"
								})}
								disabled={editingCountryAccount?.id ? true : false}
							>
								<div className="dts-form-component__field--horizontal">
									<RadioButton
										inputId="type1"
										name="countryAccountType"
										value={countryAccountTypes.OFFICIAL}
										onChange={(e) => setType(e.value as CountryAccountType)}
										checked={
											type === countryAccountTypes.OFFICIAL ||
											editingCountryAccount?.type ===
											countryAccountTypes.OFFICIAL
										}
										label={ctx.t({
											"code": "admin.instance_type_official",
											"msg": "Official"
										})}
									/>

									<RadioButton
										inputId="type2"
										name="countryAccountType"
										value={countryAccountTypes.TRAINING}
										onChange={(e) => setType(e.value as CountryAccountType)}
										checked={
											type === countryAccountTypes.TRAINING ||
											editingCountryAccount?.type ===
											countryAccountTypes.TRAINING
										}
										label={ctx.t({
											"code": "admin.instance_type_training",
											"msg": "Training"
										})}
									/>
								</div>
							</Fieldset>
						</div>
					</div>
				</Form>
			</Dialog>
		</MainContainer>
	);
}
