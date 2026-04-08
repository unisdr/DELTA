import { CloneCountryAccountUseCase } from "~/modules/country-account/application/use-cases/clone-country-account";
import { CreateCountryAccountUseCase } from "~/modules/country-account/application/use-cases/create-country-account";
import { DeleteCountryAccountUseCase } from "~/modules/country-account/application/use-cases/delete-country-account";
import { ResendCountryAccountInvitationUseCase } from "~/modules/country-account/application/use-cases/resend-country-account-invitation";
import { UpdateCountryAccountStatusUseCase } from "~/modules/country-account/application/use-cases/update-country-account-status";
import { getCountryAccountDb } from "~/modules/country-account/infrastructure/db/client.server";
import { DrizzleCountryAccountRepository } from "~/modules/country-account/infrastructure/repositories/drizzle-country-account-repository.server";

function buildCountryAccountRepository() {
	return new DrizzleCountryAccountRepository(getCountryAccountDb());
}

export function makeCreateCountryAccountUseCase(): CreateCountryAccountUseCase {
	return new CreateCountryAccountUseCase(buildCountryAccountRepository());
}

export function makeUpdateCountryAccountStatusUseCase(): UpdateCountryAccountStatusUseCase {
	return new UpdateCountryAccountStatusUseCase(buildCountryAccountRepository());
}

export function makeResendCountryAccountInvitationUseCase(): ResendCountryAccountInvitationUseCase {
	return new ResendCountryAccountInvitationUseCase(
		buildCountryAccountRepository(),
	);
}

export function makeCloneCountryAccountUseCase(): CloneCountryAccountUseCase {
	return new CloneCountryAccountUseCase(buildCountryAccountRepository());
}

export function makeDeleteCountryAccountUseCase(): DeleteCountryAccountUseCase {
	return new DeleteCountryAccountUseCase(buildCountryAccountRepository());
}
