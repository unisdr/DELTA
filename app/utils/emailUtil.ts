import { BackendContext } from "~/backend.server/context";
import { sendEmail } from "./email";
import { SelectUser } from "~/drizzle/schema";

export async function sendForgotPasswordEmail(
	ctx: BackendContext,
	email: string,
	resetToken: string,
) {
	const resetURL = ctx.fullUrl(
		`/user/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`,
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

	await sendEmail(email, subject, text, html);
}

export async function sendWelcomeRegistrationEmail(
	ctx: BackendContext,
	email: string,
	firstName: string,
	lastName: string,
) {
	const accessAccountURL = ctx.fullUrl("/user/settings/");
	const siteName = "DELTA Resilience";
	const subject = ctx.t(
		{
			code: "user_invite.welcome_email_subject",
			msg: "Welcome to DELTA Resilience {siteName}",
		},
		{ siteName: siteName },
	);

	const html = ctx.t(
		{
			code: "user_invite.welcome_email_html",
			msg: [
				"<p>Dear {firstName} {lastName},</p>",
				"<p> Welcome to the DELTA Resilience {siteName} system.Your user account has been successfully created.</p>",
				"<p> Click the link below to access your account.</p>",
				"<p>",
				'<a href="{accessAccountURL}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; background-color: #007BFF; text-decoration: none; border-radius: 5px;">',
				"Access account",
				"</a>",
				"</p>",
			],
		},
		{
			firstName: firstName,
			lastName: lastName,
			siteName: siteName,
			accessAccountURL: accessAccountURL,
		},
	);

	const text = ctx.t(
		{
			code: "user_invite.welcome_email_text",
			msg: [
				"Dear {firstName} {lastName},",
				"",
				"Welcome to the DELTA Resilience {siteName} system. Your user account has been successfully created.",
				"",
				"Click the link below to access your account.",
				"",
				"{accessAccountURL}",
			],
		},
		{
			firstName: firstName,
			lastName: lastName,
			siteName: siteName,
			accessAccountURL: accessAccountURL,
		},
	);
	await sendEmail(email, subject, text, html);
}
export async function sendInviteForNewUser(
	ctx: BackendContext,
	user: SelectUser,
	siteName: string,
	role: string,
	countryName: string,
	countryAccountType: string,
	inviteCode: string,
) {
	const inviteURL = ctx.fullUrl(
		"/user/accept-invite-welcome?inviteCode=" + inviteCode,
	);
	const subject = ctx.t(
		{
			code: "user_invite.new_email_subject",
			msg: "Invitation to join DELTA Resilience {siteName}",
		},
		{ siteName: siteName },
	);

	const html = ctx.t(
		{
			code: "user_invite.new_email_html",
			msg: [
				"<p>You have been invited to join the DELTA Resilience {siteName} system as ",
				"a/an {role} user for the country {countryName} {countryAccountType} instance.",
				"</p>",
				"<p> Click on the link below to create your account.</p>",
				"<p>",
				'<a href="{inviteURL}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; background-color: #007BFF; text-decoration: none; border-radius: 5px;">',
				"Set up account",
				"</a>",
				"</p>",
				'<p> <a href="{inviteURL}"> {inviteURL} </a></p>',
			],
		},
		{
			siteName: siteName,
			role: role,
			countryName: countryName,
			countryAccountType: countryAccountType,
			inviteURL: inviteURL,
		},
	);

	const text = ctx.t(
		{
			code: "user_invite.new_email_text",
			msg: [
				"You have been invited to join the DELTA Resilience {siteName} system as ",
				"a/an {role} user for the country {countryName} {countryAccountType} instance.",
				"Copy and paste the following link into your browser url to create your account:",
				"{inviteURL}",
			],
		},
		{
			siteName: siteName,
			role: role,
			countryName: countryName,
			countryAccountType: countryAccountType,
			inviteURL: inviteURL,
		},
	);

	await sendEmail(user.email, subject, text, html);
}

export async function sendInviteForExistingUser(
	ctx: BackendContext,
	user: SelectUser,
	siteName: string,
	role: string,
	countryName: string,
	countryAccountType: string,
) {
	const subject = ctx.t(
		{
			code: "user_invite.new_email_subject",
			msg: "Invitation to join DELTA Resilience {siteName}",
		},
		{ siteName: siteName },
	);
	const rootUrl = ctx.rootUrl();
	const html = ctx.t(
		{
			code: "user_invite.existing_email_html",
			msg: [
				"<p>You have been invited to join the DELTA Resilience {siteName} system as ",
				"a/an {role} user for the country {countryName} {countryAccountType} instance.",
				"</p>",
				"<p> Click on the link below to login to your account.</p>",
				"<p>",
				'<a href="{rootUrl}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; background-color: #007BFF; text-decoration: none; border-radius: 5px;">',
				"Login in",
				"</a>",
				"</p>",
				'<p> <a href="{rootUrl}"> {rootUrl} </a></p>',
			],
		},
		{
			siteName: siteName,
			role: role,
			countryName: countryName,
			countryAccountType: countryAccountType,
			rootUrl: rootUrl,
		},
	);

	const text = ctx.t(
		{
			code: "user_invite.existing_email_text",
			msg: [
				"You have been invited to join the DELTA Resilience {siteName} system as ",
				"a/an {role} user for the country {countryName} {countryAccountType} instance.",
				"Copy and paste the following link into your browser url to login to your account:",
				"{rootUrl}",
			],
		},
		{
			siteName: siteName,
			role: role,
			countryName: countryName,
			countryAccountType: countryAccountType,
			rootUrl: rootUrl,
		},
	);

	await sendEmail(user.email, subject, text, html);
}
