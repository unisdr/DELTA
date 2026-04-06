import { SelectUser } from "~/drizzle/schema";
import { sendEmail } from "./email";
import { configPublicUrl } from "~/utils/config";

function rootUrl(): string {
	return configPublicUrl();
}

function fullUrl(path: string): string {
	const base = rootUrl();
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${base}${normalizedPath}`;
}

export async function sendForgotPasswordEmail(
	email: string,
	resetToken: string,
) {
	const resetURL = fullUrl(
		`/user/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`,
	);

	const subject = "Reset password request";
	const text = `A request to reset your password has been made. If you did not make this request, simply ignore this email.\nCopy and paste the following link into your browser URL to reset your password:\n${resetURL}\nThis link will expire in 1 hour.`;
	const html = `<p>A request to reset your password has been made. If you did not make this request, simply ignore this email.</p>\n<p>Click the link below to reset your password:\n<a href="${resetURL}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; background-color: #007BFF; text-decoration: none; border-radius: 5px;">\nReset password\n</a>\n</p>\n<p>This link will expire in 1 hour.</p>`;

	await sendEmail(email, subject, text, html);
}

export async function sendWelcomeRegistrationEmail(
	email: string,
	firstName: string,
	lastName: string,
) {
	const accessAccountURL = fullUrl("/user/settings/");
	const siteName = "DELTA Resilience";
	const subject = `Welcome to ${siteName}`;

	const html = `<p>Dear ${firstName} ${lastName},</p>\n<p> Welcome to the ${siteName} system. Your user account has been successfully created.</p>\n<p> Click the link below to access your account.</p>\n<p>\n<a href="${accessAccountURL}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; background-color: #007BFF; text-decoration: none; border-radius: 5px;">\nAccess account\n</a>\n</p>`;

	const text = `Dear ${firstName} ${lastName},\n\nWelcome to the ${siteName} system. Your user account has been successfully created.\n\nClick the link below to access your account.\n\n${accessAccountURL}`;
	await sendEmail(email, subject, text, html);
}
export async function sendInviteForNewUser(
	user: SelectUser,
	siteName: string,
	role: string,
	countryName: string,
	countryAccountType: string,
	inviteCode: string,
) {
	const inviteURL = fullUrl(
		"/user/accept-invite-welcome?inviteCode=" + inviteCode,
	);
	const subject = `Invitation to join DELTA Resilience ${siteName}`;

	const html = `<p>You have been invited to join the DELTA Resilience ${siteName} system as \na/an ${role} user for the country ${countryName} ${countryAccountType} instance.\n</p>\n<p> Click on the link below to create your account.</p>\n<p>\n<a href="${inviteURL}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; background-color: #007BFF; text-decoration: none; border-radius: 5px;">\nSet up account\n</a>\n</p>\n<p> <a href="${inviteURL}"> ${inviteURL} </a></p>`;

	const text = `You have been invited to join the DELTA Resilience ${siteName} system as \na/an ${role} user for the country ${countryName} ${countryAccountType} instance.\nCopy and paste the following link into your browser URL to create your account:\n${inviteURL}`;

	await sendEmail(user.email, subject, text, html);
}

export async function sendInviteForExistingUser(
	user: SelectUser,
	siteName: string,
	role: string,
	countryName: string,
	countryAccountType: string,
) {
	const subject = `Invitation to join DELTA Resilience ${siteName}`;
	const appRootUrl = rootUrl();
	const html = `<p>You have been invited to join the DELTA Resilience ${siteName} system as \na/an ${role} user for the country ${countryName} ${countryAccountType} instance.\n</p>\n<p> Click on the link below to login to your account.</p>\n<p>\n<a href="${appRootUrl}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; background-color: #007BFF; text-decoration: none; border-radius: 5px;">\nLog in\n</a>\n</p>\n<p> <a href="${appRootUrl}"> ${appRootUrl} </a></p>`;

	const text = `You have been invited to join the DELTA Resilience ${siteName} system as \na/an ${role} user for the country ${countryName} ${countryAccountType} instance.\nCopy and paste the following link into your browser URL to log in to your account:\n${appRootUrl}`;

	await sendEmail(user.email, subject, text, html);
}
