import {
	ActionFunctionArgs,
	LoaderFunctionArgs,
	MetaFunction,
	useNavigation,
} from "react-router";
import { useLoaderData, useActionData } from "react-router";
import { configAuthSupportedForm } from "~/utils/config";
import { Form, Errors as FormErrors, errorToString } from "~/frontend/form";
import { formStringData } from "~/utils/httputil";
import { resetPasswordSilentIfNotFound } from "~/backend.server/models/user/password";
import { sendForgotPasswordEmail } from "~/utils/emailUtil";

import { randomBytes } from "crypto";
import { sessionCookie } from "~/utils/session";
import { createCSRFToken } from "~/utils/csrf";
import { redirectLangFromRoute } from "~/utils/url.backend";

import { ViewContext } from "~/frontend/context";
import { BackendContext } from "~/backend.server/context";
import { LangLink } from "~/utils/link";
import { htmlTitle } from "~/utils/htmlmeta";
import { Card } from "primereact/card";
import { Message } from "primereact/message";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";

interface FormFields {
	email: string;
}
type LoaderData = {
	csrfToken: string;
};
// Add loader to check if form auth is supported
export const loader = async (
	loaderArgs: LoaderFunctionArgs,
): Promise<Response> => {
	const { request } = loaderArgs;

	// If form authentication is not supported, redirect to login
	if (!configAuthSupportedForm()) {
		return redirectLangFromRoute(loaderArgs, "/user/login");
	}

	const csrfToken = createCSRFToken();

	// Set the CSRF token in the session variable
	const cookieHeader = request.headers.get("Cookie") || "";
	const session = await sessionCookie().getSession(cookieHeader);
	session.set("csrfToken", csrfToken);
	const setCookie = await sessionCookie().commitSession(session);

	return Response.json(
		{
			csrfToken: csrfToken,
		} as LoaderData,
		{ headers: { "Set-Cookie": setCookie } },
	);
};

type ActionData = {
	data?: FormFields;
	errors?: FormErrors<FormFields>;
	success?: string;
};
export const action = async (actionArgs: ActionFunctionArgs) => {
	const { request } = actionArgs;
	const ctx = new BackendContext(actionArgs);

	// Check if form authentication is supported
	if (!configAuthSupportedForm()) {
		return redirectLangFromRoute(actionArgs, "/user/login");
	}

	const formData = formStringData(await request.formData());
	let data: FormFields = {
		email: formData.email || "",
	};

	const cookieHeader = request.headers.get("Cookie") || "";
	const sessionCurrent = await sessionCookie().getSession(cookieHeader);

	if (formData.csrfToken !== sessionCurrent.get("csrfToken")) {
		return Response.json(
			{
				data,
				errors: {
					general: [
						ctx.t({
							code: "common.csrf_validation_failed",
							desc: "Error message when CSRF validation fails.",
							msg: "CSRF validation failed. Please ensure you're submitting the form from a valid session. For your security, please restart your browser and try again.",
						}),
					],
				},
			},
			{ status: 400 },
		);
	}

	let errors: FormErrors<FormFields> = {};

	if (!data.email) {
		errors = {
			fields: {
				email: ["Email is required"],
			},
		};
		return { data, errors };
	}

	// do not show an error message if the email is not found in the database
	const resetToken = randomBytes(32).toString("hex");
	const userExists = await resetPasswordSilentIfNotFound(data.email, resetToken);

	if (userExists) {
		try {
			await sendForgotPasswordEmail(ctx, data.email, resetToken);
		} catch (error) {
			return Response.json(
				{
					data,
					errors: {
						general: [
							ctx.t({
								code: "user_forgot_password.email_sending_failure",
								desc: "Error message when email sending fails due to system configuration issue.",
								msg: "Unable to send email due to a system configuration issue. Please contact your system administrator to report this problem.",
							}),
						],
					},
				},
				{ status: 500 },
			);
		}
	}

	return Response.json({
		success: ctx.t({
			code: "user_forgot_password.email_sent_inline_message",
			msg: "Check your inbox for a password reset link if this email is associated with an account.",
			desc: "A message when correct email format entered in forgot password page.",
		}),
	});
};

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(
				ctx,
				ctx.t({
					code: "meta.forgot_password",
					msg: "Forgot Password",
				}),
			),
		},
		{
			name: "description",
			content: ctx.t({
				code: "meta.forgot_password",
				msg: "Forgot Password",
			}),
		},
	];
};

export default function Screen() {
	const loaderData = useLoaderData<LoaderData>();
	const ctx = new ViewContext();
	const actionData = useActionData() as ActionData | undefined;
	const errors = actionData?.errors || {};
	const successMessage = actionData?.success;

	const navigation = useNavigation();
	const isSubmitting =
		navigation.state === "submitting" &&
		navigation.formData?.get("email") != null;

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
			<Card className="w-full max-w-md rounded-2xl shadow-xl p-6">

				{/* Header */}
				<div className="mb-6 text-center">
					<h2 className="mb-3 text-2xl font-semibold text-gray-800">
						{ctx.t({
							code: "user_forgot_password.forgot_password",
							msg: "Forgot your password?",
						})}
					</h2>

				</div>

				<div className="mb-2 text-red-500">
					{`* ${ctx.t({
						code: "common.required_information",
						msg: "Required information",
					})}`}
				</div>
				{/* General Error */}
				{errors.general && (
					<div className="mb-4">
						<Message
							severity="error"
							text={errors.general}
						/>
					</div>
				)}

				<Form ctx={ctx} id="reset-password-form" errors={errors}>
					<div className="flex flex-col gap-6">

						<input
							type="hidden"
							name="csrfToken"
							value={loaderData.csrfToken}
						/>

						{/* Email */}
						<div className="flex flex-col gap-2">
							<label htmlFor="email" className="font-semibold text-gray-800">
								{ctx.t({
									code: "user_login.email_address",
									msg: "Email address",
								})}
								<span className="text-red-500"> *</span>
							</label>

							<div className="p-inputgroup login-inputgroup">
								<span className="p-inputgroup-addon">
									<i className="pi pi-envelope"></i>
								</span>
								<InputText
									id="email"
									type="email"
									name="email"
									className="w-full"
									placeholder={ctx.t({
										code: "user_login.enter_your_email",
										msg: "Enter your email",
										desc: "Placeholder for email input text on login form",
									})}
									disabled={!!successMessage}
									required
								/>
							</div>

							{errors?.fields?.email && (
								<div className="text-sm text-red-500">
									{errorToString(errors.fields.email[0])}
								</div>
							)}
						</div>

						{/* Submit */}
						<Button
							type="submit"
							label={ctx.t({
								code: "user_forgot_password.reset_password",
								msg: "Reset Password",
							})}
							icon="pi pi-envelope"
							loading={isSubmitting}
							disabled={!!successMessage}
							className="w-full"
						/>

						{/* Back Link */}
						<div>
							<LangLink
								lang={ctx.lang}
								to="/user/login"
								className="text-sm text-blue-600 underline hover:text-blue-800"
							>
								{ctx.t({
									code: "common.back",
									msg: "Back",
								})}
							</LangLink>
						</div>

						{/* Success */}
						{successMessage && (
							<div>
								<Message
									severity="success"
									className="w-full"
									text={successMessage}
								/>
							</div>
						)}
					</div>
				</Form>
			</Card>
		</div>
	);
}
