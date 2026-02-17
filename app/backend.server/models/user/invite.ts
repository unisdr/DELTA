import { dr, Tx } from "~/db.server";
import { eq } from "drizzle-orm";

import { userTable, SelectUser } from "~/drizzle/schema";

import { Errors, hasErrors } from "~/frontend/form";

import { sendEmail } from "~/utils/email";
import { addHours } from "~/utils/time";

import { randomBytes } from "crypto";

import { validateName, validatePassword } from "./user_utils";
import { passwordHash } from "../../../utils/passwordUtil";
import {
	createUserCountryAccounts,
	doesUserCountryAccountExistByEmailAndCountryAccountsId,
} from "~/db/queries/userCountryAccounts";
import { BackendContext } from "~/backend.server/context";
import { createUser, getUserByEmail } from "~/db/queries/user";

type AdminInviteUserResult = { ok: true } | { ok: false; errors: Errors<AdminInviteUserFields> };

export interface AdminInviteUserFields {
	firstName: string;
	lastName: string;
	email: string;
	organization: string;
	hydrometCheUser: boolean;
	role: string;
}

export function adminInviteUserFieldsFromMap(data: {
	[key: string]: string;
}): AdminInviteUserFields {
	const fields: (keyof AdminInviteUserFields)[] = [
		"email",
		"firstName",
		"lastName",
		"organization",
		"role",
	];
	let res = Object.fromEntries(fields.map((field) => [field, data[field] || ""])) as Omit<
		AdminInviteUserFields,
		"hydrometCheUser"
	>;
	const result: AdminInviteUserFields = {
		...res,
		hydrometCheUser: data.hydrometCheUser === "on",
	};
	return result;
}

/**
 * Handles the full admin-driven user invitation flow for a given country account.
 *
 * This function validates the input, determines whether the user already exists
 * in the system, and applies the appropriate invitation strategy:
 *
 * - If the user does not exist, it creates the user, associates them with the
 *   specified country account, and sends an initial invitation email.
 * - If the user already exists and is email-verified, it adds the user to the
 *   country account and sends a standard invitation notification.
 * - If the user exists but has not yet verified their email, it extends the
 *   validity of the existing invitation and re-sends the invitation email using
 *   the same invite code to avoid multiple concurrent invitations.
 *
 * All user creation and country-account association operations are executed
 * within database transactions to ensure consistency.
 *
 * The function returns validation errors if the input is incomplete or if a user
 * with the same email already exists for the given country account.
 */
export async function adminInviteUser(
	ctx: BackendContext,
	fields: AdminInviteUserFields,
	countryAccountsId: string,
	siteName: string,
	countryName: string,
	countryAccountType: string,
): Promise<AdminInviteUserResult> {
	let errors: Errors<AdminInviteUserFields> = {};
	errors.form = [];
	errors.fields = {};

	// is user having a firstname, email, role and organization defined?
	// we should note that if the user exists, these will be ignored
	if (!fields.firstName || fields.firstName.trim() === "") {
		errors.fields.firstName = [
			ctx.t({
				"code": "user.user_firstmameRequired",
				"msg": "First name is required",
			}),
		];
	}
	if (!fields.email || fields.email.trim() === "") {
		errors.fields.email = ["Email is required"];
	}
	if (fields.role == "") {
		errors.fields.role = ["Role is required"];
	}
	if (!fields.organization || fields.organization.trim() === "") {
		errors.fields.organization = ["Organisation is required"];
	}

	// is this user already existing and is he already in this country? Then it's an error
	const emailAndCountryIdExist = await doesUserCountryAccountExistByEmailAndCountryAccountsId(
		fields.email,
		countryAccountsId,
	);
	if (emailAndCountryIdExist) {
		errors.fields.email = ["A user with this email already exists"];
	}

	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	// is this user already in the system?
	const user = await getUserByEmail(fields.email);
	if (!user) {
		// console.debug("User is not in database - creating it and adding to the user country + sending invitation code");
		// The user does not exist. Steps:
		// 1. create new user
		// 2. create new user country account with it
		// 3. send invitation for new user with invitation link
		await dr.transaction(async (tx) => {
			// create user in Users table
			const newUser = await createUser(
				fields.email,
				tx,
				fields.firstName,
				fields.lastName,
				fields.organization,
			);
			// create user in user country table
			await createUserCountryAccounts(newUser.id, countryAccountsId, fields.role, false, tx);
			// update users table with invitation code and expiration date + send actual email
			await sendInviteForNewUser(
				ctx,
				newUser,
				siteName,
				fields.role,
				countryName,
				countryAccountType,
				tx,
			);
		});
	} else {
		// the user is already in the system, but not for this country - we need to add the user now
		if (user.emailVerified) {
			// console.debug("User is verified already - send normal invite for existing user");
			// the user already verified his email, all we need to do is send the mail after adding it to the country users
			await dr.transaction(async (tx) => {
				await createUserCountryAccounts(user.id, countryAccountsId, fields.role, false, tx);
				await sendInviteForExistingUser(
					ctx,
					user,
					siteName,
					fields.role,
					countryName,
					countryAccountType,
				);
			});
		} else {
			// the user did not verifiy its email yet - we want to extend the time allowed for verifying and
			// we want to send back the invitation with email verification email
			// console.debug("User is not verified yet - extend invite (no matter if it is expired or not) and send new mail with invite code");
			// console.debug("(before) current user has invite code and deadline", user.inviteCode, user.inviteExpiresAt);
			/// TODO
			await dr.transaction(async (tx) => {
				// 1. add user to country database
				// create user in user country table
				await createUserCountryAccounts(user.id, countryAccountsId, fields.role, false, tx);
				// 2. extend timeline of current invitation code
				// 3. send the invite email
				await sendInviteForNewUser(
					ctx,
					user,
					siteName,
					fields.role,
					countryName,
					countryAccountType,
					tx,
				);
				// console.debug("(after) current user has invite code and deadline", user.inviteCode, user.inviteExpiresAt );
			});
		}
	}

	return { ok: true };
}

