import {
	ActionFunctionArgs,
	LoaderFunctionArgs,
	MetaFunction,
} from "react-router";
import { useActionData, useLoaderData } from "react-router";
import {
	Form,
	Field,
	SubmitButton,
	FieldErrorsStandard,
} from "~/frontend/form";
import { formStringData } from "~/utils/httputil";
import {
	createUserSession,
	getCountrySettingsFromSession,
	sessionCookie,
} from "~/utils/session";
import {
	acceptInvite,
	AcceptInviteFieldsFromMap,
	validateInviteCode,
} from "~/backend.server/models/user/invite";

import { useState, useEffect } from "react";
import { getUserCountryAccountsByUserId } from "~/db/queries/userCountryAccounts";
import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting";
import { redirectLangFromRoute } from "~/utils/url.backend";

import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";
import { htmlTitle } from "~/utils/htmlmeta";

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(
				ctx,
				ctx.t({
					code: "meta.create_your_account",
					msg: "Create your account",
				}),
			),
		},
		{
			name: "description",
			content: ctx.t({
				code: "meta.create_your_account_page",
				msg: "Create your account page.",
			}),
		},
	];
};

export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	const { request } = loaderArgs;
	const url = new URL(request.url);
	const inviteCode = url.searchParams.get("inviteCode") || "";
	const state = url.searchParams.get("state") || "";
	const queryStringCode = url.searchParams.get("code") || "";
	const res = await validateInviteCode(inviteCode);

	var email = "";
	if (res.ok == true) {
		email = res.email;
	}

	return {
		inviteCode: inviteCode,
		inviteCodeValidation: res,
		code: queryStringCode,
		state: state,
		email: email,
	};
};

