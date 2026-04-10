import { ChangeOwnPasswordUseCase } from "~/modules/account-security/application/use-cases/change-own-password";
import { CompleteInviteSignupUseCase } from "~/modules/account-security/application/use-cases/complete-invite-signup";
import { RequestPasswordResetUseCase } from "~/modules/account-security/application/use-cases/request-password-reset";
import { ResetPasswordUseCase } from "~/modules/account-security/application/use-cases/reset-password";
import { ValidateInviteUseCase } from "~/modules/account-security/application/use-cases/validate-invite";
import { LegacyAccountSecurityRepository } from "~/modules/account-security/infrastructure/repositories/legacy-account-security-repository.server";

function buildAccountSecurityRepository() {
	return new LegacyAccountSecurityRepository();
}

export function makeRequestPasswordResetUseCase(): RequestPasswordResetUseCase {
	return new RequestPasswordResetUseCase(buildAccountSecurityRepository());
}

export function makeResetPasswordUseCase(): ResetPasswordUseCase {
	return new ResetPasswordUseCase(buildAccountSecurityRepository());
}

export function makeChangeOwnPasswordUseCase(): ChangeOwnPasswordUseCase {
	return new ChangeOwnPasswordUseCase(buildAccountSecurityRepository());
}

export function makeValidateInviteUseCase(): ValidateInviteUseCase {
	return new ValidateInviteUseCase(buildAccountSecurityRepository());
}

export function makeCompleteInviteSignupUseCase(): CompleteInviteSignupUseCase {
	return new CompleteInviteSignupUseCase(buildAccountSecurityRepository());
}