export async function sendInviteForNewUser(
	ctx: BackendContext,
	user: SelectUser,
	siteName: string,
	role: string,
	countryName: string,
	countryAccountType: string,
	tx?: Tx,
) {
	// console.debug("current invite code = ", user.inviteCode);
	// we want to keep same invite code if it already is there
	const EXPIRATION_DAYS = 7;
	const inviteCode = user.inviteCode?.trim() ? user.inviteCode : randomBytes(32).toString("hex");
	const expirationTime = addHours(new Date(), EXPIRATION_DAYS * 24);

	const db = tx || dr;
	await db
		.update(userTable)
		.set({
			inviteSentAt: new Date(),
			inviteCode: inviteCode,
			inviteExpiresAt: expirationTime,
		})
		.where(eq(userTable.id, user.id));

	const inviteURL = ctx.fullUrl("/user/accept-invite-welcome?inviteCode=" + inviteCode);
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
export async function sendInviteForNewCountryAccountAdminUser(
	ctx: BackendContext,
	user: SelectUser,
	siteName: string,
	role: string,
	countryName: string,
	countryAccountType: string,
	inviteCode: string,
) {
	const inviteURL = ctx.fullUrl("/user/accept-invite-welcome?inviteCode=" + inviteCode);
	const subject = ctx.t(
		{
			code: "user_invite.new_email_subject",
			msg: "Invitation to join DELTA Resilience {siteName}",
		},
		{ siteName: siteName },
	);

	const html = ctx.t(
		{
			code: "user_invite.admin_email_html",
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
			code: "user_invite.admin_email_text",
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

export async function sendInviteForExistingCountryAccountAdminUser(
	ctx: BackendContext,
	user: SelectUser,
	siteName: string,
	role: string,
	countryName: string,
	countryAccountType: string,
) {
	const rootUrl = ctx.rootUrl();
	const subject = ctx.t(
		{
			code: "user_invite.new_email_subject",
			msg: "Invitation to join DELTA Resilience {siteName}",
		},
		{ siteName: siteName },
	);

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

type ValidateInviteCodeResult =
	| { ok: true; userId: string; email: string }
	| { ok: false; error: string };

export async function validateInviteCode(code: string): Promise<ValidateInviteCodeResult> {
	if (!code) {
		return { ok: false, error: "Invite code is required" };
	}

	const res = await dr.select().from(userTable).where(eq(userTable.inviteCode, code));

	if (!res.length) {
		return { ok: false, error: "Invalid invite code" };
	}

	const user = res[0];
	const now = new Date();

	if (user.inviteExpiresAt < now) {
		return { ok: false, error: "Invite code has expired" };
	}

	return {
		ok: true,
		userId: user.id,
		email: user.email,
	};
}

type AcceptInviteResult =
	| { ok: true; userId: string }
	| { ok: false; errors: Errors<AcceptInviteFields> };

interface AcceptInviteFields {
	firstName: string;
	lastName: string;
	password: string;
	passwordRepeat: string;
}

export function AcceptInviteFieldsFromMap(data: { [key: string]: string }): AcceptInviteFields {
	const fields: (keyof AcceptInviteFields)[] = [
		"firstName",
		"lastName",
		"password",
		"passwordRepeat",
	];
	return Object.fromEntries(
		fields.map((field) => [field, data[field] || ""]),
	) as unknown as AcceptInviteFields;
}

export async function acceptInvite(
	ctx: BackendContext,
	inviteCode: string,
	fields: AcceptInviteFields,
	siteName: string,
): Promise<AcceptInviteResult> {
	let errors: Errors<AcceptInviteFields> = {};
	errors.form = [];
	errors.fields = {};

	const codeRes = await validateInviteCode(inviteCode);
	if (!codeRes.ok) {
		errors.form = [codeRes.error];
		return { ok: false, errors };
	}

	const userId = codeRes.userId;

	validateName(fields, errors);
	validatePassword(fields, errors);

	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	let user: SelectUser;

	const res = await dr
		.update(userTable)
		.set({
			inviteCode: "",
			password: passwordHash(fields.password),
			firstName: fields.firstName,
			lastName: fields.lastName,
			emailVerified: true,
		})
		.where(eq(userTable.id, userId))
		.returning();

	if (res.length === 0) {
		errors.form = ["Application Error. User not found"];
		return { ok: false, errors };
	}

	user = res[0];

	const accessAccountURL = ctx.fullUrl("/user/settings/");
	const subject = ctx.t(
		{
			code: "user_invite.welcome_email_subject",
			msg: "Welcome to DELTA Resilience {siteName}",
		},
		{ siteName: siteName },
	); //

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
			firstName: user.firstName,
			lastName: user.lastName,
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
			firstName: user.firstName,
			lastName: user.lastName,
			siteName: siteName,
			accessAccountURL: accessAccountURL,
		},
	);

	await sendEmail(user.email, subject, text, html);

	return { ok: true, userId: user.id };
}
