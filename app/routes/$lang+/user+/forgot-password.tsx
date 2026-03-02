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

import { randomBytes } from "crypto";
import { sendEmail } from "~/utils/email";
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
import { classNames } from "primereact/utils";
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
	await resetPasswordSilentIfNotFound(data.email, resetToken);

	//Send email
	const resetURL = ctx.fullUrl(
		`/user/reset-password?token=${resetToken}&email=${encodeURIComponent(
			data.email,
		)}`,
	);

	const subject = ctx.t({
		code: "user_forgot_password.reset_password_request",
		msg: "Reset password request",
	});
	const text = ctx.t(
		{
			code: "user_forgot_password.reset_password_email_text",
			desc: "Text version of the reset password email.",
			msg: [
				"A request to reset your password has been made. If you did not make this request, simply ignore this email.",
				"Copy and paste the following link into your browser URL to reset your password:{resetURL}",
				"This link will expire in 1 hour.",
			],
		},
		{ resetURL: resetURL },
	);
	const html = ctx.t(
		{
			code: "user_forgot_password.reset_password_email_html",
			desc: "HTML version of the reset password email.",
			msg: [
				"<p>A request to reset your password has been made. If you did not make this request, simply ignore this email.</p>",
				"<p>Click the link below to reset your password:",
				'<a href="{resetURL}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; background-color: #007BFF; text-decoration: none; border-radius: 5px;">',
				"Reset password",
				"</a>",
				"</p>",
				"<p>This link will expire in 1 hour.</p>",
			],
		},
		{ resetURL: resetURL },
	);

	try {
		await sendEmail(data.email, subject, text, html);
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

	return Response.json({
		success: ctx.t({
			code: "user_forgot_password.email_sent_inline_message",
			msg: "Please check your main box, we have sent a link on mail.",
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
		<>
			<div className="flex align-items-center justify-content-center min-h-screen surface-ground">
				<Card className="w-full md:w-6 lg:w-4 shadow-4 border-round-xl">
					<div className="text-center mb-4">
						<h2 className="m-2">
							{ctx.t({
								code: "user_forgot_password.forgot_password",
								msg: "Forgot your password?",
							})}
						</h2>
						<Message
							className="mb-2"
							severity="warn"
							text={`* ${ctx.t({
								code: "common.required_information",
								desc: "Indicates required information on login form",
								msg: "Required information",
							})}`}
						/>
					</div>
					<div className="flex flex-column gap-1 align-items-start text-left w-full">
						{errors.general && (
							<Message
								className="mb-2"
								severity="error"
								text={errors.general}
							/>
						)}
					</div>

					<Form ctx={ctx} id="reset-password-form" errors={errors}>
						<div className="flex flex-column gap-4">
							<input
								type="hidden"
								name="csrfToken"
								value={loaderData.csrfToken}
							/>

							<div className="flex flex-column gap-2">
								<label htmlFor="email" className="font-semibold">
									{ctx.t({
										code: "user_login.email_address",
										msg: "Email address",
									})}
									<span style={{ color: "red" }}> *</span>
								</label>
								<InputText
									id="email"
									type="email"
									name="email"
									className={classNames("w-full")}
									placeholder={ctx.t({
										code: "user_login.enter_your_email",
										msg: "Enter your email",
										desc: "Placeholder for email input text on login form",
									})}
									disabled={!!successMessage}
									required
								/>
								{errors?.fields?.email && (
									<div className="dts-form-component__hint--error">
										{errorToString(errors.fields.email[0])}
									</div>
								)}
							</div>

							<Button
								type="submit"
								label={ctx.t({
									code: "user_forgot_password.reset_password",
									msg: "Reset Password",
								})}
								icon="pi pi-envelope"
								loading={isSubmitting}
								disabled={!!successMessage}
								className="w-full mt-2"
							/>
							<u>
								<LangLink lang={ctx.lang} to="/user/login">
									{ctx.t({
										code: "common.back",
										msg: "Back",
									})}
								</LangLink>
							</u>
							{successMessage && (
								<Message
									severity="success"
									className="w-full"
									text={successMessage}
								/>
							)}
						</div>
					</Form>
				</Card>
			</div>
		</>
	);
}
