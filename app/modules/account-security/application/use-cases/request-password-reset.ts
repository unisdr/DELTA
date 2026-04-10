import type { AccountSecurityRepositoryPort } from "~/modules/account-security/domain/repositories/account-security-repository";

export class RequestPasswordResetUseCase {
	constructor(private readonly repository: AccountSecurityRepositoryPort) {}

	execute(email: string): Promise<void> {
		return this.repository.requestPasswordReset(email);
	}
}
