import { InferSelectModel } from "drizzle-orm";

import { userTable } from "~/drizzle/schema";

import { Errors, hasErrors } from "~/frontend/form";

import { sendEmail } from "~/utils/email";
import { addHours } from "~/utils/time";
import { getUserById, updateUserById } from "~/db/queries/user";
import { BackendContext } from "~/backend.server/context";

function generateVerificationCode(digits: number): string {
	const min = Math.pow(10, digits - 1);
	const max = Math.pow(10, digits) - 1;
	return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

const digitsInVerificationCode = 6;

export async function sendEmailVerification(
	ctx: BackendContext,
	user: InferSelectModel<typeof userTable>,
) {
	const verificationCode = generateVerificationCode(digitsInVerificationCode);
	const expirationTime = addHours(new Date(), 24);

	updateUserById(user.id, {
		emailVerificationSentAt: new Date(),
		emailVerificationCode: verificationCode,
		emailVerificationExpiresAt: expirationTime,
	});

	const subject = ctx.t({
		code: "email.verify_account.subject",
		msg: "Verify your account",
	});

	const html = ctx.t(
		{
			code: "email.verify_account.html_body",
			desc: "HTML version of the account verification email.",
			msg: [
				"<p>To continue setting up your DELTA Resilience account, please verify that this is your email address.</p>",
				"<br/><br/>",
				"<p>Please use the following code to activate and finalise the setup of your account. The code will expire in 30 minutes:</p>",
				"<br/><strong>{verificationCode}</strong>",
			],
		},
		{
			verificationCode: verificationCode,
		},
	);

	const text = ctx.t(
		{
			code: "email.verify_account.text_body",
			desc: "Text version of the account verification email.",
			msg: [
				"To continue setting up your DELTA Resilience account, please verify that this is your email address.",
				"Please use the following code to activate and finalise the setup of your account. The code will expire in 30 minutes:",
				"{verificationCode}",
			],
		},
		{
			verificationCode: verificationCode,
		},
	);

	await sendEmail(user.email, subject, text, html);
}

type VerifyEmailResult = { ok: true } | { ok: false; errors: Errors<VerifyEmailFields> };

interface VerifyEmailFields {
	code: string;
}

export async function verifyEmail(userId: string, code: string): Promise<VerifyEmailResult> {
	let errors: Errors<VerifyEmailFields> = {};
	errors.form = [];
	errors.fields = {};
	if (!code) {
		errors.fields.code = ["Verification code is required"];
	}
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}
	const user = await getUserById(userId);

	if (!user) {
		errors.form = ["Application Error. User not found"];
		return { ok: false, errors };
	}

	if (user.emailVerificationCode !== code) {
		errors.fields.code = ["Invalid verification code"];
		return { ok: false, errors };
	}

	if (user.emailVerificationExpiresAt < new Date()) {
		errors.fields.code = ["Verification code has expired"];
		return { ok: false, errors };
	}

	updateUserById(userId, {
		emailVerified: true,
		emailVerificationCode: "",
		emailVerificationExpiresAt: new Date("1970-01-01T00:00:00.000Z"),
	});

	return { ok: true };
}
