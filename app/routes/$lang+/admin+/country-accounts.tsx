import {
	Form,
	useActionData,
	useNavigate,
	MetaFunction,
	useLoaderData,
	useFetcher,
} from "react-router";
import {
	CountryAccountWithCountryAndPrimaryAdminUser,
	getCountryAccountsWithUserCountryAccountsAndUser,
} from "~/db/queries/countryAccounts";
import { MainContainer } from "~/frontend/container";
import { NavSettings } from "../settings/nav";
import { authLoaderWithPerm, authActionWithPerm } from "~/utils/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { CountryRepository } from "~/db/queries/countriesRepository";
import {
	CountryAccountStatus,
	countryAccountStatuses,
	CountryAccountType,
	countryAccountTypesTable,
} from "~/drizzle/schema/countryAccounts";
import {
	CountryAccountValidationError,
	createCountryAccountService,
	resetInstanceData,
	updateCountryAccountStatusService,
} from "~/services/countryAccountService";
import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";
import { DContext } from "~/utils/dcontext";
import { htmlTitle } from "~/utils/htmlmeta";
import {
	sendInviteForExistingCountryAccountAdminUser,
	sendInviteForNewCountryAccountAdminUser,
} from "~/backend.server/models/user/invite";
import { UserRepository } from "~/db/queries/UserRepository";
import { SelectUser } from "~/drizzle/schema/userTable";
import { addHours } from "date-fns/addHours";
import { Button } from "primereact/button";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Dialog } from "primereact/dialog";
import { Fieldset } from "primereact/fieldset";
import { Message } from "primereact/message";
import { RadioButton } from "primereact/radiobutton";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import Tag from "~/components/Tag";

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(
				ctx,
				ctx.t({
					code: "meta.country_accounts_super_admin",
					msg: "Country Accounts - Super Admin",
				}),
			),
		},
		{
			name: "description",
			content: ctx.t({
				code: "meta.super_admin_country_accounts_management",
				msg: "Super Admin Country Accounts Management",
			}),
		},
	];
};

export const loader = authLoaderWithPerm(
	"manage_country_accounts",
	async () => {
		const countryAccounts =
			await getCountryAccountsWithUserCountryAccountsAndUser();
		const countries = await CountryRepository.getAll();

		return {
			countryAccounts,
			countries,
		};
	},
);

type ActionData =
	| {
		success: true;
		operation: "create" | "update" | "resend_email" | "reset";
	}
	| {
		errors: string[];
		formValues?: {
			id?: string;
			countryId?: string;
			status?: FormDataEntryValue | null;
			email?: string;
			countryAccountType?: string;
		};
	};

