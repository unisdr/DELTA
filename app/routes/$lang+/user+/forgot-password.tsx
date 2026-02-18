import {
	ActionFunctionArgs,
	LoaderFunctionArgs,
	MetaFunction,
} from "react-router";
import { useLoaderData, useActionData } from "react-router";
import { configAuthSupportedForm } from "~/utils/config";
import {
	Form,
	Field,
	Errors as FormErrors,
	SubmitButton,
	errorToString,
	validateFormAndToggleSubmitButton,
} from "~/frontend/form";
import { formStringData } from "~/utils/httputil";
import { resetPasswordSilentIfNotFound } from "~/backend.server/models/user/password";
import { redirectWithMessage } from "~/utils/session";

import "react-toastify/dist/ReactToastify.css";

import { useEffect } from "react";
import { randomBytes } from "crypto";
import { sendEmail } from "~/utils/email";
import { toast } from "react-toastify/unstyled";
import Messages from "~/components/Messages";
import { sessionCookie } from "~/utils/session";
import { createCSRFToken } from "~/utils/csrf";
import { redirectLangFromRoute } from "~/utils/url.backend";

import { ViewContext } from "~/frontend/context";
import { BackendContext } from "~/backend.server/context";
import { LangLink } from "~/utils/link";
import { htmlTitle } from "~/utils/htmlmeta";

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
		// Return error response to stay on the same page
		return Response.json({
			data,
			errors: {
				fields: {
					email: [
						ctx.t({
							code: "user_forgot_password.email_sending_failure",
							desc: "Error message when email sending fails due to system configuration issue.",
							msg: "Unable to send email due to a system configuration issue. Please contact your system administrator to report this problem.",
						}),
					],
				},
			},
			status: 400,
		});
	}

	// Redirect with flash message using redirectWithMessage
	return redirectWithMessage(actionArgs, "/user/login", {
		type: "info",
		text: ctx.t({
			code: "user_forgot_password.email_sent_modal_message",
			msg: "If the provided email address exist in the system, an email will be sent with instructions to help you recover your password. Please check your inbox and follow the provided steps to regain access to your account.",
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
	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors || {};

	useEffect(() => {
		if (actionData?.errors?.fields?.email) {
			toast.error(errorToString(actionData.errors.fields.email[0]));
		}
	}, [actionData]);

	useEffect(() => {
		const submitButton = document.querySelector(
			"[id='reset-password-button']",
		) as HTMLButtonElement;
		if (submitButton) {
			submitButton.disabled = true;
			validateFormAndToggleSubmitButton(
				"reset-password-form",
				"reset-password-button",
			);
		}
	}, []);

	return (
		<>
			<div className="dts-page-container">
				<main className="dts-main-container">
					<div className="mg-container">
						<Form
							ctx={ctx}
							id="reset-password-form"
							className="dts-form dts-form--vertical"
							errors={errors}
						>
							<input
								type="hidden"
								name="csrfToken"
								value={loaderData.csrfToken}
							/>
							<div className="dts-form__header">
								<LangLink
									lang={ctx.lang}
									to="/user/login"
									className="mg-button mg-button--small mg-button-system"
								>
									{ctx.t({
										code: "common.back",
										msg: "Back",
									})}
								</LangLink>
							</div>
							<div className="dts-form__intro">
								{errors.general && <Messages messages={errors.general} />}

								<h2 className="dts-heading-1" style={{ marginBottom: "5px" }}>
									{ctx.t({
										code: "user_forgot_password.forgot_password",
										msg: "Forgot your password?",
									})}
								</h2>
								<p style={{ marginBottom: "2px" }}>
									{ctx.t({
										code: "user_forgot_password.intro_text",
										desc: "Instructions for user to provide email address to reset password",
										msg: "Please provide us with the email address associated with your account. We will send an email to help you reset your password.",
									})}
								</p>
							</div>
							<div className="dts-form__body" style={{ marginBottom: "2px" }}>
								<p style={{ marginBottom: "2px" }}>
									*
									{ctx.t({
										code: "common.required_information",
										msg: "Required information",
									})}
								</p>

								<Field label="">
									<input
										type="email"
										autoComplete="off"
										name="email"
										placeholder="*E-mail address"
										required
										style={{
											padding: "10px 20px",
											fontSize: "16px",
											width: "100%",
											borderRadius: "4px",
											border: errors?.fields?.email
												? "1px solid red"
												: "1px solid #ccc",
											boxSizing: "border-box",
										}}
									></input>
									{errors?.fields?.email && (
										<div
											style={{
												color: "red",
												fontSize: "12px",
												marginTop: "0px",
												marginBottom: "0px",
											}}
										>
											{errorToString(errors.fields.email[0])}
										</div>
									)}
								</Field>
								<SubmitButton
									className="mg-button mg-button-primary"
									label={ctx.t({
										code: "user_forgot_password.reset_password",
										msg: "Reset Password",
									})}
									id="reset-password-button"
									style={{
										width: "100%",
										marginTop: "20px",
									}}
								></SubmitButton>
							</div>
						</Form>
					</div>
				</main>
			</div>
		</>
	);
}
