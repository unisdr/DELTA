import { json, MetaFunction } from "@remix-run/node";

import { useLoaderData, useActionData, Form } from "@remix-run/react";
import { useState } from "react";

import { FormResponse, SubmitButton } from "~/frontend/form";
import { getCountryRoles } from "~/frontend/user/roles";

import { authActionWithPerm, authLoaderWithPerm } from "~/util/auth";

import { formStringData } from "~/util/httputil";
import {
	redirectWithMessage,
	getUserFromSession,
	getCountrySettingsFromSession,
	getCountryAccountsIdFromSession,
} from "~/util/session";

import { MainContainer } from "~/frontend/container";

import "react-toastify/dist/ReactToastify.css";
import {
	adminInviteUser,
	AdminInviteUserFields,
	adminInviteUserFieldsFromMap,
} from "~/backend.server/models/user/invite";
import { getCountryAccountById } from "~/db/queries/countryAccounts";
import { getCountryById } from "~/db/queries/countries";
import { LangLink } from "~/util/link";
import { getCommonData } from "~/backend.server/handlers/commondata";
import { ViewContext } from "~/frontend/context";
import { BackendContext } from "~/backend.server/context";


export const meta: MetaFunction = () => {
	return [
		{ title: "Adding New User - DELTA Resilience" },
		{ name: "description", content: "Invite User." },
	];
};

export const loader = authLoaderWithPerm("InviteUsers", async (args) => {
	const {request} = args

	// Get user session and tenant context to verify authorization
	const userSession = await getUserFromSession(request);
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("Unauthorized. No instance seleted.", { status: 401 });
	}

	return {
		common: await getCommonData(args),
		data: adminInviteUserFieldsFromMap({}),
	};
});

type ActionResponse = FormResponse<AdminInviteUserFields>;

type ErrorsType = {
	fields: Partial<Record<keyof AdminInviteUserFields, string[]>>;
	form?: string[];
};

export const action = authActionWithPerm("InviteUsers", async (actionArgs) => {
	const { request } = actionArgs;
	const ctx = new BackendContext(actionArgs);

	const settings = await getCountrySettingsFromSession(request);
	const siteName = settings.websiteName;

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	// Get user session and tenant context
	const userSession = await getUserFromSession(request);
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}

	if (!countryAccountsId) {
		throw new Response("Unauthorized - No tenant context", { status: 401 });
	}
	const countryAccount = await getCountryAccountById(countryAccountsId);
	if (!countryAccount) {
		throw new Response("Unauthorized - No tenant context", { status: 500 });
	}
	const country = await getCountryById(countryAccount.countryId);
	if (!country) {
		throw new Response("Internal server error", { status: 401 });
	}

	const formData = formStringData(await request.formData());
	const data = adminInviteUserFieldsFromMap(formData);

	try {
		const res = await adminInviteUser(
			ctx,
			data,
			countryAccountsId,
			siteName,
			country.name,
			countryAccount.type
		);

		if (!res.ok) {
			return json<ActionResponse>({
				ok: false,
				data: data,
				errors: res.errors,
			});
		}

		// Redirect with flash message
		return redirectWithMessage(actionArgs, "/settings/access-mgmnt/", {
			type: "info",
			text: "User has been successfully added!",
		});
	} catch (error) {
		console.error("An unexpected error occurred:", error);

		return json<ActionResponse>({
			ok: false,
			data: data,
			errors: {
				fields: {},
				form: ["An unexpected error occurred. Please try again."],
			},
		});
	}
});

function isErrorResponse(
	actionData: any
): actionData is { errors: ErrorsType } {
	return actionData?.errors !== undefined;
}