export const action = async (actionArgs: ActionFunctionArgs) => {
	const { request } = actionArgs;
	const ctx = new BackendContext(actionArgs);

	const data = formStringData(await request.formData());
	const inviteCode = data["inviteCode"] || "";
	const data2 = AcceptInviteFieldsFromMap(data);

	const settings = await getCountrySettingsFromSession(request);
	const websiteName = settings ? settings.websiteName : "DELTA Resilience";
	const res = await acceptInvite(ctx, inviteCode, data2, websiteName);
	if (!res.ok) {
		return { data, errors: res.errors };
	}
	const headers = await createUserSession(res.userId);
	const userCountryAccounts = await getUserCountryAccountsByUserId(res.userId);

	if (userCountryAccounts && userCountryAccounts.length === 1) {
		const countrySettings = await getInstanceSystemSettingsByCountryAccountId(
			userCountryAccounts[0].countryAccountsId,
		);

		const session = await sessionCookie().getSession(headers["Set-Cookie"]);
		session.set("countryAccountsId", userCountryAccounts[0].countryAccountsId);
		session.set("userRole", userCountryAccounts[0].role);
		session.set("countrySettings", countrySettings);
		const setCookie = await sessionCookie().commitSession(session);

		return redirectLangFromRoute(actionArgs, "/", {
			headers: { "Set-Cookie": setCookie },
		});
	} else if (userCountryAccounts && userCountryAccounts.length > 1) {
		return redirectLangFromRoute(actionArgs, "/user/select-instance", {
			headers: headers,
		});
	}
	return redirectLangFromRoute(actionArgs, "/", { headers });
};

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const inviteCode = loaderData.inviteCode;
	const email = loaderData.email;
	const actionData = useActionData<typeof action>();

	const errors = actionData?.errors;
	const data = actionData?.data;

	const [firstname, setFirstname] = useState(data?.firstName || "");
	const [password, setPassword] = useState(data?.password || "");
	const [passwordRepeat, setPasswordRepeat] = useState(
		data?.passwordRepeat || "",
	);

	const [passwordType, setPasswordType] = useState("password");
	const [passwordRepeatType, setPasswordRepeatType] = useState("password");

	if (!loaderData.inviteCodeValidation.ok) {
		return (
			<>
				<p>{loaderData.inviteCodeValidation.error}</p>
			</>
		);
	}

	// Function to check if all form fields are valid
	const isFormValid = () => {
		const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		const hasUppercase = /[A-Z]/.test(password);
		const hasLowercase = /[a-z]/.test(password);
		const hasNumber = /\d/.test(password);
		const hasSpecialChar = /[@$!%*?&_]/.test(password);

		const hasTwoOfTheFollowing =
			[hasUppercase, hasLowercase, hasNumber, hasSpecialChar].filter(Boolean)
				.length >= 2;

		return (
			emailRegex.test(email) &&
			firstname &&
			password &&
			passwordRepeat &&
			password === passwordRepeat &&
			hasTwoOfTheFollowing &&
			password.length >= 12 &&
			password !== email
		);
	};

	useEffect(() => {
		// Submit button enabling only when required fields are filled
		const submitButton = document.querySelector(
			"[id='setup-button']",
		) as HTMLButtonElement;
		const imgToggle = document.querySelector(
			"[id='passwordToggleImg']",
		) as HTMLImageElement;
		const imgToggle2 = document.querySelector(
			"[id='passwordToggleImg2']",
		) as HTMLImageElement;
		if (submitButton) {
			// submitButton.disabled = true;
			// validateFormAndToggleSubmitButton('setup-form', 'setup-button');
			submitButton.disabled = !isFormValid(); // Initially disable submit if form is not valid
		}
		if (imgToggle) {
			imgToggle.style.display = "block";
		}
		if (imgToggle2) {
			imgToggle2.style.display = "block";
		}
	}, [email, firstname, password, passwordRepeat]);

	const togglePasswordVisibility = () => {
		setPasswordType(passwordType === "password" ? "text" : "password");
	};

	const toggleConfirmPasswordVisibility = () => {
		setPasswordRepeatType(
			passwordRepeatType === "password" ? "text" : "password",
		);
	};

	return (
		<>
			<div className="mg-container">
				<form className="dts-form dts-form--vertical">
					<div className="dts-form__header">
						<a
							href={`/user/accept-invite-welcome?inviteCode=${inviteCode}`}
							className="mg-button mg-button--small mg-button-system"
						>
							Back
						</a>
					</div>
					<div className="dts-form__intro">
						<h2 className="dts-heading-1">
							{ctx.t({
								code: "users.create_your_account_heading",
								msg: "Create your account",
							})}
						</h2>
						<p>
							{ctx.t({
								code: "users.create_account_fill_details",
								msg: "Create your account by filling in the required details.",
							})}
						</p>
					</div>
				</form>

				<Form
					ctx={ctx}
					id="setup-form"
					className="dts-form dts-form--vertical"
					errors={errors}
				>
					<div className="dts-form__body">
						<p>
							{"* " +
								ctx.t({
									code: "common.required_information",
									msg: "Required information",
								})}
						</p>

						<input
							name="inviteCode"
							type="hidden"
							defaultValue={inviteCode}
						></input>

						<Field label="" extraClassName="dts-form-component">
							<input
								type="text"
								name="email"
								placeholder={
									ctx.t({
										code: "users.email_address_placeholder",
										msg: "Email address",
									}) + "*"
								}
								defaultValue={email}
								readOnly
							></input>
						</Field>

						<Field label="" extraClassName="dts-form-component">
							<input
								type="text"
								name="firstName"
								placeholder={
									ctx.t({
										code: "users.first_name_placeholder",
										msg: "First name",
									}) + "*"
								}
								onChange={(e) => setFirstname(e.target.value)}
								defaultValue={data?.firstName}
								autoFocus
								required
							></input>
						</Field>
						<FieldErrorsStandard
							errors={errors}
							field="firstName"
						></FieldErrorsStandard>

						<Field label="" extraClassName="dts-form-component">
							<input
								type="text"
								name="lastName"
								placeholder={ctx.t({
									code: "users.last_name_placeholder",
									msg: "Last name",
								})}
								defaultValue={data?.lastName}
							></input>
						</Field>
						<FieldErrorsStandard
							errors={errors}
							field="lastName"
						></FieldErrorsStandard>

						<Field label="" extraClassName="dts-form-component">
							<div className="dts-form-component__pwd">
								<input
									type={passwordType}
									name="password"
									placeholder={
										ctx.t({
											code: "users.enter_password_placeholder",
											msg: "Enter password",
										}) + "*"
									}
									minLength={12}
									id="password"
									onChange={(e) => setPassword(e.target.value)}
									defaultValue={data?.password}
									required
								></input>
								<button
									type="button"
									onClick={togglePasswordVisibility}
									aria-label="Toggle password visibility"
									className="dts-form-component__pwd-toggle mg-button"
								>
									{passwordType === "password" ? (
										<img
											src="/assets/icons/eye-hide-password.svg"
											id="passwordToggleImg"
											style={{ display: "none" }}
											alt=""
										></img>
									) : (
										<img
											src="/assets/icons/eye-show-password.svg"
											id="passwordToggleImg"
											style={{ display: "none" }}
											alt=""
										></img>
									)}
								</button>
							</div>
						</Field>
						<FieldErrorsStandard
							errors={errors}
							field="password"
						></FieldErrorsStandard>

						<Field label="" extraClassName="dts-form-component">
							<div className="dts-form-component__pwd">
								<input
									type={passwordRepeatType}
									placeholder={
										ctx.t({
											code: "users.confirm_password_placeholder",
											msg: "Confirm password",
										}) + "*"
									}
									minLength={12}
									id="passwordRepeat"
									name="passwordRepeat"
									onChange={(e) => setPasswordRepeat(e.target.value)}
									defaultValue={data?.passwordRepeat}
									required
								></input>
								<button
									type="button"
									onClick={toggleConfirmPasswordVisibility}
									aria-label="Toggle password visibility"
									className="dts-form-component__pwd-toggle mg-button"
								>
									{passwordRepeatType === "password" ? (
										<img
											src="/assets/icons/eye-hide-password.svg"
											id="passwordToggleImg2"
											style={{ display: "none" }}
											alt=""
										></img>
									) : (
										<img
											src="/assets/icons/eye-show-password.svg"
											id="passwordToggleImg2"
											style={{ display: "none" }}
											alt=""
										></img>
									)}
								</button>
							</div>
						</Field>
						<FieldErrorsStandard
							errors={errors}
							field="passwordRepeat"
						></FieldErrorsStandard>

						<div className="dts-form-component__hint">
							<ul id="passwordDescription">
								<li>
									{ctx.t(
										{
											code: "users.password.min_characters",
											desc: "Minimum character length for password is 12",
											msg: "At least {min} characters long",
										},
										{ min: 12 },
									)}
								</li>
								<li>
									{ctx.t({
										code: "users.password.two_conditions",
										desc: "Password must include two of the specified character types",
										msg: "Must include two of the following:",
									})}

									<ul>
										<li>
											{ctx.t({
												code: "users.password.uppercase",
												msg: "Uppercase letters",
											})}
										</li>
										<li>
											{ctx.t({
												code: "users.password.lowercase",
												msg: "Lowercase letters",
											})}
										</li>
										<li>
											{ctx.t({
												code: "users.password.numbers",
												msg: "Numbers",
											})}
										</li>
										<li>
											{ctx.t({
												code: "users.password.special_characters",
												msg: "Special characters",
											})}
										</li>
									</ul>
								</li>
								<li>
									{ctx.t({
										code: "users.password.not_username",
										msg: "Cannot be the same as the username",
									})}
								</li>
								<li>
									{ctx.t({
										code: "users.password.not_common",
										msg: "Should not be a simple or commonly used password",
									})}
								</li>
							</ul>
						</div>
					</div>
					<div className="dts-form__actions">
						<SubmitButton
							id="setup-button"
							label={ctx.t({
								code: "users.setup_account",
								msg: "Set up account",
							})}
						></SubmitButton>
					</div>
				</Form>
			</div>
		</>
	);
}