export const action = authActionWithPerm(
	"manage_country_accounts",
	async (actionArgs) => {
		const { request } = actionArgs;
		const ctx = new BackendContext(actionArgs);
		const formData = await request.formData();
		const intent = formData.get("intent") as string;
		const countryId = formData.get("countryId") as string;
		var countryName = "" as string;
		const status = formData.get("status");
		const email = formData.get("email") as string;
		const shortDescription = formData.get("shortDescription") as string;
		const countryAccountType = formData.get("countryAccountType") as string;
		const id = formData.get("id") as string;
		const userAdminId = formData.get("adminUserId") as string;

		try {
			if (intent === "resend_email") {
				const country = await CountryRepository.getById(countryId);
				if (!country) {
					// TODO throw error
					countryName = `Country with ID ${countryId} not found.`;
				} else {
					countryName = country.name;
				}
				const userAdmin = (await UserRepository.getById(userAdminId)) as SelectUser;
				if (!userAdmin) {
					// TODO throw error
					countryName = `User with ID ${userAdminId} not found.`;
				}

				// is user already verified?
				if (userAdmin.emailVerified) {
					// we just send the basic invite without invite code
					await sendInviteForExistingCountryAccountAdminUser(
						ctx,
						userAdmin,
						"DELTA Resilience",
						"Admin",
						countryName,
						countryAccountType,
					);
				} else {
					// we renew invite code expiration and send the  invite with invite code
					const EXPIRATION_DAYS = 14;
					const expirationTime = addHours(new Date(), EXPIRATION_DAYS * 24);

					UserRepository.updateById(userAdmin.id, {
						inviteSentAt: new Date(),
						inviteExpiresAt: expirationTime,
					});

					await sendInviteForNewCountryAccountAdminUser(
						ctx,
						userAdmin,
						"DELTA Resilience",
						"Admin",
						countryName,
						countryAccountType,
						userAdmin.inviteCode,
					);
				}

				return {
					success: true,
					operation: "resend_email",
				} satisfies ActionData;
			} else {
				if (intent === "reset") {
					await resetInstanceData(id);
					console.log(id)
					return { success: true, operation: "reset" } satisfies ActionData;
				}

				if (id) {
					// Update existing account
					await updateCountryAccountStatusService(
						id,
						Number(status),
						shortDescription,
					);
					return { success: true, operation: "update" } satisfies ActionData;
				} else {
					// Create new account
					await createCountryAccountService(
						ctx,
						countryId,
						shortDescription,
						email,
						Number(status),
						countryAccountType,
					);
					return { success: true, operation: "create" } satisfies ActionData;
				}
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
	},
);

export function getCountryAccountTypeLabel(
	ctx: DContext,
	type: CountryAccountType | string,
) {
	switch (type) {
		case "Official":
			return ctx.t({
				code: "admin.country_account_type.official",
				msg: "Official",
			});
		case "Training":
			return ctx.t({
				code: "admin.country_account_type.training",
				msg: "Training",
			});
		default:
			return type;
	}
}

export default function CountryAccounts() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const { countryAccounts, countries } = ld;
	const countryOptions = useMemo(
		() => countries.map((country) => ({ label: country.name, value: country.id })),
		[countries],
	);

	const actionData = useActionData<ActionData>();
	const resetFetcher = useFetcher<ActionData>();

	const [editingCountryAccount, setEditingCountryAccount] =
		useState<CountryAccountWithCountryAndPrimaryAdminUser | null>(null);
	const [selectedCountryId, setSelectedCountryId] = useState("-1");
	const [type, setType] = useState<CountryAccountType>(
		countryAccountTypesTable.OFFICIAL,
	);
	const [email, setEmail] = useState("");
	const [adminUserId, setAdminUserId] = useState("");
	const [status, setStatus] = useState<CountryAccountStatus>(
		countryAccountStatuses.ACTIVE,
	);
	const [shortDescription, setShortDescription] = useState("");

	const [isAddCountryAccountDialogOpen, setIsAddCountryAccountDialogOpen] =
		useState(false);

	const formRef = useRef<HTMLFormElement>(null);
	const navigate = useNavigate();
	const toast = useRef<Toast>(null);

	function addCountryAccount() {
		resetForm();
		setIsAddCountryAccountDialogOpen(true);
	}

	function editCountryAccount(
		countryAccount: CountryAccountWithCountryAndPrimaryAdminUser,
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
		setAdminUserId(countryAccount.userCountryAccounts[0].user.id);
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
		setType(countryAccountTypesTable.OFFICIAL);
		setEmail("");
		setAdminUserId("");
		setShortDescription("");
		navigate(".", { replace: true });
	}

	function handleResetInstanceData(
		countryAccount: CountryAccountWithCountryAndPrimaryAdminUser,
	) {
		confirmDialog({
			message: ctx.t({
				code: "admin.reset_instance_data_confirm_message",
				msg: "Are you sure you want to reset all instance data? This action cannot be undone.",
			}),
			header: ctx.t({
				code: "admin.reset_instance_data_confirm_header",
				msg: "Reset All Instance Data",
			}),
			icon: "pi pi-exclamation-triangle",
			acceptIcon: 'pi pi-replay',
			rejectClassName: 'p-button-outlined ml-2',
			acceptClassName: "p-button-danger p-button-outlined",
			defaultFocus: 'reject',
			acceptLabel: ctx.t({ code: "common.yes", msg: "Yes" }),
			rejectLabel: ctx.t({ code: "common.no", msg: "No" }),
			accept: () => {
				resetFetcher.submit(
					{ intent: "reset", id: countryAccount.id },
					{ method: "post" },
				);
			},
		});
	}

	// Show toast after reset completes
	useEffect(() => {
		if (
			resetFetcher.data &&
			"success" in resetFetcher.data &&
			resetFetcher.data.operation === "reset"
		) {
			toast.current?.show({
				severity: "info",
				summary: ctx.t({ code: "common.success", msg: "Success" }),
				detail: ctx.t({
					code: "admin.instance_data_reset",
					msg: "Instance data has been reset successfully",
				}),
			});
		}
	}, [resetFetcher.data]);

	useEffect(() => {
		if (actionData && "success" in actionData) {
			setIsAddCountryAccountDialogOpen(false);
			resetForm();

			if (toast.current) {
				toast.current.show({
					severity: "info",
					summary: ctx.t({
						code: "common.success",
						msg: "Success",
					}),
					detail:
						actionData.operation === "update"
							? ctx.t({
								code: "admin.country_account_updated",
								msg: "Country account updated successfully",
							})
							: actionData.operation === "create"
								? ctx.t({
									code: "admin.country_account_created",
									msg: "Country account created successfully",
								})
								: ctx.t({
									code: "admin.invitation_resent",
									msg: "Invitation email sent successfully",
								}),
				});
			}
		}
	}, [actionData, navigate, editingCountryAccount]);

	const footerContent = (
		<div className="flex w-full justify-end gap-2">
			<Button
				type="submit"
				form="addCountryAccountForm"
				label={ctx.t({
					code: "common.save",
					msg: "Save",
				})}
			/>
			<Button
				type="button"
				outlined
				label={ctx.t({
					code: "common.cancel",
					msg: "Cancel",
				})}
				onClick={() => setIsAddCountryAccountDialogOpen(false)}
			/>
		</div>
	);

	return (
		<MainContainer
			title={ctx.t({
				code: "admin.manage_country_accounts_super_admin",
				msg: "Manage Country Accounts - Super Admin",
			})}
			headerExtra={<NavSettings ctx={ctx} />}
		>
			{/* ConfirmDialog must be mounted in the tree to render the dialog */}
			<ConfirmDialog />

			<div className="card flex justify-content-center">
				<Toast ref={toast} />
			</div>
			<div className="dts-page-intro" style={{ paddingRight: 0 }}>
				<div className="dts-additional-actions">
					<Button
						label={ctx.t({
							code: "admin.add_country_account",
							msg: "Add country account",
						})}
						onClick={() => addCountryAccount()}
					/>
				</div>
			</div>
			<table className="dts-table">
				<thead>
					<tr>
						<th>
							{ctx.t({
								code: "common.country",
								msg: "Country",
							})}
						</th>
						<th>
							{ctx.t({
								code: "common.short_description",
								msg: "Short description",
							})}
						</th>
						<th>
							{ctx.t({
								code: "common.status",
								msg: "Status",
							})}
						</th>
						<th>
							{ctx.t({
								code: "common.type",
								msg: "Type",
							})}
						</th>
						<th>
							{ctx.t({
								code: "admin.primary_admin_email",
								msg: "Primary admin's email",
							})}
						</th>
						<th>
							{ctx.t({
								code: "common.created_at",
								msg: "Created at",
							})}
						</th>
						<th>
							{ctx.t({
								code: "common.modified_at",
								msg: "Modified at",
							})}
						</th>
						<th>
							{ctx.t({
								code: "common.actions",
								msg: "Actions",
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
										code: "common.active",
										msg: "Active",
									})
									: ctx.t({
										code: "common.inactive",
										msg: "Inactive",
									})}
							</td>
							<td>
								{countryAccount.type === countryAccountTypesTable.OFFICIAL ? (
									<Tag
										value={getCountryAccountTypeLabel(ctx, countryAccount.type)}
									/>
								) : (
									<Tag
										value={getCountryAccountTypeLabel(ctx, countryAccount.type)}
										severity="warning"
									/>
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
								<Button
									text
									severity="secondary"
									onClick={() => {
										editCountryAccount(countryAccount);
									}}
									className="p-2"
								>
									<i className="pi pi-pencil" aria-hidden="true"></i>
								</Button>
								{countryAccount.country.name === "Disaster Land" &&
									<Button
										tooltip="Reset all instance data"
										loading={resetFetcher.state === "submitting"}
										text
										severity="danger"
										onClick={() => {
											handleResetInstanceData(countryAccount);
										}}
										className="p-2"
									>
										<i className="pi pi-replay" style={{ fontSize: "1rem" }}></i>
									</Button>}
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{/* Add/Edit country accounts modal */}
			<Dialog
				visible={isAddCountryAccountDialogOpen}
				header={
					editingCountryAccount
						? ctx.t({
							code: "admin.edit_country_account",
							msg: "Edit country account",
						})
						: ctx.t({
							code: "admin.create_country_account",
							msg: "Create country account",
						})
				}
				onHide={() => setIsAddCountryAccountDialogOpen(false)}
				footer={footerContent}
				pt={{
					footer: { className: "px-6 pt-0 pb-4" },
				}}
				className="w-full max-w-3xl"
				draggable={false}
				resizable={false}
			>
				<Form
					method="post"
					id="addCountryAccountForm"
					ref={formRef}
				>
					{/* Add error message display here */}
					{actionData && "errors" in actionData && (
						<div className="mb-4 space-y-2">
							<Message
								severity="error"
								text={ctx.t({
									code: "common.errors",
									msg: "Errors",
								})}
							/>
							{actionData.errors.map((error, index) => (
								<Message
									key={`${error}-${index}`}
									severity="error"
									text={error}
								/>
							))}
						</div>
					)}
					<div className="dts-form__body space-y-4">
						<input
							type="hidden"
							name="id"
							value={editingCountryAccount?.id || ""}
						/>
						<div className="space-y-2">
							<label>
								<div className="mb-1 font-medium text-gray-700">
									<span>
										{ctx.t({
											code: "common.country",
											msg: "Country",
										})}
									</span>
								</div>
								<input type="hidden" name="countryId" value={selectedCountryId} />
								<Dropdown
									value={selectedCountryId}
									options={countryOptions}
									optionLabel="label"
									optionValue="value"
									onChange={(e) => setSelectedCountryId(e.value)}
									placeholder={ctx.t({ code: "admin.select_country", msg: "Select a country" })}
									filterBy="label"
									filter
									virtualScrollerOptions={{ itemSize: 38 }}
									scrollHeight="260px"
									disabled={!!editingCountryAccount?.id}
									className="w-full"
								/>
							</label>
						</div>
						<div className="space-y-2">
							<label>
								<div className="mb-1 font-medium text-gray-700">
									<span>
										{ctx.t({
											code: "admin.short_description",
											msg: "Short description",
										})}
									</span>
								</div>
								<InputText
									name="shortDescription"
									aria-label="short description"
									placeholder={ctx.t(
										{
											code: "admin.max_n_characters",
											desc: "Maximum character limit for input, currently set to 20",
											msg: "Max {n} characters",
										},
										{ n: 20 },
									)}
									maxLength={20}
									value={shortDescription}
									onChange={(e) => setShortDescription(e.target.value)}
									className="w-full"
								/>
							</label>
						</div>
						<div className="space-y-2">
							<label>
								<div className="mb-1 font-medium text-gray-700">
									<span>
										{ctx.t({
											code: "common.status",
											msg: "Status",
										})}
									</span>
								</div>
								<input type="hidden" name="status" value={status} />
								<Dropdown
									value={status}
									options={[
										{ label: ctx.t({ code: "common.active", msg: "Active" }), value: countryAccountStatuses.ACTIVE },
										{ label: ctx.t({ code: "common.inactive", msg: "Inactive" }), value: countryAccountStatuses.INACTIVE },
									]}
									onChange={(e) => setStatus(e.value as CountryAccountStatus)}
									className="w-full"
								/>
							</label>
						</div>
						<div className="space-y-2">
							<label>
								<div className="mb-1 font-medium text-gray-700">
									<span>
										{ctx.t({
											code: "admin.admins_email",
											msg: "Admin's email",
										})}
									</span>
								</div>
								<InputText
									name="email"
									aria-label={ctx.t({
										code: "admin.main_admins_email",
										msg: "Main admin's email",
									})}
									placeholder={ctx.t({
										code: "admin.enter_email",
										msg: "Enter email",
									})}
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									disabled={!!editingCountryAccount?.id}
									className="w-full"
								/>
							</label>
							{editingCountryAccount?.id && (
								<div className="pt-2">
									<Button
										type="submit"
										name="intent"
										value="resend_email"
										outlined
										label={ctx.t({
											code: "admin.resend_email",
											msg: "Resend invitation email",
										})}
									/>
									<input type="hidden" name="email" value={email} />
									<input
										type="hidden"
										name="countryId"
										value={selectedCountryId}
									/>
									<input type="hidden" name="adminUserId" value={adminUserId} />
									<input
										type="hidden"
										name="countryAccountType"
										value={editingCountryAccount?.type}
									/>
								</div>
							)}
						</div>
						<div className="space-y-2">
							<Fieldset
								legend={ctx.t({
									code: "admin.choose_instance_type",
									msg: "Choose instance type",
								})}
							>
								<div className="flex flex-wrap gap-4">
									<div className="flex items-center gap-2">
										<RadioButton
											inputId="type1"
											name="countryAccountType"
											value={countryAccountTypesTable.OFFICIAL}
											onChange={(e) => setType(e.value as CountryAccountType)}
											checked={
												type === countryAccountTypesTable.OFFICIAL ||
												editingCountryAccount?.type ===
												countryAccountTypesTable.OFFICIAL
											}
											disabled={!!editingCountryAccount?.id}
										/>
										<label htmlFor="type1">
											{ctx.t({
												code: "admin.instance_type_official",
												msg: "Official",
											})}
										</label>
									</div>

									<div className="flex items-center gap-2">
										<RadioButton
											inputId="type2"
											name="countryAccountType"
											value={countryAccountTypesTable.TRAINING}
											onChange={(e) => setType(e.value as CountryAccountType)}
											checked={
												type === countryAccountTypesTable.TRAINING ||
												editingCountryAccount?.type ===
												countryAccountTypesTable.TRAINING
											}
											disabled={!!editingCountryAccount?.id}
										/>
										<label htmlFor="type2">
											{ctx.t({
												code: "admin.instance_type_training",
												msg: "Training",
											})}
										</label>
									</div>
								</div>
							</Fieldset>
						</div>
					</div>
				</Form>
			</Dialog>
		</MainContainer>
	);
}