// Capitalizes the first letter of a string
function capitalizeFirstLetter(str: string) {
	if (!str) return str;
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const ctx = new ViewContext(loaderData);
	const actionData = useActionData<typeof action>();

	let fields = loaderData?.data || {};
	const errors: ErrorsType = isErrorResponse(actionData)
		? actionData.errors
		: { fields: {} };

	const [selectedRole, setSelectedRole] = useState(fields.role || "");

	const roleDesc =
		getCountryRoles().find((role) => role.id === selectedRole)?.desc || "";

	return (
		<MainContainer title="Add User">
			<div className="dts-form__header">
				<LangLink
					lang={ctx.lang}
					to="/settings/access-mgmnt/"
					className="mg-button mg-button--small mg-button-system"
				>
					Back
				</LangLink>
			</div>

			{Array.isArray(errors.form) && errors.form.length > 0 && (
				<div className="dts-alert dts-alert--error mg-space-b">
					<div className="dts-alert__icon">
						<svg aria-hidden="true" focusable="false" role="img">
							<use href="/assets/icons/error.svg#error" />
						</svg>
					</div>
					<div>
						<p>{errors.form[0]}</p>
					</div>
				</div>
			)}

			<Form method="post">
				<div className="mg-grid mg-grid__col-3">
					{/* First Name */}
					<div className="dts-form-component">
						<label aria-invalid={!!errors.fields.firstName}>
							<div className="dts-form-component__label">
								<span style={{ color: "red" }}>
									<abbr title="mandatory">*</abbr>
								</span>
								First name
							</div>
							<input
								type="text"
								name="firstName"
								placeholder="Enter first name"
								defaultValue={fields.firstName}
								autoComplete="given-name"
								className={errors.fields.firstName ? "error" : ""}
								aria-describedby={
									errors.fields.firstName ? "firstNameError" : undefined
								}
							/>
						</label>
						<div className="dts-form-component__hint">
							{errors.fields.firstName && (
								<div
									className="dts-form-component__hint--error"
									id="firstNameError"
									aria-live="assertive"
								>
									{errors.fields.firstName[0]}
								</div>
							)}
						</div>
					</div>

					{/* Last Name */}
					<div className="dts-form-component">
						<label>
							<div className="dts-form-component__label">
								<span>Last name</span>
							</div>
							<input
								type="text"
								name="lastName"
								placeholder="Enter last name"
								defaultValue={fields.lastName}
								autoComplete="family-name"
								className={errors.fields.lastName ? "error" : ""}
								aria-describedby={
									errors.fields.lastName ? "lastNameError" : undefined
								}
							/>
						</label>
						<div className="dts-form-component__hint">
							{errors.fields.lastName && (
								<div
									className="dts-form-component__hint--error"
									id="lastNameError"
									aria-live="assertive"
								>
									{errors.fields.lastName[0]}
								</div>
							)}
							{/* Add description here if needed */}
						</div>
					</div>

					{/* Email */}
					<div className="dts-form-component">
						<label aria-invalid={!!errors.fields.email}>
							<div className="dts-form-component__label">
								<span style={{ color: "red" }}>
									<abbr title="mandatory">*</abbr>
								</span>
								Email
							</div>
							<input
								type="email"
								name="email"
								placeholder="Enter Email"
								defaultValue={fields.email}
								autoComplete="email"
								className={errors.fields.email ? "error" : ""}
								aria-describedby={
									errors.fields.email ? "emailError" : undefined
								}
							/>
						</label>
						<div className="dts-form-component__hint">
							{errors.fields.email && (
								<div
									className="dts-form-component__hint--error"
									id="emailError"
									aria-live="assertive"
								>
									{errors.fields.email[0]}
								</div>
							)}
							{/* Add description here if needed */}
						</div>
					</div>

					{/* Organization */}
					<div className="dts-form-component mg-grid__col--span-2">
						<label aria-invalid={!!errors.fields.organization}>
							<div className="dts-form-component__label">
								<span style={{ color: "red" }}>
									<abbr title="mandatory">*</abbr>
								</span>
								Organisation
							</div>
							<input
								type="text"
								name="organization"
								placeholder="Enter organisation"
								defaultValue={fields.organization}
								autoComplete="organization"
								className={errors.fields.organization ? "error" : ""}
								aria-describedby={
									errors.fields.organization ? "organizationError" : undefined
								}
							/>
						</label>
						<div className="dts-form-component__hint">
							{errors.fields.organization && (
								<div
									className="dts-form-component__hint--error"
									id="organizationError"
									aria-live="assertive"
								>
									{errors.fields.organization[0]}
								</div>
							)}
							{/* Add description here if needed */}
						</div>
					</div>
				</div>

				<div className="mg-grid mg-grid__col-3">
					{/* Role Dropdown */}
					<div className="dts-form-component">
						<label aria-invalid={!!errors.fields.role}>
							<div className="dts-form-component__label">
								<span style={{ color: "red" }}>
									<abbr title="mandatory">*</abbr>
								</span>
								Role
							</div>
							<select
								name="role"
								value={selectedRole}
								onChange={(e) => setSelectedRole(e.target.value)}
								autoComplete="off"
								className={errors.fields.role ? "error" : ""}
								aria-describedby={errors.fields.role ? "roleError" : undefined}
							>
								<option value="">select role</option>
								{getCountryRoles().map((role) => (
									<option key={role.id} value={role.id}>
										{role.label}
									</option>
								))}
							</select>
						</label>
						{errors.fields.role && (
							<div className="dts-form-component__hint">
								<div
									className="dts-form-component__hint--error"
									id="roleError"
									aria-live="assertive"
								>
									{errors.fields.role[0]}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Role Summary */}
				<div className="dts-form__additional-content mg-grid__col--span-2">
					<div className="dts-heading-5">
						You have selected {selectedRole || "[Role]"}
					</div>
					{roleDesc && (
						<div>
							A <b>{capitalizeFirstLetter(selectedRole)}</b> is able to{" "}
							<i>{capitalizeFirstLetter(roleDesc)}</i>
						</div>
					)}
				</div>

				{/* Action Buttons */}
				<div className="dts-form__actions dts-form__actions--standalone">
					<SubmitButton
						className="mg-button mg-button-primary"
						label="Add User"
					/>
					<LangLink
						lang={ctx.lang}
						to="/settings/access-mgmnt"
						className="mg-button mg-button-outline"
					>
						Discard
					</LangLink>
				</div>
			</Form>
		</MainContainer>
	);
}
