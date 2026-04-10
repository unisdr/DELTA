import type { ChangePasswordFields } from "~/backend.server/models/user/password";
import type { ChangePasswordResult } from "~/modules/account-security/domain/entities/account-security";
import type { AccountSecurityRepositoryPort } from "~/modules/account-security/domain/repositories/account-security-repository";

export class ChangeOwnPasswordUseCase {
	constructor(private readonly repository: AccountSecurityRepositoryPort) {}

	execute(
		userId: string,
		fields: ChangePasswordFields,
	): Promise<ChangePasswordResult> {
		return this.repository.changePassword(userId, fields);
	}
}
