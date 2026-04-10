import type { ResetPasswordResult } from "~/modules/account-security/domain/entities/account-security";
import type { AccountSecurityRepositoryPort } from "~/modules/account-security/domain/repositories/account-security-repository";

export class ResetPasswordUseCase {
	constructor(private readonly repository: AccountSecurityRepositoryPort) {}

	execute(
		email: string,
		token: string,
		newPassword: string,
		confirmPassword: string,
	): Promise<ResetPasswordResult> {
		return this.repository.resetPassword(
			email,
			token,
			newPassword,
			confirmPassword,
		);
	}
}
