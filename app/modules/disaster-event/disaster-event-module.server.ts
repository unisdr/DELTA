import { CreateDisasterEventUseCase } from "~/modules/disaster-event/application/use-cases/create-disaster-event";
import { DeleteDisasterEventUseCase } from "~/modules/disaster-event/application/use-cases/delete-disaster-event";
import { GetDisasterEventByIdUseCase } from "~/modules/disaster-event/application/use-cases/get-disaster-event-by-id";
import { ListDisasterEventsUseCase } from "~/modules/disaster-event/application/use-cases/list-disaster-events";
import { UpdateDisasterEventUseCase } from "~/modules/disaster-event/application/use-cases/update-disaster-event";
import type { DisasterEventRepositoryPort } from "~/modules/disaster-event/domain/repositories/disaster-event-repository";
import { getDisasterEventDb } from "~/modules/disaster-event/infrastructure/db/client.server";
import { DrizzleDisasterEventRepository } from "~/modules/disaster-event/infrastructure/repositories/drizzle-disaster-event-repository.server";

export function makeDisasterEventRepository(): DisasterEventRepositoryPort {
	return new DrizzleDisasterEventRepository(getDisasterEventDb());
}

export function makeListDisasterEventsUseCase(
	repository: DisasterEventRepositoryPort = makeDisasterEventRepository(),
): ListDisasterEventsUseCase {
	return new ListDisasterEventsUseCase(repository);
}

export function makeGetDisasterEventByIdUseCase(
	repository: DisasterEventRepositoryPort = makeDisasterEventRepository(),
): GetDisasterEventByIdUseCase {
	return new GetDisasterEventByIdUseCase(repository);
}

export function makeCreateDisasterEventUseCase(
	repository: DisasterEventRepositoryPort = makeDisasterEventRepository(),
): CreateDisasterEventUseCase {
	return new CreateDisasterEventUseCase(repository);
}

export function makeUpdateDisasterEventUseCase(
	repository: DisasterEventRepositoryPort = makeDisasterEventRepository(),
): UpdateDisasterEventUseCase {
	return new UpdateDisasterEventUseCase(repository);
}

export function makeDeleteDisasterEventUseCase(
	repository: DisasterEventRepositoryPort = makeDisasterEventRepository(),
): DeleteDisasterEventUseCase {
	return new DeleteDisasterEventUseCase(repository);
}
