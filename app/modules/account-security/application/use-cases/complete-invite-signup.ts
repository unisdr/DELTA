import type {
	CompleteInviteSignupInput,
	CompleteInviteSignupResult,
} from "~/modules/account-security/domain/entities/account-security";
import type { AccountSecurityRepositoryPort } from "~/modules/account-security/domain/repositories/account-security-repository";

export class CompleteInviteSignupUseCase {
	constructor(private readonly repository: AccountSecurityRepositoryPort) {}

	execute(
		input: CompleteInviteSignupInput,
	): Promise<CompleteInviteSignupResult> {
		return this.repository.completeInviteSignup(input);
	}
}
