import {
	ActionFunctionArgs,
	LoaderFunctionArgs,
	MetaFunction,
	useNavigation,
} from "react-router";
import { useActionData, useLoaderData } from "react-router";
import { Form } from "react-router";
import { validateInviteCode } from "~/backend.server/models/user/invite";

import { ViewContext } from "~/frontend/context";

import { htmlTitle } from "~/utils/htmlmeta";
import { Card } from "primereact/card";
import { Message } from "primereact/message";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { LangLink } from "~/utils/link";
import { UserRepository } from "~/db/queries/UserRepository";
import { passwordHash } from "~/utils/passwordUtil";
import { BackendContext } from "~/backend.server/context";
import { sendWelcomeRegistrationEmail } from "~/utils/emailUtil";
import { ErrorState } from "~/components/ErrorState";
import { redirectWithMessage } from "~/utils/session";

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

type FieldErrors = {
	firstName?: string;
	lastName?: string;
	password?: string;
	passwordRepeat?: string;
	email?: string;
	form?: string;
};

export const action = async (actionArgs: ActionFunctionArgs) => {
	const formData = await actionArgs.request.formData();

	const firstName = String(formData.get("firstName") || "").trim();
	const lastName = String(formData.get("lastName") || "").trim();
	const password = String(formData.get("password") || "");
	const passwordRepeat = String(formData.get("passwordRepeat") || "");
	const email = String(formData.get("email") || "");

	const errors: FieldErrors = {};

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	// Email
	if (!email) {
		errors.email = "Email is required.";
	} else if (!emailRegex.test(email)) {
		errors.email = "Invalid email address.";
	}

	// First name
	if (!firstName) {
		errors.firstName = "First name is required.";
	} else if (firstName.length < 3) {
		errors.firstName = "First name must be at least 3 characters.";
	}

	// Last name
	if (!lastName) {
		errors.lastName = "Last name is required.";
	} else if (lastName.length < 3) {
		errors.lastName = "Last name must be at least 3 characters.";
	}

	// Password checks
	if (password.length < 12) {
		errors.password = "Password must be at least 12 characters.";
	}

	const hasUpper = /[A-Z]/.test(password);
	const hasLower = /[a-z]/.test(password);
	const hasNumber = /[0-9]/.test(password);
	const hasSpecial = /[^A-Za-z0-9]/.test(password);

	const conditionsCount =
		Number(hasUpper) +
		Number(hasLower) +
		Number(hasNumber) +
		Number(hasSpecial);

	if (conditionsCount < 2) {
		errors.password =
			"Password must include at least two of the following: uppercase, lowercase, number, special character.";
	}

	if (password === email) {
		errors.password = "Password cannot be the same as the username.";
	}

	if (password !== passwordRepeat) {
		errors.passwordRepeat = "Passwords do not match.";
	}

	const user = await UserRepository.getByEmail(email);
	if (!user) {
		errors.email = "No user exist with this email";
	}

	if (Object.keys(errors).length > 0) {
		return { ok: false, errors };
	}

	//Update user data in the table
	if (user) {
		await UserRepository.updateById(user.id, {
			inviteCode: "",
			password: passwordHash(password),
			firstName: firstName,
			lastName: lastName,
			emailVerified: true,
		});

		//send welcome email to the user.
		const ctx = new BackendContext(actionArgs);
		sendWelcomeRegistrationEmail(ctx, email, firstName, lastName);
	}

	//Redirect 
	const ctx = new BackendContext(actionArgs);
	return redirectWithMessage(actionArgs, "/user/login", {
		type: "info",
		text: ctx.t({
			code: "your_account_has_been_set_up_successfully.",
			msg: "Your account has been set up successfully. You can sign in now",
		})
		,
	});
};

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const inviteCode = loaderData.inviteCode;
	const email = loaderData.email;
	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors ?? {};

	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";

	if (!loaderData.inviteCodeValidation.ok) {
		return (
			<>
				<ErrorState
					ctx={ctx}
					title="Invalid Invitation"
					message={loaderData.inviteCodeValidation.error}
				/>
			</>
		);
	}
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
			<Card className="w-full max-w-lg rounded-2xl shadow-xl p-8">

				{/* Header */}
				<div className="mb-8 text-center">
					<h2 className="mb-3 text-2xl font-semibold text-gray-900">
						{ctx.t({
							code: "users.create_your_account_heading",
							msg: "Create your account",
						})}
					</h2>

					<p className="mb-4 text-gray-600">
						{ctx.t({
							code: "users.create_account_fill_details",
							msg: "Create your account by filling in the required details.",
						})}
					</p>

					<Message
						severity="warn"
						className="mb-4"
						text={`* ${ctx.t({
							code: "common.required_information",
							desc: "Indicates required information on login form",
							msg: "Required information",
						})}`}
					/>
				</div>

				<Form method="post" id="reset-password-form" noValidate>
					<div className="flex flex-col gap-6">

						<input name="inviteCode" type="hidden" defaultValue={inviteCode} />

						{/* Email */}
						<div className="flex flex-col gap-2">
							<label htmlFor="email" className="font-semibold text-gray-800">
								{ctx.t({ code: "user_login.email_address", msg: "Email address" })}
								<span className="text-red-500"> *</span>
							</label>

							<InputText
								id="email"
								type="email"
								name="email"
								className="w-full"
								placeholder={ctx.t({
									code: "user_login.enter_your_email",
									msg: "Enter your email",
								})}
								readOnly
								required
								defaultValue={email}
							/>
						</div>

						{/* First Name */}
						<div className="flex flex-col gap-2">
							<label htmlFor="firstName" className="font-semibold text-gray-800">
								{ctx.t({ code: "users.first_name_placeholder", msg: "First name" })}
								<span className="text-red-500"> *</span>
							</label>

							<InputText
								id="firstName"
								name="firstName"
								className="w-full"
								required
								autoFocus
								invalid={!!errors.firstName}
							/>

							{errors.firstName && (
								<small className="text-sm text-red-500">
									{errors.firstName}
								</small>
							)}
						</div>

						{/* Last Name */}
						<div className="flex flex-col gap-2">
							<label htmlFor="lastName" className="font-semibold text-gray-800">
								{ctx.t({ code: "users.last_name_placeholder", msg: "Last name" })}
								<span className="text-red-500"> *</span>
							</label>

							<InputText
								id="lastName"
								name="lastName"
								className="w-full"
								required
								invalid={!!errors.lastName}
							/>

							{errors.lastName && (
								<small className="text-sm text-red-500">
									{errors.lastName}
								</small>
							)}
						</div>

						{/* Password */}
						<div className="flex flex-col gap-2">
							<label htmlFor="password" className="font-semibold text-gray-800">
								{ctx.t({ code: "user_login.password" })}
								<span className="text-red-500"> *</span>
							</label>

							<Password
								id="password"
								name="password"
								toggleMask
								feedback={false}
								minLength={12}
								required
								invalid={!!errors.password}
								pt={{
									iconField: { root: { className: "w-full" } },
									input: { className: "w-full" },
								}}
							/>


							{errors.password && (
								<small className="text-sm text-red-500">
									{errors.password}
								</small>
							)}
						</div>

						{/* Confirm Password */}
						<div className="flex flex-col gap-2">
							<label htmlFor="passwordRepeat" className="font-semibold text-gray-800">
								{ctx.t({ code: "users.confirm_password_placeholder", msg: "Confirm password" })}
								<span className="text-red-500"> *</span>
							</label>

							<Password
								id="passwordRepeat"
								name="passwordRepeat"
								toggleMask
								feedback={false}
								minLength={12}
								required
								invalid={!!errors.passwordRepeat}
								pt={{
									iconField: { root: { className: "w-full" } },
									input: { className: "w-full" },
								}}
							/>

							{errors.passwordRepeat && (
								<small className="text-sm text-red-500">
									{errors.passwordRepeat}
								</small>
							)}
						</div>

						{/* Password Rules */}
						<div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
							<ul className="list-disc space-y-2 pl-5">
								<li>
									{ctx.t(
										{ code: "users.password.min_characters", msg: "At least {min} characters long" },
										{ min: 12 }
									)}
								</li>
								<li>
									{ctx.t({ code: "users.password.two_conditions", msg: "Must include two of the following:" })}
									<ul className="mt-2 list-disc space-y-1 pl-5">
										<li>{ctx.t({ code: "users.password.uppercase", msg: "Uppercase letters" })}</li>
										<li>{ctx.t({ code: "users.password.lowercase", msg: "Lowercase letters" })}</li>
										<li>{ctx.t({ code: "users.password.numbers", msg: "Numbers" })}</li>
										<li>{ctx.t({ code: "users.password.special_characters", msg: "Special characters" })}</li>
									</ul>
								</li>
								<li>{ctx.t({ code: "users.password.not_username", msg: "Cannot be the same as the username" })}</li>
								<li>{ctx.t({ code: "users.password.not_common", msg: "Should not be a simple password" })}</li>
							</ul>
						</div>

						{/* Submit */}
						<Button
							type="submit"
							label={ctx.t({ code: "users.setup_account", msg: "Set up account" })}
							icon="pi pi-user-plus"
							loading={isSubmitting}
							className="w-full"
							disabled={!!actionData?.ok}
						/>

						{/* Footer */}
						<div className="space-y-4 text-center">
							<LangLink
								lang={ctx.lang}
								to="/"
								className="text-sm text-blue-600 underline hover:text-blue-800"
							>
								{ctx.t({ code: "home", msg: "Home" })}
							</LangLink>

							{actionData?.ok && (
								<>
									<Message
										severity="success"
										className="w-full"
										text={ctx.t({
											code: "your_account_has_been_set_up_successfully.",
											msg: "Your account has been set up successfully. Click sign in below",
										})}
									/>

									<LangLink
										lang={ctx.lang}
										to="/user/login"
										className="block text-sm text-blue-600 underline hover:text-blue-800"
									>
										{ctx.t({ code: "sign_in", msg: "Sign in" })}
									</LangLink>
								</>
							)}
						</div>

					</div>
				</Form>
			</Card>
		</div>
	);
}
