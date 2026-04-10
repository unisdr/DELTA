import {
	sendForgotPasswordEmail,
	sendWelcomeRegistrationEmail,
} from "~/utils/emailUtil";
import { UserRepository } from "~/db/queries/UserRepository";
import { passwordHash } from "~/utils/passwordUtil";
import { randomBytes } from "crypto";

import {
	changePassword,
	resetPassword,
	resetPasswordSilentIfNotFound,
} from "~/backend.server/models/user/password";
import { validateInviteCode } from "~/backend.server/models/user/invite";

import type {
	ChangePasswordResult,
	CompleteInviteSignupInput,
	CompleteInviteSignupErrors,
	CompleteInviteSignupResult,
	ResetPasswordResult,
	ValidateInviteResult,
} from "~/modules/account-security/domain/entities/account-security";
import type { AccountSecurityRepositoryPort } from "~/modules/account-security/domain/repositories/account-security-repository";

export class LegacyAccountSecurityRepository implements AccountSecurityRepositoryPort {
	async requestPasswordReset(email: string): Promise<void> {
		const resetToken = randomBytes(32).toString("hex");
		const userExists = await resetPasswordSilentIfNotFound(email, resetToken);
		if (userExists) {
			await sendForgotPasswordEmail(email, resetToken);
		}
	}

	async resetPassword(
		email: string,
		token: string,
		newPassword: string,
		confirmPassword: string,
	): Promise<ResetPasswordResult> {
		return resetPassword(email, token, newPassword, confirmPassword);
	}

	async changePassword(
		userId: string,
		fields: Parameters<typeof changePassword>[1],
	): Promise<ChangePasswordResult> {
		return changePassword(userId, fields);
	}

	async validateInviteCode(code: string): Promise<ValidateInviteResult> {
		return validateInviteCode(code);
	}

	async completeInviteSignup(
		input: CompleteInviteSignupInput,
	): Promise<CompleteInviteSignupResult> {
		const errors: CompleteInviteSignupErrors = {};

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!input.email) {
			errors.email = "Email is required.";
		} else if (!emailRegex.test(input.email)) {
			errors.email = "Invalid email address.";
		}

		if (!input.firstName) {
			errors.firstName = "First name is required.";
		} else if (input.firstName.length < 3) {
			errors.firstName = "First name must be at least 3 characters.";
		}

		if (!input.lastName) {
			errors.lastName = "Last name is required.";
		} else if (input.lastName.length < 3) {
			errors.lastName = "Last name must be at least 3 characters.";
		}

		if (input.password.length < 12) {
			errors.password = "Password must be at least 12 characters.";
		}

		const hasUpper = /[A-Z]/.test(input.password);
		const hasLower = /[a-z]/.test(input.password);
		const hasNumber = /[0-9]/.test(input.password);
		const hasSpecial = /[^A-Za-z0-9]/.test(input.password);
		const conditionsCount =
			Number(hasUpper) +
			Number(hasLower) +
			Number(hasNumber) +
			Number(hasSpecial);

		if (conditionsCount < 2) {
			errors.password =
				"Password must include at least two of the following: uppercase, lowercase, number, special character.";
		}

		if (input.password === input.email) {
			errors.password = "Password cannot be the same as the username.";
		}

		if (input.password !== input.passwordRepeat) {
			errors.passwordRepeat = "Passwords do not match.";
		}

		const user = await UserRepository.getByEmail(input.email);
		if (!user) {
			errors.email = "No user exist with this email";
		}

		if (Object.keys(errors).length > 0) {
			return { ok: false, errors };
		}

		if (user) {
			await UserRepository.updateById(user.id, {
				inviteCode: "",
				password: passwordHash(input.password),
				firstName: input.firstName,
				lastName: input.lastName,
				emailVerified: true,
			});

			await sendWelcomeRegistrationEmail(
				input.email,
				input.firstName,
				input.lastName,
			);
		}

		return { ok: true };
	}
}
