import { GetInstanceOptionsUseCase } from "~/modules/select-instance/application/use-cases/get-instance-options";
import { SelectInstanceUseCase } from "~/modules/select-instance/application/use-cases/select-instance";
import { getSelectInstanceDb } from "~/modules/select-instance/infrastructure/db/client.server";
import { DrizzleSelectInstanceRepository } from "~/modules/select-instance/infrastructure/repositories/drizzle-select-instance-repository.server";

function buildSelectInstanceRepository() {
	return new DrizzleSelectInstanceRepository(getSelectInstanceDb());
}

export function makeGetInstanceOptionsUseCase(): GetInstanceOptionsUseCase {
	return new GetInstanceOptionsUseCase(buildSelectInstanceRepository());
}

export function makeSelectInstanceUseCase(): SelectInstanceUseCase {
	return new SelectInstanceUseCase();
}
