import type { ValidateInviteResult } from "~/modules/account-security/domain/entities/account-security";
import type { AccountSecurityRepositoryPort } from "~/modules/account-security/domain/repositories/account-security-repository";

export class ValidateInviteUseCase {
	constructor(private readonly repository: AccountSecurityRepositoryPort) {}

	execute(code: string): Promise<ValidateInviteResult> {
		return this.repository.validateInviteCode(code);
	}
}
