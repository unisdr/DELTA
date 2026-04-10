import type { ChangePasswordFields } from "~/backend.server/models/user/password";
import type {
	ChangePasswordResult,
	CompleteInviteSignupInput,
	CompleteInviteSignupResult,
	ResetPasswordResult,
	ValidateInviteResult,
} from "~/modules/account-security/domain/entities/account-security";

export interface AccountSecurityRepositoryPort {
	requestPasswordReset(email: string): Promise<void>;
	resetPassword(
		email: string,
		token: string,
		newPassword: string,
		confirmPassword: string,
	): Promise<ResetPasswordResult>;
	changePassword(
		userId: string,
		fields: ChangePasswordFields,
	): Promise<ChangePasswordResult>;
	validateInviteCode(code: string): Promise<ValidateInviteResult>;
	completeInviteSignup(
		input: CompleteInviteSignupInput,
	): Promise<CompleteInviteSignupResult>;
}
